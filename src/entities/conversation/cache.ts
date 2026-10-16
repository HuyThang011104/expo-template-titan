/**
 * Conversation canonical cache (F4).
 *
 * - Only file allowed to `setQueryData(queryKeys.conversation...)` or
 *   `queryKeys.conversationMessages...`. Features call these helpers.
 * - Lists hold ids only; `hydrateConversation` writes the canonical entry.
 * - `sendMessage` is read -> optimistic append -> server wins -> rollback.
 * - `upsertIncomingMessage` handles the socket stub (`message.added`).
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { markConversationReadRemote, sendMessageRemote } from "./api";
import type { Conversation, Message, MessageStatus, Presence } from "./model";
import { TYPING_TTL_MS } from "./model";

export type ChatSendInput = {
  body: string;
  imageUrl?: string | null;
};

export type ConversationsPageShape = {
  ids: string[];
  nextCursor: string | null;
};

export type MessagesPageShape = {
  ids: string[];
  nextCursor: string | null;
};

/** Overwrite the canonical conversation. */
export function setConversation(qc: QueryClient, conversation: Conversation): void {
  qc.setQueryData(queryKeys.conversation(conversation.id), conversation);
}

/** Read the canonical conversation (no fetch). */
export function getConversationData(qc: QueryClient, id: string): Conversation | undefined {
  return qc.getQueryData<Conversation>(queryKeys.conversation(id));
}

/** Overwrite the canonical message. */
export function setMessage(qc: QueryClient, message: Message): void {
  qc.setQueryData(messageKey(message.conversationId, message.id), message);
}

function messageKey(conversationId: string, messageId: string): readonly string[] {
  return [...queryKeys.conversationMessages(conversationId), messageId] as const;
}

/** Read the canonical message (no fetch). */
export function getMessageData(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
): Message | undefined {
  return qc.getQueryData<Message>(messageKey(conversationId, messageId));
}

/**
 * Hydrate one wire conversation; returns `{ conversationId }`.
 */
export function hydrateConversation(
  qc: QueryClient,
  conversation: Conversation,
): { conversationId: string } {
  setConversation(qc, conversation);
  return { conversationId: conversation.id };
}

/**
 * Hydrate one wire message: canonical entry + append to the message ids.
 * Creates the first page when the list was never fetched so a live socket
 * message shows immediately; skips append when the id exists on any page.
 * Returns `{ messageId }`.
 */
export function hydrateMessage(
  qc: QueryClient,
  message: Message,
): { messageId: string } {
  setMessage(qc, message);
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(message.conversationId),
    (old) => {
      if (!old) {
        return { pages: [{ ids: [message.id], nextCursor: null }], pageParams: [null] };
      }
      if (old.pages.some((page) => page.ids.includes(message.id))) return old;
      const [first, ...rest] = old.pages;
      if (!first) return old;
      return {
        ...old,
        pages: [{ ...first, ids: [...first.ids, message.id] }, ...rest],
      };
    },
  );
  return { messageId: message.id };
}

/**
 * Preview for the conversation row. G3.1: image-only shows `[Ảnh]`.
 */
export function previewForMessage(body: string, imageUrl: string | null): string {
  const trimmed = body.trim();
  if (trimmed.length > 0) return trimmed.slice(0, 120);
  if (imageUrl) return "[Ảnh]";
  return "";
}

/**
 * Socket stub entrypoint: an incoming `message.added` payload hydrates the
 * canonical message and bumps the conversation preview. Invalid payloads
 * only warn (never crash the subscriber). G3.1: dedup by id (no double
 * append), own echoes never bump unread.
 */
