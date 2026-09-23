/**
 * Tests for `entities/user/schema`.
 *
 * - Valid fixtures parse; missing `handle` or bad `avatarUrl` return `null`.
 */

import { mockUser1 } from "../__fixtures__";
import { parseUser } from "../schema";

describe("parseUser", () => {
  it("accepts a valid user fixture", () => {
    expect(parseUser(mockUser1)).toEqual(mockUser1);
  });

  it("accepts null avatarUrl", () => {
    expect(parseUser({ ...mockUser1, avatarUrl: null })?.avatarUrl).toBeNull();
  });

  it("returns null when handle is missing (no throw)", () => {
    const { handle: _omitted, ...withoutHandle } = mockUser1;
    expect(parseUser(withoutHandle)).toBeNull();
  });

  it("returns null for a non-URL avatar (no throw)", () => {
    expect(parseUser({ ...mockUser1, avatarUrl: "not-a-url" })).toBeNull();
  });

  it("returns null for empty id", () => {
    expect(parseUser({ ...mockUser1, id: "" })).toBeNull();
  });
});
