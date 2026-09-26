/**
 * Composer create-post mutation (F1.1 text-only).
 *
 * Thin wrapper over the entity `useCreatePost`:
 * - Success → `deleteDraft(composer:draft)` (no direct cache writes here; the entity
 *   prepends via `addCreatedPost`).
 * - `ApiError NETWORK/TIMEOUT` → `enqueueOutboxJob("post.create", …)` once,
 *   caller shows "Queued — will send when online" (drain wiring lands in F1.3).
 * - No auto-retry (double-post risk); UI retries by hand.
 */

import { useCreatePost, type CreatePostInput } from "@/entities/post";
import { isApiError } from "@/shared/api/errors";
import { enqueueOutboxJob } from "@/shared/storage/db/outbox";
import { deleteDraft } from "@/shared/storage/db/drafts";

import { logComposerFail, logComposerSuccess } from "../analytics";
import { COMPOSER_DRAFT_KEY } from "../hooks/use-composer-draft";

export const COMPOSER_OUTBOX_KIND = "post.create";

export type ComposerOutboxPayload = {
  body: string;
  localUris: string[];
};

export type ComposerSubmitResult =
  | { status: "posted"; postId: string }
  | { status: "queued" };

export type ComposerFetchOptions = {
  fetchImpl?: typeof fetch;
};

export function buildComposerOutboxPayload(body: string): string {
  const payload: ComposerOutboxPayload = { body, localUris: [] };
  return JSON.stringify(payload);
}

export function useComposerCreatePost(opts: ComposerFetchOptions = {}) {
  const entity = useCreatePost(opts);

  async function submit(input: CreatePostInput): Promise<ComposerSubmitResult> {
    try {
      const post = await entity.mutateAsync(input);
      await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
      logComposerSuccess(post.id);
      return { status: "posted", postId: post.id };
    } catch (error) {
      if (isApiError(error) && (error.code === "NETWORK" || error.code === "TIMEOUT")) {
        await enqueueOutboxJob(COMPOSER_OUTBOX_KIND, buildComposerOutboxPayload(input.body));
        await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
        logComposerFail("queued-offline");
        return { status: "queued" };
      }
      logComposerFail(error instanceof Error ? error.message : "unknown");
      throw error;
    }
  }

  return {
    submit,
    isPending: entity.isPending,
    isError: entity.isError,
    error: entity.error,
    reset: entity.reset,
  };
}
