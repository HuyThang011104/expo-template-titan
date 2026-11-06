import type { Href } from "expo-router";

/**
 * Shared deep-link href builders. All post/user navigation goes through here.
 * Object form keeps typed routes typechecking with dynamic ids.
 */

export const UNIVERSAL_LINK_HOST = "titan.example";
export const UNIVERSAL_LINK_ORIGIN = "https://titan.example";

export const hrefs = {
  home: (): Href => "/",
  /**
   * Post detail. `focus: "comment"` asks the screen to autofocus the
   * composer (comment affordance, PD4); the route reads it in PF3.1.
   */
  post: (id: string, focus?: "comment"): Href =>
    focus
      ? ({ pathname: "/post/[id]", params: { id, focus } } as unknown as Href)
      : { pathname: "/post/[id]", params: { id } },
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
  editProfile: (): Href => ({ pathname: "/edit-profile" }) as unknown as Href,
  /** Full-screen media viewer (F16/PD10): canonical cache first, `index` is 0-based. */
  mediaViewer: (postId: string, index: number): Href =>
    ({ pathname: "/media-viewer", params: { postId, index: String(index) } }) as unknown as Href,
  settings: (): Href => ({ pathname: "/settings" }) as unknown as Href,
  notifSettings: (): Href => ({ pathname: "/settings/notifications" }) as unknown as Href,
  privacySettings: (): Href => ({ pathname: "/settings/privacy" }) as unknown as Href,
  accountSettings: (): Href => ({ pathname: "/settings/account" }) as unknown as Href,
  chat: (id: string): Href =>
    ({ pathname: "/(app)/(inbox)/chats/[id]", params: { id } }) as unknown as Href,
  /** G3.3: thread list entry (Inbox header button, push targets). */
  chats: (): Href => ({ pathname: "/(app)/(inbox)/chats" }) as unknown as Href,
};
