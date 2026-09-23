import { formatCompact } from "../number";

describe("formatCompact", () => {
  it("formats millions with one decimal", () => {
    expect(formatCompact(1_400_000)).toBe("1.4M");
  });

  it("trims trailing .0 for round thousands", () => {
    expect(formatCompact(38_000)).toBe("38k");
  });

  it("keeps decimals for fractional thousands", () => {
    expect(formatCompact(1_200)).toBe("1.2k");
  });

  it("returns small numbers as-is", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(0)).toBe("0");
  });

  it("handles negatives and non-finite input", () => {
    expect(formatCompact(-2_500)).toBe("-2.5k");
    expect(formatCompact(Number.NaN)).toBe("");
    expect(formatCompact(Number.POSITIVE_INFINITY)).toBe("");
  });
});
