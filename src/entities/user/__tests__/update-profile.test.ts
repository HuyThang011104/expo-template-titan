/**
 * Tests for G2.1 edit-profile cache (entity level, mock-backed).
 *
 * - Update overwrites every canonical copy (user(id) + me + handle) so
 *   header + search + comment + inbox follow with no list patching.
 * - Validation throws before any network call.
 * - Minimal author snapshots preserve bio/cover/link (no "chỗ cũ chỗ mới").
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { updateProfileRemote } from "../api";
import { getUserData, mergeAuthorSnapshot, updateProfile } from "../cache";
import { mockUser1 } from "../__fixtures__";

function remoteFor(fetchImpl: typeof fetch) {
  return (payload: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    link: string | null;
  }) => updateProfileRemote(payload, { fetchImpl });
}

describe("updateProfile", () => {
  it("overwrites user(id) + me + handle together", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    qc.setQueryData(queryKeys.me, mockUser1);
    qc.setQueryData(queryKeys.userByHandle("ava"), mockUser1);

    const updated = await updateProfile(
      qc,
      {
        displayName: "Ava Updated",
        bio: "New bio",
        avatarUrl: mockUser1.avatarUrl,
        coverUrl: mockUser1.coverUrl,
        link: "",
      },
      { updateRemote: remoteFor(fetchImpl) },
    );

    expect(updated.displayName).toBe("Ava Updated");
    expect(getUserData(qc, updated.id)?.displayName).toBe("Ava Updated");
    expect(qc.getQueryData(queryKeys.me)).toEqual(updated);
    expect(qc.getQueryData(queryKeys.userByHandle("ava"))).toEqual(updated);
  });

  it("throws on empty displayName without calling the server", async () => {
    const qc = createQueryClient();
    let calls = 0;
    const counting = async (
      payload: Parameters<typeof updateProfileRemote>[0],
    ) => {
      calls += 1;
      return updateProfileRemote(payload, { fetchImpl: createMockFetch({ delayMs: 0 }) });
    };

    await expect(
      updateProfile(
        qc,
        { displayName: "   ", bio: "", avatarUrl: null, coverUrl: null, link: "" },
        { updateRemote: counting },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it("mergeAuthorSnapshot preserves bio/cover/link", () => {
    const qc = createQueryClient();
    qc.setQueryData(queryKeys.user("u-1"), mockUser1);
    mergeAuthorSnapshot(qc, {
      id: "u-1",
      handle: "ava",
      displayName: "Ava Renamed",
      avatarUrl: mockUser1.avatarUrl,
    });
    expect(getUserData(qc, "u-1")).toEqual({
      ...mockUser1,
      displayName: "Ava Renamed",
    });
  });

  it("second merge keeps extended fields (cross-surface, no stale copy)", () => {
    const qc = createQueryClient();
    qc.setQueryData(queryKeys.user("u-1"), mockUser1);
    mergeAuthorSnapshot(qc, {
      id: "u-1",
      handle: "ava",
      displayName: "Ava Renamed",
      avatarUrl: mockUser1.avatarUrl,
    });
    expect(getUserData(qc, "u-1")?.bio).toBe(mockUser1.bio);
    expect(getUserData(qc, "u-1")?.coverUrl).toBe(mockUser1.coverUrl);
    expect(getUserData(qc, "u-1")?.displayName).toBe("Ava Renamed");
  });
});
