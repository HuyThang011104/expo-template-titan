/**
 * Tests for `shared/observability`.
 *
 * - No DSN means disabled ("would send"), never throws.
 * - No token/PII leaks; extras redacted; screen params redacted.
 */

import { logger } from "../logger";
import {
  __resetObservabilityForTests,
  captureObservabilityError,
  initObservability,
  isObservabilityEnabled,
  mapSessionToUserId,
  setObservabilityUser,
} from "../sentry";
import { buildScreenName, trackScreen } from "../screen-tracking";

declare const __DEV__: boolean;

beforeEach(() => {
  __resetObservabilityForTests();
  jest.restoreAllMocks();
});

describe("initObservability", () => {
  it("stays disabled with empty DSN — never throws, app still boots", () => {
    expect(initObservability({ dsn: "" })).toEqual({ enabled: false });
    expect(isObservabilityEnabled()).toBe(false);
  });

  it("second init is a no-op (idempotent)", () => {
    initObservability({ dsn: "" });
    expect(initObservability({ dsn: "https://x@y/1" })).toEqual({ enabled: false });
    expect(isObservabilityEnabled()).toBe(false);
  });
});

describe("disabled mode (no DSN)", () => {
  it("logs 'would send' instead of hitting the network", () => {
    initObservability({ dsn: "" });
    const debug = jest.spyOn(console, "debug").mockImplementation(() => {});
    expect(() => captureObservabilityError("boom", { code: 500 })).not.toThrow();
    expect(debug).toHaveBeenCalledWith(
      expect.stringContaining("would send"),
      "boom",
      { code: 500 },
    );
  });

  it("setObservabilityUser is a no-op, never throws", () => {
    initObservability({ dsn: "" });
    expect(() => setObservabilityUser("dev-user")).not.toThrow();
    expect(() => setObservabilityUser(null)).not.toThrow();
  });
});

describe("mapSessionToUserId", () => {
  it("null → null (logout clear user)", () => {
    expect(mapSessionToUserId(null)).toBeNull();
  });

  it("mock session maps to a stable id, never leaks the raw token", () => {
    expect(mapSessionToUserId("dev-token")).toBe("dev-user");
    expect(mapSessionToUserId("some-other-token")).toBe("dev-user");
  });
});

describe("logger.error forward", () => {
  it("redacts extras before forwarding — no password leak", () => {
    initObservability({ dsn: "" });
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const debug = jest.spyOn(console, "debug").mockImplementation(() => {});

    logger.error("login failed", { password: "secret-123", code: 401 });

    expect(error).toHaveBeenCalledWith("login failed", {
      password: "[REDACTED]",
      code: 401,
    });
    const wouldSend = debug.mock.calls.find((args) =>
      String(args[0]).includes("would send"),
    );
    expect(wouldSend).toBeDefined();
    expect(JSON.stringify(wouldSend)).not.toContain("secret-123");
  });
});

describe("buildScreenName", () => {
  it("plain pathname without params", () => {
    expect(buildScreenName("/")).toBe("/");
    expect(buildScreenName("/post/abc", {})).toBe("/post/abc");
  });

  it("null pathname maps to (unknown)", () => {
    expect(buildScreenName(null)).toBe("(unknown)");
  });

  it("sorts params and joins arrays", () => {
    expect(buildScreenName("/search", { q: "a", tags: ["x", "y"] })).toBe(
      "/search?q=a&tags=x,y",
    );
  });

  it("redacts sensitive params", () => {
    expect(buildScreenName("/cb", { token: "abc", next: "/home" })).toBe(
      "/cb?next=/home&token=[REDACTED]",
    );
  });

  it("trackScreen returns the name and never throws when disabled", () => {
    initObservability({ dsn: "" });
    // `logger.debug` only runs in `__DEV__`; assert return value + no-throw only.
    expect(__DEV__).toBe(true);
    expect(trackScreen("/post/abc", { id: "abc" })).toBe("/post/abc?id=abc");
  });
});
