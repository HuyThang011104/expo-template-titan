/**
 * Offline mutation outbox. Features enqueue opaque jobs (chat sends, likes,
 * composer posts) instead of calling the API directly; the worker in
 * `outbox-worker.ts` drains them when online.
 *
 * - Sent jobs are DELETED (queue, not audit log). Failed jobs stay `pending`
 *   until `OUTBOX_MAX_ATTEMPTS`, then `dead` for inspection via `listDead()`.
 * - Single worker only — no claiming/locking; two concurrent drains would
 *   double-send. The worker runs sequentially for the same reason.
 * - Payloads are opaque JSON strings; the sender owns the schema per `kind`.
 *   Never put secrets here (sqlite is unencrypted) — tokens stay in `secure.ts`.
 */

import { getDatabase } from "./client";

export type OutboxStatus = "pending" | "sending" | "sent" | "dead";

export type OutboxJob = {
  id: string;
  kind: string;
  payload: string;
  status: Exclude<OutboxStatus, "sent">;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

export const OUTBOX_MAX_ATTEMPTS = 5;

const KIND_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function assertValidKind(kind: string): void {
  if (!KIND_PATTERN.test(kind)) {
    throw new Error(
      `[outbox] Invalid kind "${kind}". Use short namespaces like "chat.send".`,
    );
  }
}

function newId(): string {
  // Local queue key only — uniqueness, not security. No crypto dependency.
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

type OutboxRow = {
  id: string;
  kind: string;
  payload: string;
  status: string;
  attempts: number;
  created_at: number;
  updated_at: number;
};

function toJob(row: OutboxRow): OutboxJob {
  return {
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    status: row.status === "dead" ? "dead" : row.status === "sending" ? "sending" : "pending",
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Pure transition (exported for tests): attempt failed — retry or dead? */
export function statusAfterFailure(attempts: number): "pending" | "dead" {
  return attempts >= OUTBOX_MAX_ATTEMPTS ? "dead" : "pending";
}

/** Enqueue one job. Returns its id. Throws on invalid kind/empty payload. */
export async function enqueueOutboxJob(kind: string, payload: string): Promise<string> {
  assertValidKind(kind);
  if (payload.length === 0) {
    throw new Error("[outbox] Refusing to enqueue an empty payload.");
  }
  const id = newId();
  const now = Date.now();
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO outbox (id, kind, payload, status, attempts, created_at, updated_at) VALUES (?, ?, ?, 'pending', 0, ?, ?)",
    id,
    kind,
    payload,
    now,
    now,
  );
  return id;
}

/** Oldest pending jobs first, capped for one drain pass. */
export async function listPendingJobs(limit = 20): Promise<OutboxJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    "SELECT id, kind, payload, status, attempts, created_at, updated_at FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
    limit,
  );
  return rows.map(toJob);
}

/** Success path: remove the job from the queue. */
export async function markJobSent(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", id);
}

/** Failure path: bump attempts, park as `dead` past the cap. */
export async function markJobAttemptFailed(id: string): Promise<"pending" | "dead"> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ attempts: number }>(
    "SELECT attempts FROM outbox WHERE id = ? LIMIT 1",
    id,
  );
  const attempts = (rows[0]?.attempts ?? 0) + 1;
  const status = statusAfterFailure(attempts);
  await db.runAsync("UPDATE outbox SET status = ?, attempts = ?, updated_at = ? WHERE id = ?", status, attempts, Date.now(), id);
  return status;
}

/** Dead-letter inspection for support/debug screens. */
export async function listDeadJobs(limit = 50): Promise<OutboxJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    "SELECT id, kind, payload, status, attempts, created_at, updated_at FROM outbox WHERE status = 'dead' ORDER BY updated_at DESC LIMIT ?",
    limit,
  );
  return rows.map(toJob);
}

/** Drop dead letters (user-confirmed "discard unsent" flows). */
export async function clearDeadJobs(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM outbox WHERE status = 'dead'");
}
