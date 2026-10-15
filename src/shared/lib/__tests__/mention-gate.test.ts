/**
 * Tests for the G2.3 mention gate helper (pure, no entities).
 */

import { findBlockedMentionHandles } from "../mention-gate";

describe("findBlockedMentionHandles", () => {
  it("returns handles whose target disallows tagging, deduped", () => {
    const blocked = findBlockedMentionHandles(
      ["Ava", "ava", "Liam", "ghost"],
      (handle) => (handle.toLowerCase() === "ghost" ? undefined : `id-${handle.toLowerCase()}`),
      (targetId) => targetId !== "id-ava",
    );
    expect(blocked).toEqual(["Ava"]);
  });

  it("returns [] when everyone allows", () => {
    expect(findBlockedMentionHandles(["ava"], () => "u-1", () => true)).toEqual([]);
  });
});
