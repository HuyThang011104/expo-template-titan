/**
 * Tests for the G1.5 rich-text parser (pure function).
 */

import { parseRichText } from "../rich-text";

describe("parseRichText", () => {
  it("returns plain text untouched", () => {
    expect(parseRichText("Just a normal post.")).toEqual([
      { kind: "text", text: "Just a normal post." },
    ]);
  });

  it("splits mentions, hashtags, and links in order", () => {
    expect(parseRichText("Hi @ava, see #travel https://titan.example/p/1!")).toEqual([
      { kind: "text", text: "Hi " },
      { kind: "mention", handle: "ava", text: "@ava" },
      { kind: "text", text: ", see " },
      { kind: "hashtag", tag: "travel", text: "#travel" },
      { kind: "text", text: " " },
      { kind: "link", url: "https://titan.example/p/1", text: "https://titan.example/p/1" },
      { kind: "text", text: "!" },
    ]);
  });

  it("never links feed counters, emails, or C#", () => {
    const kinds = parseRichText("Feed post #8 — mail a@b.com, C#dev rocks").map((s) => s.kind);
    expect(kinds).toEqual(["text"]);
  });

  it("strips trailing punctuation off links", () => {
    const segments = parseRichText("See (https://x.co/a).");
    expect(segments).toEqual([
      { kind: "text", text: "See (" },
      { kind: "link", url: "https://x.co/a", text: "https://x.co/a" },
      { kind: "text", text: ")." },
    ]);
  });

  it("keeps a bare scheme as text", () => {
    // No token at all: the whole body stays one text segment.
    expect(parseRichText("go to https:// now")).toEqual([
      { kind: "text", text: "go to https:// now" },
    ]);
  });
});
