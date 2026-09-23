/**
 * Minimal Post fixtures.
 *
 * - Three posts: two by `u-1`, one by `u-2`; one pre-liked.
 * - Includes `post-fail` for rollback tests; not exported via `index.ts`.
 */

import type { Post } from "./model";

export const mockPost1: Post = {
  id: "p-1",
  authorId: "u-1",
  body: "Good morning ☀️",
  media: [{ kind: "image", url: "https://picsum.photos/seed/p1/800/600" }],
  likeCount: 38,
  likedByMe: false,
  createdAt: "2026-09-09T10:00:00.000Z",
};

export const mockPost2: Post = {
  id: "p-2",
  authorId: "u-2",
  body: "Pre-liked post for unlike-state tests.",
  media: [],
  likeCount: 1400,
  likedByMe: true,
  createdAt: "2026-09-08T08:30:00.000Z",
};

/** Mock API returns 500 for this id → rollback test. */
export const mockFailPost: Post = {
  id: "post-fail",
  authorId: "u-1",
  body: "Mock API always fails for this post to verify rollback.",
  media: [],
  likeCount: 5,
  likedByMe: false,
  createdAt: "2026-09-07T12:00:00.000Z",
};

export const mockPosts: Post[] = [mockPost1, mockPost2, mockFailPost];
