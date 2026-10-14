/**
 * Tests for post share links (G1.4, pure builders).
 */

import { buildPostDeepLink, parsePostDeepLink } from "../share";

describe("buildPostDeepLink", () => {
  it("builds a scheme link per variant", () => {
    expect(buildPostDeepLink("feed-p-1", "titan-dev")).toBe("titan-dev://post/feed-p-1");
    expect(buildPostDeepLink("feed-p-1", "titan")).toBe("titan://post/feed-p-1");
  });

  it("encodes ids and trims scheme noise", () => {
    expect(buildPostDeepLink("a b", "titan-dev://")).toBe("titan-dev://post/a%20b");
  });

  it("round-trips through the parser", () => {
    const url = buildPostDeepLink("feed-p-1", "titan-dev");
    expect(parsePostDeepLink(url)).toBe("feed-p-1");
    expect(parsePostDeepLink("titan-dev://user/ava")).toBeNull();
    expect(parsePostDeepLink("not a url")).toBeNull();
  });
});
