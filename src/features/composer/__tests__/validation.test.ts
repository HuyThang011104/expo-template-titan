/**
 * Tests for F1.1 composer validation (text-only UI messages).
 */

import { COMPOSER_MAX_LENGTH, validateComposerBody, validateComposerInput } from "../validation";

describe("validateComposerBody", () => {
  it("accepts 1–280 chars and trims", () => {
    const result = validateComposerBody("  hello feed  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.body).toBe("hello feed");
      expect(result.value.mediaIds).toEqual([]);
    }
  });

  it("rejects empty/whitespace with an inline message", () => {
    const result = validateComposerBody("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("rejects overlong bodies", () => {
    const result = validateComposerBody("x".repeat(COMPOSER_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});

describe("validateComposerInput", () => {
  it("rejects more than 4 media ids", () => {
    const result = validateComposerInput("ok", ["1", "2", "3", "4", "5"]);
    expect(result.ok).toBe(false);
  });
});
