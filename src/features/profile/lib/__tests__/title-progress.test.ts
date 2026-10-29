/**
 * Tests for the Q7 title-progress helpers (PF4.2).
 */

import {
  isTitleSwitched,
  titleAccessibilityLabel,
  titleProgress,
  titleProgressSnapped,
} from "../title-progress";

const range = { start: 200, end: 300 };

describe("titleProgress", () => {
  it("clamps to 0 before the range and 1 after it", () => {
    expect(titleProgress(0, range)).toBe(0);
    expect(titleProgress(199, range)).toBe(0);
    expect(titleProgress(300, range)).toBe(1);
    expect(titleProgress(900, range)).toBe(1);
  });

  it("interpolates across the range", () => {
    expect(titleProgress(250, range)).toBe(0.5);
    expect(titleProgress(225, range)).toBeCloseTo(0.25);
  });

  it("treats pull-to-refresh overscroll as 0", () => {
    expect(titleProgress(-120, range)).toBe(0);
  });

  it("fails closed for degenerate or measured-late ranges", () => {
    const inverted = { start: 300, end: 200 };
    expect(titleProgress(250, inverted)).toBe(0);
    expect(titleProgress(350, inverted)).toBe(0);
    const unmeasured = { start: Number.POSITIVE_INFINITY, end: Number.POSITIVE_INFINITY };
    expect(titleProgress(500, unmeasured)).toBe(0);
  });
});

describe("titleProgressSnapped", () => {
  it("snaps at the end threshold for reduce motion", () => {
    expect(titleProgressSnapped(299, range)).toBe(0);
    expect(titleProgressSnapped(300, range)).toBe(1);
    expect(titleProgressSnapped(-10, range)).toBe(0);
  });
});

describe("title labels", () => {
  it("switches label at the crossfade midpoint", () => {
    expect(isTitleSwitched(0.49)).toBe(false);
    expect(isTitleSwitched(0.5)).toBe(true);
    expect(titleAccessibilityLabel(false, "ava", "Ava Stone")).toBe("@ava");
    expect(titleAccessibilityLabel(true, "ava", "Ava Stone")).toBe("Ava Stone");
  });
});
