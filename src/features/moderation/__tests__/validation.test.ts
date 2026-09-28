/**
 * Tests for F6.1 report validation (inline UI messages, no throw).
 */

import { validateReportInput } from "../validation";

describe("validateReportInput", () => {
  it("accepts a full post report", () => {
    const result = validateReportInput({
      targetType: "post",
      targetId: "feed-p-1",
      reason: "spam",
      details: "Repeated promo links.",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        targetType: "post",
        targetId: "feed-p-1",
        reason: "spam",
        details: "Repeated promo links.",
      },
    });
  });

  it("accepts a user report without details", () => {
    const result = validateReportInput({
      targetType: "user",
      targetId: "u-2",
      reason: "harassment",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing reason", () => {
    const result = validateReportInput({
      targetType: "post",
      targetId: "feed-p-1",
      reason: null,
    });
    expect(result).toEqual({ ok: false, error: "Choose a reason for your report." });
  });

  it("rejects a missing target", () => {
    expect(
      validateReportInput({ targetType: "post", targetId: "  ", reason: "spam" }),
    ).toEqual({ ok: false, error: "Missing report target." });
    expect(
      validateReportInput({ targetType: "video", targetId: "x", reason: "spam" }),
    ).toEqual({ ok: false, error: "Missing report target." });
  });

  it("rejects details over 500 chars", () => {
    const result = validateReportInput({
      targetType: "user",
      targetId: "u-2",
      reason: "other",
      details: "x".repeat(501),
    });
    expect(result.ok).toBe(false);
  });
});
