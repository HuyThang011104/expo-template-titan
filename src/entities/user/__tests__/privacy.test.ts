/**
 * Tests for G2.3 privacy settings (mock-backed) + enforcement helpers.
 *
 * - Parse accepts full settings, rejects bad enums; empty patch → null.
 * - `postVisibility: followers` flips the mock relationship to private.
 * - `canMessageTarget`/`canTagUser`: everyone/following/none + self + safety.
 * - List filters drop hidden ids and keep the rest.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { updatePrivacyRemote } from "../api-privacy";
import { mockUser1 } from "../__fixtures__";
import { getUserData, setUser } from "../cache";
import {
  canMessageTarget,
  canTagUser,
  filterVisiblePostIds,
  filterVisibleUserIds,
  isHiddenBySafety,
  isPostVisibleToViewer,
  updatePrivacy,
} from "../privacy-cache";
import { blockUserRemote, fetchRelationship, unblockUserRemote } from "../api-relationship";
import { blockUser, setRelationship, unblockUser } from "../relationship-cache";
import { DEFAULT_PRIVACY_SETTINGS } from "../model";
import { parsePrivacySettings, parseUpdatePrivacyInput } from "../schema";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    update: (payload: Parameters<typeof updatePrivacyRemote>[0]) =>
      updatePrivacyRemote(payload, { fetchImpl }),
    relationship: (id: string) => fetchRelationship(id, { fetchImpl }),
  };
}

describe("privacy schema", () => {
  it("accepts full settings and rejects bad enums", () => {
    expect(parsePrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS })).toEqual(
      DEFAULT_PRIVACY_SETTINGS,
    );
    expect(
      parsePrivacySettings({ messageAudience: "carrier-pigeon", postVisibility: "public", tagAudience: "everyone" }),
    ).toBeNull();
  });

  it("rejects empty patches", () => {
    expect(parseUpdatePrivacyInput({ postVisibility: "followers" })).toEqual({
      postVisibility: "followers",
    });
    expect(parseUpdatePrivacyInput({})).toBeNull();
    expect(parseUpdatePrivacyInput({ postVisibility: "friends-only" })).toBeNull();
  });
});

describe("updatePrivacy (mock-backed)", () => {
  it("flips followers-only and restores public", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);
    setUser(qc, { ...mockUser1 });

    const updated = await updatePrivacy(qc, { postVisibility: "followers" }, { updateRemote: remote.update });
    expect(updated.privacySettings.postVisibility).toBe("followers");
    expect(getUserData(qc, "u-1")?.privacySettings.postVisibility).toBe("followers");

    const rel = await remote.relationship("u-1");
    expect(rel?.isPrivate).toBe(true);

    await updatePrivacy(qc, { postVisibility: "public" }, { updateRemote: remote.update });
    expect(getUserData(qc, "u-1")?.privacySettings.postVisibility).toBe("public");
  });

  it("throws on empty input without calling the server", async () => {
    const qc = createQueryClient();
    let calls = 0;
    await expect(
      updatePrivacy(qc, {}, {
        updateRemote: async (payload) => {
          calls += 1;
          return updatePrivacyRemote(payload, { fetchImpl: createMockFetch({ delayMs: 0 }) });
        },
      }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
});

describe("privacy enforcement helpers", () => {
  function seeded() {
    const qc = createQueryClient();
    setUser(qc, { ...mockUser1 });
    setUser(qc, {
      ...mockUser1,
      id: "u-target",
      handle: "target",
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
    });
    qc.setQueryData(queryKeys.me, { ...mockUser1 });
    return qc;
  }

  it("message/tag audience matrix", () => {
    const qc = seeded();
    // everyone → open
    expect(canMessageTarget(qc, "u-target", "u-1")).toBe(true);
    expect(canTagUser(qc, "u-target", "u-1")).toBe(true);
    // self → always
    expect(canMessageTarget(qc, "u-1", "u-1")).toBe(true);
    // unknown target → fail open
    expect(canTagUser(qc, "ghost", "u-1")).toBe(true);
  });

  it("none blocks non-self", () => {
    const qc = seeded();
    const target = getUserData(qc, "u-target");
    if (!target) throw new Error("setup failed");
    setUser(qc, {
      ...target,
      privacySettings: { messageAudience: "none", postVisibility: "public", tagAudience: "none" },
    });
    expect(canMessageTarget(qc, "u-target", "u-1")).toBe(false);
    expect(canTagUser(qc, "u-target", "u-1")).toBe(false);
    expect(canMessageTarget(qc, "u-target", "u-target")).toBe(true);
  });

  it("following requires an outgoing follow", () => {
    const qc = seeded();
    const target = getUserData(qc, "u-target");
    if (!target) throw new Error("setup failed");
    setUser(qc, {
      ...target,
      privacySettings: {
        messageAudience: "following",
        postVisibility: "public",
        tagAudience: "following",
      },
    });
    expect(canMessageTarget(qc, "u-target", "u-1")).toBe(false);
    expect(canTagUser(qc, "u-target", "u-1")).toBe(false);
    setRelationship(qc, {
      userId: "u-target",
      blockedByMe: false,
      mutedByMe: false,
      followStatus: "following",
      followersCount: 0,
      followingCount: 0,
      isPrivate: false,
      blockedByTarget: false,
      updatedAt: new Date().toISOString(),
    });
    expect(canMessageTarget(qc, "u-target", "u-1")).toBe(true);
    expect(canTagUser(qc, "u-target", "u-1")).toBe(true);
  });

  it("safety hides everywhere (lists + posts)", async () => {
    const qc = seeded();
    // NOTE: the mock only knows fixture ids — use noah (u-feed-4) for remote.
    setUser(qc, {
      ...mockUser1,
      id: "u-feed-4",
      handle: "noah",
      displayName: "Noah Kim",
    });
    const fetchImpl = createMockFetch({ delayMs: 0 });
    await blockUser(qc, "u-feed-4", {
      remote: (id) => blockUserRemote(id, { fetchImpl }),
    });
    expect(isHiddenBySafety(qc, "u-feed-4")).toBe(true);
    expect(isPostVisibleToViewer(qc, "u-feed-4", "u-1")).toBe(false);
    expect(canMessageTarget(qc, "u-feed-4", "u-1")).toBe(false);
    expect(canTagUser(qc, "u-feed-4", "u-1")).toBe(false);
    expect(filterVisibleUserIds(qc, ["u-feed-4", "u-1"])).toEqual(["u-1"]);
    expect(
      filterVisiblePostIds(
        qc,
        ["p-a", "p-b"],
        (id) => (id === "p-a" ? "u-feed-4" : "u-1"),
        "u-1",
      ),
    ).toEqual(["p-b"]);
    // Cleanup within this file (mock state is per-file).
    await unblockUser(qc, "u-feed-4", {
      remote: (id) => unblockUserRemote(id, { fetchImpl }),
    });
    expect(isHiddenBySafety(qc, "u-feed-4")).toBe(false);
  });
});
