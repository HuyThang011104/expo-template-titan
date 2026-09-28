/**
 * Stable app-wide query keys. Features always go through this object.
 */

export const queryKeys = {
  session: ["session"] as const,
  me: ["me"] as const,
  user: (id: string) => ["users", id] as const,
  userByHandle: (handle: string) => ["users", "handle", handle] as const,
  userPosts: (id: string) => ["users", id, "posts"] as const,
  userRelationship: (id: string) => ["users", id, "relationship"] as const,
  post: (id: string) => ["posts", id] as const,
  homeFeed: (cursor?: string) => ["feed", "home", cursor ?? ""] as const,
  search: (q: string) => ["search", q.trim().toLowerCase()] as const,
  notification: (id: string) => ["notifications", id] as const,
  notifications: () => ["notifications"] as const,
};
