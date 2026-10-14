/**
 * Typed API + realtime endpoint builders.
 *
 * - Base URLs come from `env` (explicit `EXPO_PUBLIC_*` wins, per-profile EAS env after that).
 * - `client` joins paths with the API base; these builders only shape paths.
 * - No fetching here; features call through `client` or entity `api.ts` files.
 */

import { env } from "../config/env";

export const apiBaseUrl = env.apiUrl;

function encode(value: string): string {
  return encodeURIComponent(value);
}

export const endpoints = {
  session: () => "/auth/session",
  refresh: () => "/auth/refresh",
  me: () => "/users/me",
  user: (id: string) => `/users/${encode(id)}`,
  userByHandle: (handle: string) => `/users/handle/${encode(handle)}`,
  userPosts: (id: string, cursor?: string | null) =>
    cursor ? `/users/${encode(id)}/posts?cursor=${encode(cursor)}` : `/users/${encode(id)}/posts`,
  followers: (id: string) => `/users/${encode(id)}/followers`,
  userFollowers: (id: string, cursor?: string | null) =>
    cursor
      ? `/users/${encode(id)}/followers?cursor=${encode(cursor)}`
      : `/users/${encode(id)}/followers`,
  userFollowing: (id: string, cursor?: string | null) =>
    cursor
      ? `/users/${encode(id)}/following?cursor=${encode(cursor)}`
      : `/users/${encode(id)}/following`,
  followUser: (id: string) => `/users/${encode(id)}/follow`,
  unfollowUser: (id: string) => `/users/${encode(id)}/unfollow`,
  followRequests: (cursor?: string | null) =>
    cursor ? `/follow-requests?cursor=${encode(cursor)}` : "/follow-requests",
  approveFollowRequest: (followerId: string) =>
    `/follow-requests/${encode(followerId)}/approve`,
  rejectFollowRequest: (followerId: string) =>
    `/follow-requests/${encode(followerId)}/reject`,
  userRelationship: (id: string) => `/users/${encode(id)}/relationship`,
  blockUser: (id: string) => `/users/${encode(id)}/block`,
  unblockUser: (id: string) => `/users/${encode(id)}/unblock`,
  muteUser: (id: string) => `/users/${encode(id)}/mute`,
  unmuteUser: (id: string) => `/users/${encode(id)}/unmute`,
  reports: () => "/reports",
  post: (id: string) => `/posts/${encode(id)}`,
  createPost: () => "/posts",
  homeFeed: (cursor?: string | null) =>
    cursor ? `/feed/home?cursor=${encode(cursor)}` : "/feed/home",
  search: (q: string, cursor?: string | null) => {
    const base = `/search?q=${encode(q.trim())}`;
    return cursor ? `${base}&cursor=${encode(cursor)}` : base;
  },
  likePost: (id: string) => `/posts/${encode(id)}/like`,
  postComments: (postId: string, cursor?: string | null) =>
    cursor
      ? `/posts/${encode(postId)}/comments?cursor=${encode(cursor)}`
      : `/posts/${encode(postId)}/comments`,
  createComment: (postId: string) => `/posts/${encode(postId)}/comments`,
  likeComment: (id: string) => `/comments/${encode(id)}/like`,
  repost: (id: string) => `/posts/${encode(id)}/repost`,
  uploadSessions: () => "/uploads",
  devices: () => "/devices",
  conversation: (id: string) => `/conversations/${encode(id)}`,
  conversationMessages: (id: string, cursor?: string | null) =>
    cursor
      ? `/conversations/${encode(id)}/messages?cursor=${encode(cursor)}`
      : `/conversations/${encode(id)}/messages`,
  notifications: (cursor?: string | null) =>
    cursor ? `/notifications?cursor=${encode(cursor)}` : "/notifications",
  markNotificationRead: (id: string) => `/notifications/${encode(id)}/read`,
};

/** Absolute URL for non-`client` callers (upload targets, link previews). */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${suffix}`;
}

/** WS base: explicit override wins, otherwise derive from the API base. */
export function wsBaseUrl(): string {
  if (env.wsUrl) return env.wsUrl;
  if (apiBaseUrl.startsWith("https://")) return apiBaseUrl.replace(/^https:\/\//, "wss://");
  if (apiBaseUrl.startsWith("http://")) return apiBaseUrl.replace(/^http:\/\//, "ws://");
  return apiBaseUrl;
}

/** Realtime entrypoint, e.g. `wss://…/realtime`. */
export function realtimeUrl(path = "/realtime"): string {
  const base = wsBaseUrl().replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
