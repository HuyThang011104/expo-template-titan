/**
 * Stable app-wide query keys. Features always go through this object.
 */

export const queryKeys = {
  session: ["session"] as const,
  me: ["me"] as const,
  user: (id: string) => ["users", id] as const,
  post: (id: string) => ["posts", id] as const,
  homeFeed: (cursor?: string) => ["feed", "home", cursor ?? ""] as const,
};