export function upsertIncomingMessage(qc: QueryClient, message: Message): void {
  const known = getMessageData(qc, message.conversationId, message.id);
  if (known) return;
  const incoming: Message = {
    ...message,
    status: message.status === "sending" ? "sent" : message.status,
  };
  hydrateMessage(qc, incoming);
  const prev = getConversationData(qc, message.conversationId);
  if (prev) {
    setConversation(qc, {
      ...prev,
      lastMessagePreview: previewForMessage(incoming.body, incoming.imageUrl),
      lastMessageAt: incoming.createdAt,
      // Own echo: preview moves, badge stays. Peer message: badge +1.
      unreadCount: incoming.senderId === "me" ? prev.unreadCount : prev.unreadCount + 1,
    });
  }
}

/** Mark a conversation read (preview stays, unread resets). */
export function markConversationRead(qc: QueryClient, id: string): void {
  const prev = getConversationData(qc, id);
  if (!prev || prev.unreadCount === 0) return;
  setConversation(qc, { ...prev, unreadCount: 0 });
}

/* ------------------------------------------------------------------ */
/* G3.2 presence + typing (one entry per user, TTL read as idle).       */
/* ------------------------------------------------------------------ */

/** Overwrite the canonical presence for one user. */
export function setPresence(qc: QueryClient, presence: Presence): void {
  qc.setQueryData(queryKeys.presence(presence.userId), presence);
}

/** Read the canonical presence (no fetch). */
export function getPresenceData(qc: QueryClient, userId: string): Presence | undefined {
  if (!userId) return undefined;
  return qc.getQueryData<Presence>(queryKeys.presence(userId));
}

/** Merge a `presence.updated` payload into the cache. */
export function upsertPresence(qc: QueryClient, presence: Presence): void {
  setPresence(qc, presence);
}

/**
 * G3.2: peer started typing in a conversation. Refreshes the TTL so the
 * indicator stays while keystrokes keep arriving and dies ~5s after the
 * last one. Switching conversations replaces the previous entry.
 */
export function upsertTypingStarted(
  qc: QueryClient,
  conversationId: string,
  userId: string,
  ttlMs: number = TYPING_TTL_MS,
  now: number = Date.now(),
): void {
  if (!conversationId || !userId) return;
  const prev = getPresenceData(qc, userId);
  setPresence(qc, {
    userId,
    online: prev?.online ?? true,
    lastSeenAt: prev?.lastSeenAt ?? null,
    typingInConversationId: conversationId,
    typingExpiresAt: new Date(now + ttlMs).toISOString(),
  });
}

/**
 * G3.2: peer stopped typing. Only clears when the stored conversation
 * matches, so a stale stop for an old thread never kills a new one.
 */
export function upsertTypingStopped(qc: QueryClient, conversationId: string, userId: string): void {
  if (!conversationId || !userId) return;
  const prev = getPresenceData(qc, userId);
  if (!prev || prev.typingInConversationId !== conversationId) return;
  setPresence(qc, {
    ...prev,
    typingInConversationId: null,
    typingExpiresAt: null,
  });
}

/** Drop expired typing entries (read path already treats them as idle). */
export function pruneExpiredTyping(
  qc: QueryClient,
  userId: string,
  now: number = Date.now(),
): void {
  const prev = getPresenceData(qc, userId);
  if (!prev || !prev.typingInConversationId || !prev.typingExpiresAt) return;
  if (Date.parse(prev.typingExpiresAt) > now) return;
  setPresence(qc, { ...prev, typingInConversationId: null, typingExpiresAt: null });
}

/**
 * G3.2: is `userId` currently typing in `conversationId`?
 * Missing/expired entries read as idle (never throw on bad dates).
 */
export function isTypingIn(
  presence: Presence | undefined,
  conversationId: string,
  now: number = Date.now(),
): boolean {
  if (!presence || !conversationId) return false;
  if (presence.typingInConversationId !== conversationId) return false;
  if (!presence.typingExpiresAt) return false;
  const expires = Date.parse(presence.typingExpiresAt);
  return Number.isFinite(expires) && expires > now;
}

/**
 * G3.2: opening a thread clears the badge + flips loaded messages to
 * `seen`, then best-effort syncs the read receipt (server failure never
 * rolls back local read state). Returns `{ flipped, synced }`.
 */
