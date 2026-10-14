/**
 * Tests for G1.1 follow cache: optimistic follow/unfollow with
 * server-wins, private `requested`, rollback on unknown users,
 * approve/reject requests, list remotes, and post gating.
 *
 * NOTE: the mock backend holds module-level follow pairs, so tests in this
 * file run in order and use distinct targets where mutation would leak.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import {
  approveFollowRequestRemote,
  fetchRelationship,
  followUserRemote,
  rejectFollowRequestRemote,
  unfollowUserRemote,
} from "../api-relationship";
import { fetchFollowersRemote, fetchFollowingRemote, fetchFollowRequestsRemote } from "../api-follow";
import {
  approveFollowRequest,
  canViewPosts,
  followUser,
  getFollowStatus,
  getRelationship,
  getViewBlockReason,
  rejectFollowRequest,
  setRelationship,
  unfollowUser,
} from "../relationship-cache";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    follow: (id: string) => followUserRemote(id, { fetchImpl }),
    unfollow: (id: string) => unfollowUserRemote(id, { fetchImpl }),
    approve: (id: string) => approveFollowRequestRemote(id, { fetchImpl }),
    reject: (id: string) => rejectFollowRequestRemote(id, { fetchImpl }),
    relationship: (id: string) => fetchRelationship(id, { fetchImpl }),
  };
}

describe("follow cache", () => {
  it("follow flips to following and bumps the follower count", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const before = (await remote.relationship("u-feed-7"))?.followersCount ?? -1;

    await followUser(qc, "u-feed-7", { remote: remote.follow });

    expect(getFollowStatus(qc, "u-feed-7")).toBe("following");
    expect(getRelationship(qc, "u-feed-7").followersCount).toBe(before + 1);

    await unfollowUser(qc, "u-feed-7", { remote: remote.unfollow });

    expect(getFollowStatus(qc, "u-feed-7")).toBe("none");
    expect(getRelationship(qc, "u-feed-7").followersCount).toBe(before);
  });

  it("follow on a private user returns requested and keeps posts gated", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    await followUser(qc, "u-feed-5", { remote: remote.follow });

    const rel = getRelationship(qc, "u-feed-5");
    expect(rel.followStatus).toBe("requested");
    expect(rel.isPrivate).toBe(true);
    expect(canViewPosts(qc, "u-feed-5", "u-1")).toBe(false);
    expect(getViewBlockReason(qc, "u-feed-5", "u-1")).toBe("private");
  });

  it("rolls back and throws for unknown users (mock 404)", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    await expect(followUser(qc, "nope", { remote: remote.follow })).rejects.toThrow();

    expect(getFollowStatus(qc, "nope")).toBe("none");
  });

  it("approve moves a seeded request into the followers list", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const requestsBefore = await fetchFollowRequestsRemote(null, { fetchImpl });
    expect(requestsBefore?.users.map((user) => user.id)).toContain("u-feed-3");

    await approveFollowRequest(qc, "u-feed-3", { remote: remote.approve });

    const requestsAfter = await fetchFollowRequestsRemote(null, { fetchImpl });
    expect(requestsAfter?.users.map((user) => user.id)).not.toContain("u-feed-3");

    const followers = await fetchFollowersRemote("u-1", null, { fetchImpl });
    expect(followers?.users.map((user) => user.id)).toContain("u-feed-3");
  });

  it("approve/reject throw for unknown users so the UI can retry", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    await expect(approveFollowRequest(qc, "nope", { remote: remote.approve })).rejects.toThrow();
    await expect(rejectFollowRequest(qc, "nope", { remote: remote.reject })).rejects.toThrow();
  });

  it("lists seeded followers/following with pagination shape", async () => {
    const fetchImpl = createMockFetch({ delayMs: 0 });

    const followers = await fetchFollowersRemote("u-2", null, { fetchImpl });
    expect(followers?.users.map((user) => user.id)).toEqual(["u-feed-3", "u-feed-4"]);
    expect(followers?.nextCursor).toBeNull();

    const following = await fetchFollowingRemote("u-2", null, { fetchImpl });
    expect(following?.users.map((user) => user.id)).toContain("u-1");
  });
});

describe("post gating", () => {
  it("hides private posts until following, and reverse-blocked posts always", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    // Seed the canonical entries from the mock (Ella private, Lucas blocked me).
    const ella = await remote.relationship("u-feed-5");
    const lucas = await remote.relationship("u-feed-6");
    const liam = await remote.relationship("u-2");
    if (!ella || !lucas || !liam) throw new Error("setup failed: missing relationships");
    setRelationship(qc, ella);
    setRelationship(qc, lucas);
    setRelationship(qc, liam);

    expect(ella.isPrivate).toBe(true);
    expect(canViewPosts(qc, "u-feed-5", "u-1")).toBe(false);
    expect(lucas.blockedByTarget).toBe(true);
    expect(canViewPosts(qc, "u-feed-6", "u-1")).toBe(false);
    expect(getViewBlockReason(qc, "u-feed-6", "u-1")).toBe("blocked");

    // Public users stay visible, and I always see my own posts.
    expect(canViewPosts(qc, "u-2", "u-1")).toBe(true);
    expect(canViewPosts(qc, "u-1", "u-1")).toBe(true);
  });
});
