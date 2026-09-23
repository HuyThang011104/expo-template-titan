import { formatRelative } from "../date";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function isoMinus(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

describe("formatRelative", () => {
  it("returns empty string and warns on invalid ISO", () => {
    expect(formatRelative("not-a-date", NOW)).toBe("");
  });

  it("reports just now for sub-minute diffs and future dates", () => {
    expect(formatRelative(isoMinus(30_000), NOW)).toBe("Just now");
    expect(formatRelative(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe(
      "Just now",
    );
  });

  it("reports minutes, hours and days", () => {
    expect(formatRelative(isoMinus(5 * 60_000), NOW)).toBe("5m ago");
    expect(formatRelative(isoMinus(3 * 3_600_000), NOW)).toBe("3h ago");
    expect(formatRelative(isoMinus(4 * 86_400_000), NOW)).toBe("4d ago");
  });

  it("falls back to dd/MM/yyyy after 30 days", () => {
    const d = new Date(NOW.getTime() - 40 * 86_400_000);
    const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
    const expected = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    expect(formatRelative(d.toISOString(), NOW)).toBe(expected);
    expect(expected).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
