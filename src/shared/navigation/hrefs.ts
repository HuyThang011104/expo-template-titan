import type { Href } from "expo-router";

/**
 * Shared deep-link href builders. All post/user navigation goes through here.
 * Object form keeps typed routes typechecking with dynamic ids.
 */

export const UNIVERSAL_LINK_HOST = "titan.example";
export const UNIVERSAL_LINK_ORIGIN = "https://titan.example";

export const hrefs = {
  home: (): Href => "/",
  post: (id: string): Href => ({ pathname: "/post/[id]", params: { id } }),
  user: (handle: string): Href => ({ pathname: "/user/[handle]", params: { handle } }),
  userFollowers: (handle: string): Href =>
    ({ pathname: "/user/[handle]/followers", params: { handle } }) as unknown as Href,
  userFollowing: (handle: string): Href =>
    ({ pathname: "/user/[handle]/following", params: { handle } }) as unknown as Href,
  hashtag: (tag: string): Href =>
    ({ pathname: "/hashtag/[tag]", params: { tag } }) as unknown as Href,
  followRequests: (): Href => ({ pathname: "/follow-requests" }) as unknown as Href,
  /**
   * Report sheet (F6). Cast until `.expo/types/router.d.ts` regenerates
   * on the next `expo start` (typed routes are codegen'd, see Phase 5 notes).
   */
  report: (targetType: "post" | "user", targetId: string): Href =>
    ({ pathname: "/report", params: { targetType, targetId } }) as unknown as Href,
  editPost: (postId: string): Href =>
    ({ pathname: "/edit-post", params: { postId } }) as unknown as Href,
  chat: (id: string): Href =>
    ({ pathname: "/(app)/(inbox)/chats/[id]", params: { id } }) as unknown as Href,
};
