/**
 * Post canonical cache.
 *
 * - Only file allowed to `setQueryData(queryKeys.post…)` or patch the
 *   home-feed id list. Features call these helpers, never `setQueryData` directly.
 * - `hydrateFeedItem` writes both post and author canonical entries.
 * - `likePost` is read → optimistic flip → server wins → rollback.
 * - `addCreatedPost` writes the canonical entry + prepends page 0 (no full invalidate).
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { deletePostRemote, likePostRemote, updatePostRemote } from "./api";
import type { FeedWireItem, Post } from "./model";
import { parseUpdatePostInput } from "./schema";

/** Overwrite the canonical post. */
export function setPost(qc: QueryClient, post: Post): void {
  qc.setQueryData(queryKeys.post(post.id), post);
}

/** Read the canonical post (no fetch). */
export function getPostData(qc: QueryClient, id: string): Post | undefined {
  return qc.getQueryData<Post>(queryKeys.post(id));
}

/**
 * Merge a patch into the canonical entry; `undefined` when missing.
 */
export function patchPost(qc: QueryClient, id: string, patch: Partial<Post>): Post | undefined {
  const prev = getPostData(qc, id);
  if (!prev) return undefined;
  const next: Post = { ...prev, ...patch };
  qc.setQueryData(queryKeys.post(id), next);
  return next;
}

/**
 * Hydrate one `{ post, author }` wire item; returns `{ postId }`.
 * Author snapshots merge into the canonical user so G2.1 extended fields
 * (bio/cover/link) survive feed hydration — no "chỗ cũ chỗ mới".
 * (Local merge: entity-to-entity imports are banned.)
 */
export function hydrateFeedItem(qc: QueryClient, item: FeedWireItem): { postId: string } {
  setPost(qc, item.post);
  const prev = qc.getQueryData<Record<string, unknown>>(queryKeys.user(item.author.id));
  if (prev && typeof prev === "object" && ("bio" in prev || "coverUrl" in prev || "link" in prev)) {
    qc.setQueryData(queryKeys.user(item.author.id), { ...prev, ...item.author });
  } else {
    qc.setQueryData(queryKeys.user(item.author.id), {
      ...item.author,
      bio: null,
      coverUrl: null,
      link: null,
      // Duplicated defaults (entity-to-entity imports are banned).
      privacySettings: {
        messageAudience: "everyone",
        postVisibility: "public",
        tagAudience: "everyone",
      },
    });
  }
  return { postId: item.post.id };
}

export type LikeRemoteFn = typeof likePostRemote;

export type LikePostOptions = {
  likeRemote?: LikeRemoteFn;
};/**
 * Like/unlike with cross-cache optimistic update; all callers must use this.
 */
export async function likePost(
  qc: QueryClient,
  id: string,
  opts: LikePostOptions = {},
): Promise<void> {
  const prev = getPostData(qc, id);
  // No canonical entry → skip here, do not fetch.
  if (!prev) return;

  const liked = !prev.likedByMe;
  patchPost(qc, id, {
    likedByMe: liked,
    likeCount: Math.max(0, prev.likeCount + (liked ? 1 : -1)),
  });

  const remote = opts.likeRemote ?? likePostRemote;
  try {
    const server = await remote(id, liked);
    // Server wins on a valid post; `null` means failure → rollback.
    if (server) {
      setPost(qc, server);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setPost(qc, prev);
  logger.warn("[post] like failed, rolled back", { postId: id });
}

type HomeFeedPageShape = {
  postIds: string[];
  nextCursor: string | null;
};

/**
 * Insert a newly created post: canonical entry + prepend to home-feed page 0.
 * Dedupe by id; creates page 0 when the feed was never fetched (no full invalidate,
 * so scroll position elsewhere is preserved).
 */
export function addCreatedPost(qc: QueryClient, post: Post): void {
  setPost(qc, post);
  qc.setQueryData<InfiniteData<HomeFeedPageShape, string | null>>(
    queryKeys.homeFeed(),
    (old) => {
      if (!old) {
        return {
          pages: [{ postIds: [post.id], nextCursor: null }],
          pageParams: [null],
        };
      }
      const [first, ...rest] = old.pages;
      if (!first) return old;
      if (first.postIds.includes(post.id)) return old;
      return {
        ...old,
        pages: [{ ...first, postIds: [post.id, ...first.postIds] }, ...rest],
      };
    },
  );
}

export type UpdatePostOptions = {
  updateRemote?: typeof updatePostRemote;
};

export type DeletePostOptions = {
  deleteRemote?: typeof deletePostRemote;
};

/**
 * Edit own post (text-only): validate → PATCH → overwrite the single
 * canonical entry, so feed + detail + profile update together with no list
 * patching. Throws on invalid input or transport/HTTP errors (callers show
 * the message inline); no auto-retry.
 */
export async function updatePost(
  qc: QueryClient,
  id: string,
  body: string,
  opts: UpdatePostOptions = {},
): Promise<Post> {
  const input = parseUpdatePostInput({ body });
  if (!input) throw new Error("Post must be 1–280 characters.");
  const remote = opts.updateRemote ?? updatePostRemote;
  const server = await remote(id, input.body);
  if (!server) {
    logger.warn("[post] update failed, kept local copy", { postId: id });
    throw new Error("Couldn't save your edit. Tap to retry.");
  }
  // Server wins on the single canonical entry: feed + detail + profile
  // read this entry, so every surface updates together.
  setPost(qc, server);
  return server;
}

/**
 * Delete own post: DELETE → drop the canonical entry and strip the id from
 * every loaded id-list (home feed, profile lists, search pages) without a
 * full refetch. Throws on failure so the confirm UI can show retry; nothing
 * is removed until the server confirms (no optimistic delete).
 */
export async function deletePost(
  qc: QueryClient,
  id: string,
  opts: DeletePostOptions = {},
): Promise<void> {
  const remote = opts.deleteRemote ?? deletePostRemote;
  let ok = false;
  try {
    ok = await remote(id);
  } catch {
    ok = false;
  }
  if (!ok) {
    logger.warn("[post] delete failed", { postId: id });
    throw new Error("Couldn't delete your post. Tap to retry.");
  }
  removePostEverywhere(qc, id);
}

type IdListPage = {
  postIds: string[];
  nextCursor: string | null;
};

function hasPostIds(page: unknown): page is IdListPage {
  return (
    page !== null &&
    typeof page === "object" &&
    "postIds" in page &&
    Array.isArray((page as { postIds: unknown }).postIds)
  );
}

/**
 * Strip one post id from the canonical entry and every loaded `{ postIds }`
 * page (feed, profile, search share this shape). Detail screens reading the
 * canonical entry fall back to "no longer available" via their query error.
 */
export function removePostEverywhere(qc: QueryClient, id: string): void {
  qc.removeQueries({ queryKey: queryKeys.post(id) });
  const cache = qc.getQueryCache().findAll();
  for (const query of cache) {
    const data = query.state.data as
      | { pages?: unknown[]; pageParams?: unknown[] }
      | undefined;
    if (!data || !Array.isArray(data.pages)) continue;
    if (!data.pages.some(hasPostIds)) continue;
    qc.setQueryData(
      query.queryKey,
      (old: { pages: IdListPage[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old;
        let touched = false;
        const pages = old.pages.map((page) => {
          if (!page.postIds.includes(id)) return page;
          touched = true;
          return { ...page, postIds: page.postIds.filter((postId) => postId !== id) };
        });
        return touched ? { ...old, pages } : old;
      },
    );
  }
}
