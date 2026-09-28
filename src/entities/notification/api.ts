/**
 * Notification remote API (F5).
 *
 * - Calls `client`, validates via `parseNotification`, returns `Notification | null`.
 * - No caching here; only `cache.ts` writes the cache.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import { parseNotification } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export type NotificationsPageWire = {
  items: unknown[];
  nextCursor: string | null;
};

/**
 * GET `/notifications?cursor=` → raw wire page.
 * `null` only when the page shape itself is invalid; individual bad
 * items are skipped by the caller (same rule as the home feed).
 */
export async function fetchNotificationsPageWire(
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<NotificationsPageWire | null> {
  const data: unknown = await client.get<unknown>(endpoints.notifications(cursor), {
    fetchImpl: opts.fetchImpl,
  });
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[notification] invalid page shape", { cursor });
    return null;
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  return {
    items: raw.items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

/** GET `/notifications/:id` → `Notification | null`. */
export async function fetchNotification(
  id: string,
  opts: FetchOptions = {},
): Promise<ReturnType<typeof parseNotification>> {
  const data = await client.get<unknown>(`/notifications/${encodeURIComponent(id)}`, {
    fetchImpl: opts.fetchImpl,
  });
  return parseNotification(data);
}

/**
 * POST `/notifications/:id/read` → `Notification | null`.
 * Throws on transport/HTTP errors (callers decide rollback);
 * `null` only means the server payload failed schema validation.
 */
export async function markNotificationReadRemote(
  id: string,
  opts: FetchOptions = {},
): Promise<ReturnType<typeof parseNotification>> {
  const data = await client.post<unknown>(
    endpoints.markNotificationRead(id),
    {},
    { fetchImpl: opts.fetchImpl },
  );
  return parseNotification(data);
}
