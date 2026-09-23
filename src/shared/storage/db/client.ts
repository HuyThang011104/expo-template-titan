/**
 * expo-sqlite singleton with `PRAGMA user_version` migrations.
 *
 * - Native only; web callers must use the `kv` fallback in `drafts.ts`.
 * - One database file (`titan.db`); migrations run once per version bump,
 *   each inside its own transaction (fail -> rollback -> retried next launch).
 * - Production PRAGMAs on every open: WAL (read/write concurrency),
 *   `foreign_keys` (sqlite leaves them OFF by default), `busy_timeout`
 *   (wait on locks instead of crashing).
 * - Corruption recovery: a malformed DB is deleted and rebuilt from
 *   migrations. Server is the source of truth; unsynced drafts are the
 *   only accepted loss (see `drafts.ts` + `outbox.ts`).
 */

import * as SQLite from "expo-sqlite";

import { logger } from "../../observability/logger";
import { MIGRATIONS } from "./migrations";

const DB_NAME = "titan.db";

let db: SQLite.SQLiteDatabase | null = null;
let migratedVersion = -1;

function assertNative(): void {
  if (process.env.EXPO_OS === "web") {
    throw new Error("[db] expo-sqlite is unavailable on web — use the kv fallback.");
  }
}

async function readUserVersion(database: SQLite.SQLiteDatabase): Promise<number> {
  const rows = await database.getAllAsync<{ user_version: number }>("PRAGMA user_version");
  return rows[0]?.user_version ?? 0;
}

async function configure(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
}

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  const current = await readUserVersion(database);
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );
  for (const migration of pending) {
    // One transaction per migration: partial application never persists.
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
  migratedVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
}

function isCorruption(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /malformed|corrupt|not a database|file is not a database/i.test(message);
}

async function openFresh(): Promise<SQLite.SQLiteDatabase> {
  const fresh = await SQLite.openDatabaseAsync(DB_NAME);
  await configure(fresh);
  await migrate(fresh);
  return fresh;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  assertNative();
  if (!db) {
    try {
      db = await openFresh();
    } catch (error) {
      if (!isCorruption(error)) throw error;
      // Unrecoverable file: drop it and rebuild from migrations.
      // Unsynced drafts/outbox jobs are lost — accepted by design.
      logger.warn("[db] database corrupt, rebuilding from migrations");
      db = null;
      try {
        await SQLite.deleteDatabaseAsync(DB_NAME);
      } catch {
        // Best effort; reopen recreates the file below.
      }
      db = await openFresh();
    }
  } else if (migratedVersion < 0) {
    await migrate(db);
  }
  return db;
}

/** Test-only teardown. Never call from product code. */
export async function closeDatabaseForTests(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  migratedVersion = -1;
}
