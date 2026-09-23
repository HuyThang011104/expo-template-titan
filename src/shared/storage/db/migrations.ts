/**
 * Ordered schema migrations. Versions start at 1 and never repeat;
 * `client.ts` tracks progress in `PRAGMA user_version`.
 */

export type Migration = {
  version: number;
  sql: string;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS drafts (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  },
  // NOTE: released migrations are append-only — never edit version 1 above.
  // To change a shipped table, add version 3 with ALTER statements.
  {
    version: 2,
    sql: `CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_status_created
      ON outbox (status, created_at);`,
  },
];
