import { router } from "expo-router";

import {
  consumePendingNotificationHref,
  navigateFromNotificationData,
  parseChatNotificationTarget,
  parsePostNotificationTarget,
  resolveNotificationHref,
} from "../handlers";
import { hrefs } from "../../navigation";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("expo-notifications", () => ({
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

const mockedPush = router.push as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  consumePendingNotificationHref();
});

describe("parsePostNotificationTarget", () => {
  it("accepts { type: 'post', id }", () => {
    expect(parsePostNotificationTarget({ type: "post", id: "abc" })).toBe("abc");
  });

  it("rejects wrong type, missing or blank id", () => {
    expect(parsePostNotificationTarget({ type: "comment", id: "abc" })).toBeNull();
    expect(parsePostNotificationTarget({ type: "post" })).toBeNull();
    expect(parsePostNotificationTarget({ type: "post", id: "  " })).toBeNull();
    expect(parsePostNotificationTarget({ type: "post", id: 42 })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parsePostNotificationTarget(null)).toBeNull();
    expect(parsePostNotificationTarget("abc")).toBeNull();
    expect(parsePostNotificationTarget([{ type: "post", id: "abc" }])).toBeNull();
  });

  it("falls back to data.url deep links", () => {
    expect(parsePostNotificationTarget({ url: "/post/xyz" })).toBe("xyz");
    expect(parsePostNotificationTarget({ url: "/p/xyz" })).toBe("xyz");
    expect(parsePostNotificationTarget({ url: "/about" })).toBeNull();
  });
});

describe("parseChatNotificationTarget", () => {
  it("accepts message/chat with id, conversationId, or convId", () => {
    expect(parseChatNotificationTarget({ type: "message", id: "c-1" })).toBe("c-1");
    expect(parseChatNotificationTarget({ type: "message", conversationId: "c-2" })).toBe(
      "c-2",
    );
    expect(parseChatNotificationTarget({ type: "chat", convId: "c-3" })).toBe("c-3");
  });

  it("rejects wrong type, missing or blank ids", () => {
    expect(parseChatNotificationTarget({ type: "post", id: "c-1" })).toBeNull();
    expect(parseChatNotificationTarget({ type: "message" })).toBeNull();
    expect(parseChatNotificationTarget({ type: "message", id: "  " })).toBeNull();
    expect(parseChatNotificationTarget({ type: "message", id: 42 })).toBeNull();
    expect(parseChatNotificationTarget(null)).toBeNull();
  });

  it("falls back to data.url chat links", () => {
    expect(parseChatNotificationTarget({ url: "/chats/c-9" })).toBe("c-9");
    expect(parseChatNotificationTarget({ url: "/chat/c-9" })).toBe("c-9");
    expect(parseChatNotificationTarget({ url: "/c/c-9" })).toBe("c-9");
    expect(parseChatNotificationTarget({ url: "/post/xyz" })).toBeNull();
  });
});

describe("resolveNotificationHref", () => {
  it("resolves to the typed post href", () => {
    expect(resolveNotificationHref({ type: "post", id: "abc" })).toEqual(hrefs.post("abc"));
  });

  it("resolves message pushes to the exact chat thread", () => {
    expect(resolveNotificationHref({ type: "message", id: "c-1" })).toEqual(hrefs.chat("c-1"));
    expect(resolveNotificationHref({ type: "message", conversationId: "c-2" })).toEqual(
      hrefs.chat("c-2"),
    );
  });

  it("returns null for unhandled payloads", () => {
    expect(resolveNotificationHref({ type: "other" })).toBeNull();
    expect(resolveNotificationHref(null)).toBeNull();
  });
});

describe("navigateFromNotificationData", () => {
  it("pushes the post href when authenticated", () => {
    const handled = navigateFromNotificationData({ type: "post", id: "abc" }, { authenticated: true });

    expect(handled).toBe(true);
    expect(mockedPush).toHaveBeenCalledTimes(1);
    expect(mockedPush).toHaveBeenCalledWith(hrefs.post("abc"));
    expect(consumePendingNotificationHref()).toBeNull();
  });

  it("queues the href when unauthenticated instead of pushing", () => {
    const handled = navigateFromNotificationData({ type: "post", id: "abc" }, { authenticated: false });

    expect(handled).toBe(true);
    expect(mockedPush).not.toHaveBeenCalled();
    expect(consumePendingNotificationHref()).toEqual(hrefs.post("abc"));
    // Consumed exactly once.
    expect(consumePendingNotificationHref()).toBeNull();
  });

  it("pushes the exact chat thread when authenticated", () => {
    const handled = navigateFromNotificationData(
      { type: "message", conversationId: "c-1" },
      { authenticated: true },
    );

    expect(handled).toBe(true);
    expect(mockedPush).toHaveBeenCalledTimes(1);
    expect(mockedPush).toHaveBeenCalledWith(hrefs.chat("c-1"));
  });

  it("queues the chat href when logged out for flush after login", () => {
    const handled = navigateFromNotificationData(
      { type: "message", conversationId: "c-1" },
      { authenticated: false },
    );

    expect(handled).toBe(true);
    expect(mockedPush).not.toHaveBeenCalled();
    expect(consumePendingNotificationHref()).toEqual(hrefs.chat("c-1"));
    expect(consumePendingNotificationHref()).toBeNull();
  });

  it("ignores unhandled payloads without queuing", () => {
    expect(navigateFromNotificationData({ type: "other" }, { authenticated: true })).toBe(false);
    expect(navigateFromNotificationData({ type: "other" }, { authenticated: false })).toBe(false);
    expect(mockedPush).not.toHaveBeenCalled();
    expect(consumePendingNotificationHref()).toBeNull();
  });
});
