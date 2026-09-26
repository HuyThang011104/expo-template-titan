/**
 * Composer create-post mutation (F1.1 text + F1.2 media).
 *
 * Thin wrapper over the entity `useCreatePost`:
 * - `submit(input, localUris)` posts once; success clears `composer:draft`
 *   (no direct cache writes here; the entity prepends via `addCreatedPost`).
 * - `submitWithMedia(body, assets)` uploads each asset via `uploadMedia`
 *   first, then posts `{ body, mediaIds }`.
 * - `ApiError NETWORK/TIMEOUT` at any stage → `enqueueOutboxJob("post.create",
 *   { body, localUris })` once; the F1.3 sender re-uploads `localUris`.
 *   Caller shows "Queued — will send when online".
 * - No auto-retry (double-post risk); UI retries by hand.
 */

import { useState } from "react";

import { useCreatePost, type CreatePostInput } from "@/entities/post";
import { isApiError } from "@/shared/api/errors";
import { uploadMedia } from "@/shared/media/upload";
import type { PickedMedia } from "@/shared/media/picker";
import { deleteDraft } from "@/shared/storage/db/drafts";
import { enqueueOutboxJob } from "@/shared/storage/db/outbox";

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

export function buildComposerOutboxPayload(body: string, localUris: string[] = []): string {
  const payload: ComposerOutboxPayload = { body, localUris };
  return JSON.stringify(payload);
}

export function useComposerCreatePost(opts: ComposerFetchOptions = {}) {
  const entity = useCreatePost(opts);
  const [isUploading, setIsUploading] = useState(false);

  async function submit(
    input: CreatePostInput,
    localUris: string[] = [],
  ): Promise<ComposerSubmitResult> {
    try {
      const post = await entity.mutateAsync(input);
      await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
      logComposerSuccess(post.id);
      return { status: "posted", postId: post.id };
    } catch (error) {
      if (isApiError(error) && (error.code === "NETWORK" || error.code === "TIMEOUT")) {
        await enqueueOutboxJob(
          COMPOSER_OUTBOX_KIND,
          buildComposerOutboxPayload(input.body, localUris),
        );
        await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
        logComposerFail("queued-offline");
        return { status: "queued" };
      }
      logComposerFail(error instanceof Error ? error.message : "unknown");
      throw error;
    }
  }

  /**
   * Uploads each asset (sequentially, like the outbox worker) then posts.
   * Offline anywhere → single `post.create` job carrying `localUris`.
   */
  async function submitWithMedia(
    body: string,
    assets: PickedMedia[],
  ): Promise<ComposerSubmitResult> {
    const localUris = assets.map((asset) => asset.uri);
    setIsUploading(true);
    try {
      const mediaIds: string[] = [];
      for (const asset of assets) {
        const uploaded = await uploadMedia(asset, { fetchImpl: opts.fetchImpl });
        mediaIds.push(uploaded.mediaId);
      }
      return await submit({ body, mediaIds }, localUris);
    } catch (error) {
      if (isApiError(error) && (error.code === "NETWORK" || error.code === "TIMEOUT")) {
        await enqueueOutboxJob(COMPOSER_OUTBOX_KIND, buildComposerOutboxPayload(body, localUris));
        await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
        logComposerFail("queued-offline");
        return { status: "queued" };
      }
      logComposerFail(error instanceof Error ? error.message : "unknown");
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    submit,
    submitWithMedia,
    isUploading,
    isPending: entity.isPending || isUploading,
    isError: entity.isError,
    error: entity.error,
    reset: entity.reset,
  };
}
