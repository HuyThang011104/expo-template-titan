/**
 * Conversation remote API (F4).
 *
 * - Calls `client`, validates via `parseConversation` / `parseMessage`.
 * - No caching here; only `cache.ts` writes the cache.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import { parseConversation, parseMessage } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export type ConversationsPageWire = {
  items: unknown[];
  nextCursor: string | null;
};

export type MessagesPageWire = {
  items: unknown[];
  nextCursor: string | null;
};

function toPageWire(data: unknown, scope: string): ConversationsPageWire | null {
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[conversation] invalid page shape", { scope });
    return null;
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  return {
    items: raw.items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

/** GET `/conversations?cursor=` -> raw wire page. */
export async function fetchConversationsPageWire(
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<ConversationsPageWire | null> {
  const path = cursor
    ? `/conversations?cursor=${encodeURIComponent(cursor)}`
    : "/conversations";
  const data: unknown = await client.get<unknown>(path, { fetchImpl: opts.fetchImpl });
  return toPageWire(data, "conversations");
}

/** GET `/conversations/:id` -> `Conversation | null`. */
export async function fetchConversation(
  id: string,
  opts: FetchOptions = {},
): Promise<ReturnType<typeof parseConversation>> {
  const data = await client.get<unknown>(endpoints.conversation(id), {
    fetchImpl: opts.fetchImpl,
  });
  return parseConversation(data);
}

/** GET `/conversations/:id/messages?cursor=` -> raw wire page. */
export async function fetchMessagesPageWire(
  conversationId: string,
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<MessagesPageWire | null> {
  const data: unknown = await client.get<unknown>(
    endpoints.conversationMessages(conversationId, cursor),
    { fetchImpl: opts.fetchImpl },
  );
  return toPageWire(data, "messages");
}

/**
 * POST `/conversations/:id/messages` with `{ body, imageUrl }` -> `Message | null`.
 * Throws on transport/HTTP errors (callers decide rollback);
 * `null` only means the server payload failed schema validation.
 * G3.1: text-only, image-only, or both; at least one is required.
 */
export async function sendMessageRemote(
  conversationId: string,
  bodyOrInput: string | { body: string; imageUrl?: string | null },
  imageUrlOrOpts: string | null | FetchOptions = null,
  maybeOpts: FetchOptions = {},
): Promise<ReturnType<typeof parseMessage>> {
  const normalized =
    typeof bodyOrInput === "string"
      ? { body: bodyOrInput, imageUrl: typeof imageUrlOrOpts === "string" ? imageUrlOrOpts : null }
      : bodyOrInput;
  const opts: FetchOptions =
    typeof imageUrlOrOpts === "object" && imageUrlOrOpts !== null ? imageUrlOrOpts : maybeOpts;
  const payload = {
    body: normalized.body,
    ...(normalized.imageUrl ? { imageUrl: normalized.imageUrl } : {}),
  };
  const data = await client.post<unknown>(endpoints.conversationMessages(conversationId), payload, {
    fetchImpl: opts.fetchImpl,
  });
  return parseMessage(data);
}
