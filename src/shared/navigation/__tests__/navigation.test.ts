import { hrefs } from "../hrefs";
import { postPath, rewriteUniversalPath } from "../deep-links";

describe("hrefs", () => {
  it("builds typed post/user hrefs", () => {
    expect(hrefs.post("abc")).toEqual({ pathname: "/post/[id]", params: { id: "abc" } });
    expect(hrefs.user("ava")).toEqual({
      pathname: "/user/[handle]",
      params: { handle: "ava" },
    });
    expect(hrefs.home()).toBe("/");
  });

  it("postPath encodes the id", () => {
    expect(postPath("a b")).toBe("/post/a%20b");
  });
});

describe("rewriteUniversalPath", () => {
  it("returns null for null", () => {
    expect(rewriteUniversalPath(null)).toBeNull();
  });

  it("maps universal /p/{id} to /post/{id}", () => {
    expect(rewriteUniversalPath("https://titan.example/p/abc")).toBe("/post/abc");
    expect(rewriteUniversalPath("https://titan.example/post/abc")).toBe("/post/abc");
  });

  it("maps universal /u/{handle} to /user/{handle}", () => {
    expect(rewriteUniversalPath("https://titan.example/u/ava")).toBe("/user/ava");
    expect(rewriteUniversalPath("https://titan.example/user/ava")).toBe("/user/ava");
  });

  it("keeps query strings through the rewrite", () => {
    expect(rewriteUniversalPath("https://titan.example/p/abc?comment=1")).toBe(
      "/post/abc?comment=1",
    );
  });

  it("passes internal paths through untouched", () => {
    expect(rewriteUniversalPath("/post/abc")).toBe("/post/abc");
    expect(rewriteUniversalPath("/sign-in")).toBe("/sign-in");
    expect(rewriteUniversalPath("/")).toBe("/");
  });

  it("normalizes bare relative post paths", () => {
    expect(rewriteUniversalPath("post/abc")).toBe("/post/abc");
    expect(rewriteUniversalPath("p/abc")).toBe("/post/abc");
  });

  it("returns the original path for foreign hosts and unknown routes", () => {
    expect(rewriteUniversalPath("https://evil.example/p/abc")).toBe("https://evil.example/p/abc");
    expect(rewriteUniversalPath("https://titan.example/about")).toBe(
      "https://titan.example/about",
    );
    expect(rewriteUniversalPath("https://titan.example/p/")).toBe("https://titan.example/p/");
  });

  it("returns the original value for empty/garbage input", () => {
    expect(rewriteUniversalPath("")).toBe("");
    expect(rewriteUniversalPath("https://")).toBe("https://");
  });
});
