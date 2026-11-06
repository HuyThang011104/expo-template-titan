/**
 * Saved remote API (G1.4).
 *
 * - Lists return `{ items, nextCursor } | null` (null = bad page shape;
 *   bad items are skipped). Save/unsave return `boolean` (`{ ok: true }`).
 * - Throws on transport/HTTP errors; no caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { SavedPostWireItem } from "./model";
import { parseSavedPostWireItem } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export type SavedRemotePage = {
  items: SavedPostWireItem[];
  nextCursor: string | null;
};

/** GET `/saved?cursor=` → parsed wire page or `null`. */
export async function fetchSavedPostsRemote(
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<SavedRemotePage | null> {
  const data: unknown = await client.get<unknown>(endpoints.savedPosts(cursor), {
    fetchImpl: opts.fetchImpl,
  });
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[saved] invalid page shape", { cursor });
    return null;
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  const items: SavedPostWireItem[] = [];
  for (const item of raw.items) {
    const parsed = parseSavedPostWireItem(item);
    if (parsed) items.push(parsed);
  }
  return {
    items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

function parseOk(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === "object" &&
    (data as Record<string, unknown>)["ok"] === true
  );
}

/** POST `/saved/:id` → `true` on `{ ok: true }`. */
export async function savePostRemote(id: string, opts: FetchOptions = {}): Promise<boolean> {
  const data = await client.post<unknown>(endpoints.savePost(id), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return parseOk(data);
}

/** DELETE `/saved/:id` → `true` on `{ ok: true }`. */
export async function unsavePostRemote(id: string, opts: FetchOptions = {}): Promise<boolean> {
  const data = await client.del<unknown>(endpoints.unsavePost(id), {
    fetchImpl: opts.fetchImpl,
  });
  return parseOk(data);
}
