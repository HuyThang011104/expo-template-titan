/**
 * Outbox sender for `post.create` (F1.3).
 *
 * The worker in `shared/storage/db/outbox-worker` owns ordering, retry
 * accounting, and online gating; this file only knows the composer endpoint:
 *
 * - Parses the opaque payload (`{ body, localUris }`); invalid payloads throw
 *   so the worker retries then dead-letters (never silently marked sent).
 * - Re-uploads each `localUri` via `uploadMedia`, then `POST /posts`.
 * - Prepends via `addCreatedPost` (single writer in `entities/post/cache`).
 * - Unknown kinds log + resolve so one bad kind never head-of-line blocks
 *   the queue (per the worker contract).
 */

import {
  addCreatedPost,
  createPostRemote,
  parseCreatePostInput,
} from "@/entities/post";
import type { PickedMedia } from "@/shared/media/picker";
import { uploadMedia } from "@/shared/media/upload";
import { logger } from "@/shared/observability/logger";
import { queryClient } from "@/shared/query";

import { logComposerSuccess } from "./analytics";
import {
  COMPOSER_OUTBOX_KIND,
  type ComposerOutboxPayload,
} from "./mutations/use-create-post";

export type ComposerSenderOptions = {
  /** Injected for tests; production uses the global fetch with auth. */
  fetchImpl?: typeof fetch;
};

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
 */
function toPickedMedia(uri: string): PickedMedia {
  return { uri, width: 0, height: 0, kind: "image", mimeType: guessMimeType(uri) };
}

/**
 * Parses + validates the opaque job payload. Throws on anything invalid
 * (worker retries, then dead-letters past `OUTBOX_MAX_ATTEMPTS`).
 */
export function parsePostCreatePayload(raw: string): ComposerOutboxPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("[composer] Invalid post.create payload: not JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("[composer] Invalid post.create payload: not an object");
  }
  const { body, localUris } = parsed as { body?: unknown; localUris?: unknown };
  if (
    !Array.isArray(localUris) ||
    localUris.length > 4 ||
    !localUris.every((uri): uri is string => typeof uri === "string" && uri.length > 0)
  ) {
    throw new Error("[composer] Invalid post.create payload: bad localUris");
  }
  const valid = parseCreatePostInput({ body, mediaIds: [] });
  if (!valid) throw new Error("[composer] Invalid post.create payload: bad body");
  return { body: valid.body, localUris };
}

/**
 * Sends one `post.create` job: re-upload local uris, create the post,
 * prepend to the home feed. Throws when not sent (worker retries).
 */
export async function handlePostCreateJob(
  payload: string,
  opts: ComposerSenderOptions = {},
): Promise<void> {
  const input = parsePostCreatePayload(payload);
  const mediaIds: string[] = [];
  for (const uri of input.localUris) {
    const uploaded = await uploadMedia(toPickedMedia(uri), { fetchImpl: opts.fetchImpl });
    mediaIds.push(uploaded.mediaId);
  }
  const post = await createPostRemote(input.body, mediaIds, { fetchImpl: opts.fetchImpl });
  if (!post) throw new Error("[composer] Invalid create-post response from outbox drain");
  addCreatedPost(queryClient, post);
  logComposerSuccess(post.id);
}

export type ComposerOutboxJob = {
  kind: string;
  payload: string;
};

/**
 * Worker entrypoint: routes `post.create`, drops unknown kinds after logging
 * (resolves so the worker marks them sent instead of blocking the queue).
 */
export async function dispatchComposerOutboxJob(
  job: ComposerOutboxJob,
  opts: ComposerSenderOptions = {},
): Promise<void> {
  if (job.kind !== COMPOSER_OUTBOX_KIND) {
    logger.warn("[outbox] unknown kind, dropping", { kind: job.kind });
    return;
  }
  await handlePostCreateJob(job.payload, opts);
}
