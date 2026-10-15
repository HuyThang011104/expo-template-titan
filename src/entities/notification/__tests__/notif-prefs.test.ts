/**
 * Tests for G2.3 notification prefs (mock-backed).
 *
 * - Defaults are all-on; parse rejects bad shapes without throwing.
 * - `like` off hides `like` notices but `follow` notices stay (acceptance).
 * - Validation errors throw before any network call; failures roll back.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { fetchNotificationsPageWire } from "../api";
import { fetchNotifPrefs, updateNotifPrefsRemote } from "../api-prefs";
import { getNotifPrefs, updateNotifPref } from "../prefs-cache";
import { DEFAULT_NOTIF_PREFS } from "../prefs";
import { parseNotifPrefs, parseUpdateNotifPrefsInput } from "../prefs-schema";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    fetch: () => fetchNotifPrefs({ fetchImpl }),
    update: (patch: Parameters<typeof updateNotifPrefsRemote>[0]) =>
      updateNotifPrefsRemote(patch, { fetchImpl }),
  };
}

async function allKinds(fetchImpl: typeof fetch): Promise<string[]> {
  const kinds: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const wire = await fetchNotificationsPageWire(cursor, { fetchImpl });
    if (!wire) break;
    for (const item of wire.items) {
      if (item !== null && typeof item === "object" && "kind" in item) {
        kinds.push(String((item as { kind: unknown }).kind));
      }
    }
    cursor = wire.nextCursor;
    if (!cursor) break;
  }
  return kinds;
}

describe("notif prefs schema", () => {
  it("accepts a full prefs object and rejects partial shapes", () => {
    expect(parseNotifPrefs({ ...DEFAULT_NOTIF_PREFS })).toEqual(DEFAULT_NOTIF_PREFS);
    expect(parseNotifPrefs({ like: true })).toBeNull();
    expect(parseNotifPrefs(null)).toBeNull();
  });

  it("accepts a one-key patch and rejects empty input", () => {
    expect(parseUpdateNotifPrefsInput({ like: false })).toEqual({ like: false });
    expect(parseUpdateNotifPrefsInput({})).toBeNull();
    expect(parseUpdateNotifPrefsInput({ like: "no" })).toBeNull();
  });
});

describe("notif prefs cache (G2.3 acceptance)", () => {
  it("defaults to all-on and like-off keeps follow notices", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    expect(getNotifPrefs(qc)).toEqual(DEFAULT_NOTIF_PREFS);
    const fetched = await remote.fetch();
    expect(fetched).toEqual(DEFAULT_NOTIF_PREFS);

    await updateNotifPref(qc, "like", false, { updateRemote: remote.update });
    expect(getNotifPrefs(qc).like).toBe(false);

    const kinds = await allKinds(fetchImpl);
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds).not.toContain("like");
    expect(kinds).toContain("follow");

    // Restore for later tests in this file (mock state is per-file).
    await updateNotifPref(qc, "like", true, { updateRemote: remote.update });
    expect(getNotifPrefs(qc).like).toBe(true);
  });

  it("throws on invalid input without calling the server", async () => {
    const qc = createQueryClient();
    let calls = 0;
    const counting = async (patch: Parameters<typeof updateNotifPrefsRemote>[0]) => {
      calls += 1;
      return updateNotifPrefsRemote(patch, { fetchImpl: createMockFetch({ delayMs: 0 }) });
    };
    // Forced through the validator via a bad key type.
    await expect(
      updateNotifPref(qc, "like", "yes" as unknown as boolean, { updateRemote: counting }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it("rolls back when the server rejects", async () => {
    const qc = createQueryClient();
    const before = getNotifPrefs(qc);
    await expect(
      updateNotifPref(qc, "like", false, { updateRemote: async () => null }),
    ).rejects.toThrow();
    expect(getNotifPrefs(qc)).toEqual(before);
  });
});
