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
  followers: (id: string) => `/users/${encode(id)}/followers`,
  post: (id: string) => `/posts/${encode(id)}`,
  homeFeed: (cursor?: string | null) =>
    cursor ? `/feed/home?cursor=${encode(cursor)}` : "/feed/home",
  likePost: (id: string) => `/posts/${encode(id)}/like`,
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