export async function markThreadRead(
  qc: QueryClient,
  conversationId: string,
  opts: { markReadRemote?: typeof markConversationReadRemote } = {},
): Promise<{ flipped: number; synced: boolean }> {
  markConversationRead(qc, conversationId);
  const flipped = markMessagesSeen(qc, conversationId);
  const remote = opts.markReadRemote ?? markConversationReadRemote;
  try {
    const synced = await remote(conversationId);
    return { flipped, synced };
  } catch {
    return { flipped, synced: false };
  }
}

/**
 * G3.1: mark every loaded message in a thread `seen` when the peer opens it.
 * `sending` temps stay `sending` until the server answers. Returns the count flipped.
 */
export function markMessagesSeen(qc: QueryClient, conversationId: string): number {
  const list = qc.getQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(conversationId),
  );
  const ids = (list?.pages ?? []).flatMap((page) => page.ids);
  let flipped = 0;
  for (const id of ids) {
    const current = getMessageData(qc, conversationId, id);
    if (!current || current.status === "seen" || current.status === "sending") continue;
    setMessage(qc, { ...current, status: "seen" satisfies MessageStatus });
    flipped += 1;
  }
  return flipped;
}

export type SendMessageRemoteFn = typeof sendMessageRemote;

export type SendMessageOptions = {
  sendRemote?: SendMessageRemoteFn;
};

/**
 * Send a message with optimistic append; all callers must use this.
 * Temp id `temp-<ts>` shows `sending` (Đang gửi), swaps to `sent` (Đã gửi)
 * on server win, rolls back (removed) when the server fails.
 * G3.1: accepts text, image, or both — at least one is required.
 */
export async function sendMessage(
  qc: QueryClient,
  conversationId: string,
  bodyOrInput: string | ChatSendInput,
  opts: SendMessageOptions = {},
): Promise<void> {
  const raw = typeof bodyOrInput === "string" ? { body: bodyOrInput, imageUrl: null } : bodyOrInput;
  const trimmed = raw.body.trim();
  const imageUrl = raw.imageUrl ?? null;
  if (!trimmed && !imageUrl) return;
  const temp: Message = {
    id: `temp-${Date.now().toString(36)}`,
    conversationId,
    senderId: "me",
    body: trimmed,
    imageUrl,
    status: "sending",
    createdAt: new Date().toISOString(),
  };
  setMessage(qc, temp);
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(conversationId),
    (old) => {
      if (!old) {
        return { pages: [{ ids: [temp.id], nextCursor: null }], pageParams: [null] };
      }
      const [first, ...rest] = old.pages;
      if (!first) return old;
      return {
        ...old,
        pages: [{ ...first, ids: [...first.ids, temp.id] }, ...rest],
      };
    },
  );

  const remote = opts.sendRemote ?? sendMessageRemote;
  try {
    const server = await remote(conversationId, { body: trimmed, imageUrl });
    if (server) {
      qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
        queryKeys.conversationMessages(conversationId),
        (old) => {
          if (!old) {
            return { pages: [{ ids: [server.id], nextCursor: null }], pageParams: [null] };
          }
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              ids: page.ids.map((id) => (id === temp.id ? server.id : id)),
            })),
          };
        },
      );
      qc.removeQueries({ queryKey: messageKey(conversationId, temp.id) });
      hydrateMessage(qc, { ...server, conversationId, status: "sent" });
      const prev = getConversationData(qc, conversationId);
      if (prev) {
        setConversation(qc, {
          ...prev,
          lastMessagePreview: previewForMessage(server.body, server.imageUrl),
          lastMessageAt: server.createdAt,
        });
      }
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(conversationId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          ids: page.ids.filter((id) => id !== temp.id),
        })),
      };
    },
  );
  qc.removeQueries({ queryKey: messageKey(conversationId, temp.id) });
  logger.warn("[conversation] send failed, rolled back", { conversationId });
}
