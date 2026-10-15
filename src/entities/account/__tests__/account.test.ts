/**
 * Tests for G2.4 account flows (mock-backed).
 *
 * - Password validation rejects weak/same passwords before any network call.
 * - Sessions list, revoke (remote + unknown 404), deactivate, delete.
 * - Export carries my profile + my posts with an export timestamp.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import {
  changePasswordRemote,
  deactivateAccountRemote,
  deleteAccountRemote,
  exportMyDataRemote,
  fetchSessions,
  revokeSessionRemote,
} from "../api";
import { parseChangePasswordInput, parseExportData, parseSessionList } from "../schema";

function fetchImpl() {
  return createMockFetch({ delayMs: 0 });
}

describe("account schema", () => {
  it("validates password input", () => {
    expect(
      parseChangePasswordInput({ currentPassword: "old123", newPassword: "new12345" }),
    ).toEqual({ currentPassword: "old123", newPassword: "new12345" });
    expect(parseChangePasswordInput({ currentPassword: "x", newPassword: "short" })).toBeNull();
    expect(
      parseChangePasswordInput({ currentPassword: "same123", newPassword: "same123" }),
    ).toBeNull();
  });

  it("parses session lists leniently", () => {
    expect(parseSessionList([{ id: "bad" }])).toEqual([]);
    expect(parseSessionList("nope")).toEqual([]);
  });

  it("rejects bad export shapes", () => {
    expect(parseExportData(null)).toBeNull();
    expect(parseExportData({ profile: null, posts: [], exportedAt: "x" })).toBeNull();
  });
});

describe("account remotes (G2.4)", () => {
  it("changes password and rejects weak input (400)", async () => {
    const impl = fetchImpl();
    expect(await changePasswordRemote("old123", "brand-new-1", { fetchImpl: impl })).toBe(true);
    await expect(changePasswordRemote("old123", "tiny", { fetchImpl: impl })).rejects.toThrow();
  });

  it("lists sessions with a current device", async () => {
    const sessions = await fetchSessions({ fetchImpl: fetchImpl() });
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    expect(sessions.some((session) => session.current)).toBe(true);
  });

  it("revokes a remote session and 404s unknown ids", async () => {
    const impl = fetchImpl();
    const before = await fetchSessions({ fetchImpl: impl });
    const target = before.find((session) => !session.current);
    if (!target) throw new Error("setup failed: no remote session");
    const result = await revokeSessionRemote(target.id, { fetchImpl: impl });
    expect(result).toEqual({ ok: true, revokedCurrent: false });
    const after = await fetchSessions({ fetchImpl: impl });
    expect(after.some((session) => session.id === target.id)).toBe(false);
    await expect(revokeSessionRemote("sess-ghost", { fetchImpl: impl })).rejects.toThrow();
  });

  it("deactivates and deletes (mock ok)", async () => {
    const impl = fetchImpl();
    expect(await deactivateAccountRemote({ fetchImpl: impl })).toBe(true);
    expect(await deleteAccountRemote({ fetchImpl: impl })).toBe(true);
  });

  it("exports my profile + my posts", async () => {
    const data = await exportMyDataRemote({ fetchImpl: fetchImpl() });
    expect(data?.profile.id).toBe("u-1");
    expect(data?.profile.handle).toBe("ava");
    expect(data && data.posts.length).toBeGreaterThan(0);
    expect(data?.exportedAt).toContain("2026");
  });
});
