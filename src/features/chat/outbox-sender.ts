/**
 * Outbox sender for `chat.send` (G3.3).
 *
 * The worker in `shared/storage/db/outbox-worker` owns ordering, retry
 * accounting, and online gating; this file only knows the chat endpoint:
 *
 * - Parses the opaque payload (`{ conversationId, body, imageUrl,
 *   localImageUri, clientId }`); invalid payloads throw so the worker
 *   retries then dead-letters (never silently marked sent).
 * - Skips the POST when the `queued-<clientId>` entry is already gone
 *   (confirmed by an earlier pass) — the drain-once backstop, so a message
 *   goes exactly once and never duplicates.
 * - Refuses to send to blocked peers with a clear error (worker retries,
 *   then dead-letters; the `Queued` badge stays visible — never silent loss).
 * - Re-uploads `localImageUri` (queued offline before upload finished),
 *   then `POST /conversations/:id/messages`, then swaps queued -> sent via
 *   `confirmQueuedMessage` (single writer in `entities/conversation/cache`).
 * - Unknown kinds log + resolve so one bad kind never head-of-line blocks
 *   the queue (per the worker contract).
 */

import type { QueryClient } from "@tanstack/react-query";

import {
  canMessageTarget,
  type User,
} from "@/entities/user";
import {
  confirmQueuedMessage,
  getConversationData,
  getQueuedMessage,
  sendMessageRemote,
} from "@/entities/conversation";
import type { PickedMedia } from "@/shared/media/picker";
import { uploadMedia } from "@/shared/media/upload";
import { logger } from "@/shared/observability/logger";
import { queryClient, queryKeys } from "@/shared/query";

import { logChatSend } from "./analytics";

export const CHAT_OUTBOX_KIND = "chat.send";

export type ChatSendOutboxPayload = {
  conversationId: string;
  body: string;
  imageUrl: string | null;
  localImageUri: string | null;
  clientId: string;
};

export type ChatOutboxJob = {
  kind: string;
  payload: string;
};

export type ChatSenderOptions = {
  /** Injected for tests; production uses the global fetch with auth. */
  fetchImpl?: typeof fetch;
  /** Injected for tests; production uses the app singleton. */
  qc?: QueryClient;
  /** Injected for tests; production re-uploads via `uploadMedia`. */
  upload?: (asset: PickedMedia) => Promise<{ url: string; mediaId: string }>;
  /** Injected for tests; production POSTs via `sendMessageRemote`. */
  sendRemote?: typeof sendMessageRemote;
};

export function buildChatSendPayload(payload: ChatSendOutboxPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parses + validates the opaque job payload. Throws on anything invalid
 * (worker retries, then dead-letters past `OUTBOX_MAX_ATTEMPTS`).
 */
export function parseChatSendPayload(raw: string): ChatSendOutboxPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("[chat] Invalid chat.send payload: not JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("[chat] Invalid chat.send payload: not an object");
  }
  const candidate = parsed as Record<string, unknown>;
  const conversationId = candidate["conversationId"];
  const body = candidate["body"];
  const imageUrl = candidate["imageUrl"] ?? null;
  const localImageUri = candidate["localImageUri"] ?? null;
  const clientId = candidate["clientId"];
  const validBody = typeof body === "string" && body.trim().length > 0 && body.trim().length <= 2000;
  const validImage =
    (typeof imageUrl === "string" && imageUrl.length > 0) ||
    (typeof localImageUri === "string" && localImageUri.length > 0);
  if (typeof conversationId !== "string" || conversationId.length === 0) {
    throw new Error("[chat] Invalid chat.send payload: bad conversationId");
  }
  if (!validBody && !validImage) {
    throw new Error("[chat] Invalid chat.send payload: empty message");
  }
  if (typeof clientId !== "string" || clientId.length === 0) {
    throw new Error("[chat] Invalid chat.send payload: bad clientId");
  }
  if (imageUrl !== null && typeof imageUrl !== "string") {
    throw new Error("[chat] Invalid chat.send payload: bad imageUrl");
  }
  if (localImageUri !== null && typeof localImageUri !== "string") {
    throw new Error("[chat] Invalid chat.send payload: bad localImageUri");
  }
  return {
    conversationId,
    body: typeof body === "string" ? body.trim() : "",
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    localImageUri: typeof localImageUri === "string" ? localImageUri : null,
    clientId,
  };
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function guessMimeType(uri: string): string {
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "image/jpeg";
}

/**
 * Rebuilds an uploadable asset from a persisted uri. Dimensions are unknown
 * after a restart — the uploader only needs `uri` + `mimeType`.
 * Exported for the send mutation (same feature, no cross-feature import).
 */
export function pickedMediaFromUri(uri: string): PickedMedia {
  return { uri, width: 0, height: 0, kind: "image", mimeType: guessMimeType(uri) };
}

function toPickedMedia(uri: string): PickedMedia {
  return pickedMediaFromUri(uri);
}

/** G3.3: blocked peers never receive the message — loud error, no silent loss. */
export function assertNotBlocked(qc: QueryClient, conversationId: string): void {
  const peerId = getConversationData(qc, conversationId)?.participantIds[0];
  if (!peerId) return;
  const meId = qc.getQueryData<User>(queryKeys.me)?.id ?? "";
  if (!meId) return;
  if (!canMessageTarget(qc, peerId, meId)) {
    throw new Error("Bạn không thể nhắn tin cho người này.");
  }
}

/**
 * Sends one `chat.send` job: skip when already confirmed, else re-upload a
 * local image, POST the message, swap queued -> sent. Throws when not sent
 * (worker retries). Resolves without sending only for unknown kinds (caller)
 * or already-drained entries (exactly-once backstop).
 */
export async function handleChatSendJob(
  payload: string,
  opts: ChatSenderOptions = {},
): Promise<void> {
  const input = parseChatSendPayload(payload);
  const qc = opts.qc ?? queryClient;
  const queuedId = `queued-${input.clientId}`;
  const pending = getQueuedMessage(qc, input.conversationId, queuedId);
  if (!pending) {
    // Already confirmed by an earlier pass — never re-POST (no duplicate).
    logger.warn("[chat] outbox job already drained, skipping", {
      conversationId: input.conversationId,
    });
    return;
  }
  assertNotBlocked(qc, input.conversationId);
  let imageUrl = input.imageUrl;
  if (!imageUrl && input.localImageUri) {
    const upload = opts.upload ?? ((asset: PickedMedia) => uploadMedia(asset, { fetchImpl: opts.fetchImpl }));
    const uploaded = await upload(toPickedMedia(input.localImageUri));
    imageUrl = uploaded.url;
  }
  const remote = opts.sendRemote ?? sendMessageRemote;
  const server = await remote(
    input.conversationId,
    { body: input.body, imageUrl },
    { fetchImpl: opts.fetchImpl },
  );
  if (!server) throw new Error("[chat] Invalid send-message response from outbox drain");
  confirmQueuedMessage(qc, input.conversationId, queuedId, server);
  logChatSend(input.conversationId);
}

/**
 * Worker entrypoint: routes `chat.send`, drops unknown kinds after logging
 * (resolves so the worker marks them sent instead of blocking the queue).
 */
export async function dispatchChatOutboxJob(
  job: ChatOutboxJob,
  opts: ChatSenderOptions = {},
): Promise<void> {
  if (job.kind !== CHAT_OUTBOX_KIND) {
    logger.warn("[outbox] unknown kind, dropping", { kind: job.kind });
    return;
  }
  await handleChatSendJob(job.payload, opts);
}
