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
  userFollowers: (id: string) => ["users", id, "followers"] as const,
  userFollowing: (id: string) => ["users", id, "following"] as const,
  followRequests: () => ["follow-requests"] as const,
  post: (id: string) => ["posts", id] as const,
  homeFeed: (cursor?: string) => ["feed", "home", cursor ?? ""] as const,
  search: (q: string) => ["search", q.trim().toLowerCase()] as const,
  hashtag: (tag: string) => ["search", "hashtag", tag.trim().toLowerCase()] as const,
  trending: () => ["search", "trending"] as const,
  notification: (id: string) => ["notifications", id] as const,
  notifications: () => ["notifications"] as const,
  notifPrefs: () => ["notif-prefs"] as const,
  accountSessions: () => ["account", "sessions"] as const,
  comment: (id: string) => ["comments", id] as const,
  postComments: (postId: string) => ["posts", postId, "comments"] as const,
  savedPosts: () => ["saved", "posts"] as const,
  conversation: (id: string) => ["conversations", id] as const,
  conversations: () => ["conversations"] as const,
  conversationMessages: (id: string) => ["conversations", id, "messages"] as const,
};
