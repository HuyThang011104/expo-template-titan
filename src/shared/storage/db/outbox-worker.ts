/**
 * Outbox drain worker. Features supply a `sender` that knows their endpoint;
 * this file owns ordering, retry accounting, and online gating — nothing else.
 *
 * Wiring (call once at boot, after login is NOT required — pending jobs carry
 * no auth by themselves; the sender attaches it like any API call):
 *
 *   const stop = startOutboxSync(async ({ kind, payload }) => {
 *     if (kind === "chat.send") return sendChatMessage(JSON.parse(payload));
 *     logger.warn("[outbox] unknown kind, dropping", { kind });
 *   });
 *
 * - Sequential sends preserve per-queue order (chat messages must not reorder).
 * - A sender throw means "not sent" (retry later); sender must throw on
 *   validation errors too, or the job is wrongly marked sent.
 * - Unknown kinds: sender decides — dropping inside the sender after logging
 *   keeps one bad kind from head-of-line blocking the queue forever.
 */

import { onlineManager } from "@tanstack/react-query";

import { logger } from "../../observability/logger";
import {
  listPendingJobs,
  markJobAttemptFailed,
  markJobSent,
  type OutboxJob,
} from "./outbox";

export type OutboxSender = (job: Pick<OutboxJob, "id" | "kind" | "payload">) => Promise<void>;

export type DrainResult = {
  sent: number;
  retried: number;
  dead: number;
};

export type DrainOptions = {
  batchSize?: number;
};

let draining = false;

/**
 * One sequential pass over pending jobs. Re-entrant calls collapse into
 * the running pass. Never throws — DB failures log and return partial counts.
 */
export async function drainOutbox(
  sender: OutboxSender,
  options: DrainOptions = {},
): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, retried: 0, dead: 0 };
  if (draining) return result;
  draining = true;
  try {
    let jobs: OutboxJob[];
    try {
      jobs = await listPendingJobs(options.batchSize ?? 20);
    } catch {
      logger.warn("[outbox] list pending failed");
      return result;
    }
    for (const job of jobs) {
      try {
        await sender({ id: job.id, kind: job.kind, payload: job.payload });
      } catch {
        try {
          const status = await markJobAttemptFailed(job.id);
          if (status === "dead") {
            result.dead += 1;
            logger.warn("[outbox] job dead-lettered", { kind: job.kind });
          } else {
            result.retried += 1;
          }
        } catch {
          logger.warn("[outbox] mark failed errored", { kind: job.kind });
        }
        continue;
      }
      try {
        await markJobSent(job.id);
        result.sent += 1;
      } catch {
        logger.warn("[outbox] mark sent failed", { kind: job.kind });
      }
    }
    return result;
  } finally {
    draining = false;
  }
}

/**
 * Drain now when online + on every offline->online transition.
 * Returns a stop function. Call once (app boot); the sender lives forever.
 */
export function startOutboxSync(sender: OutboxSender): () => void {
  if (onlineManager.isOnline()) {
    void drainOutbox(sender);
  }
  const unsubscribe = onlineManager.subscribe((online) => {
    if (online) {
      void drainOutbox(sender);
    }
  });
  return () => {
    unsubscribe();
  };
}
