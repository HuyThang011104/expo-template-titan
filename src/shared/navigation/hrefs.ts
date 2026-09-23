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
};
