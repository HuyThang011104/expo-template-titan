/**
 * Tests for `shared/api/endpoints`. Pure path builders + URL derivation.
 */

import { absoluteUrl, apiBaseUrl, endpoints, realtimeUrl, wsBaseUrl } from "../endpoints";

describe("endpoints", () => {
  it("builds entity paths with encoding", () => {
    expect(endpoints.post("abc")).toBe("/posts/abc");
    expect(endpoints.user("u 1")).toBe("/users/u%201");
    expect(endpoints.userByHandle("Huy Thang")).toBe("/users/handle/Huy%20Thang");
    expect(endpoints.followers("u1")).toBe("/users/u1/followers");
    expect(endpoints.likePost("p1")).toBe("/posts/p1/like");
    expect(endpoints.conversation("c1")).toBe("/conversations/c1");
  });

  it("builds cursor pages only when a cursor exists", () => {
    expect(endpoints.homeFeed()).toBe("/feed/home");
    expect(endpoints.homeFeed(null)).toBe("/feed/home");
    expect(endpoints.homeFeed("a/b")).toBe("/feed/home?cursor=a%2Fb");
    expect(endpoints.notifications("n2")).toBe("/notifications?cursor=n2");
    expect(endpoints.conversationMessages("c1")).toBe("/conversations/c1/messages");
  });

  it("joins absolute URLs without double slashes", () => {
    expect(absoluteUrl("/posts/1")).toBe(`${apiBaseUrl}/posts/1`);
    expect(absoluteUrl("posts/1")).toBe(`${apiBaseUrl}/posts/1`);
  });

  it("derives ws(s) from the API base when no override is set", () => {
    // Jest runs without EXPO_PUBLIC_* — apiUrl falls back to localhost:8080.
    expect(apiBaseUrl).toBe("http://localhost:8080");
    expect(wsBaseUrl()).toBe("ws://localhost:8080");
    expect(realtimeUrl()).toBe("ws://localhost:8080/realtime");
    expect(realtimeUrl("v1/socket")).toBe("ws://localhost:8080/v1/socket");
  });
});
