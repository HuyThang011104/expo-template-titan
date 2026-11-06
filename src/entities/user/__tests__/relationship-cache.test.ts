/**
 * Tests for F6.0 relationship cache: defaults, optimistic
 * block/mute with server-wins, and rollback on unknown users.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { blockUserRemote, muteUserRemote, unblockUserRemote } from "../api-relationship";
import {
  blockUser,
  getRelationship,
  isBlockedByMe,
  isMutedByMe,
  muteUser,
  unblockUser,
} from "../relationship-cache";

describe("relationship cache", () => {
  it("defaults unknown users to unblocked/unmuted", () => {
    const qc = createQueryClient();
    expect(isBlockedByMe(qc, "u-1")).toBe(false);
    expect(isMutedByMe(qc, "u-1")).toBe(false);
    expect(getRelationship(qc, "u-1").userId).toBe("u-1");
  });

  it("blockUser flips blocked and keeps the server response", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });

    await blockUser(qc, "u-2", {
      remote: (userId) => blockUserRemote(userId, { fetchImpl }),
    });

    expect(isBlockedByMe(qc, "u-2")).toBe(true);
    expect(isMutedByMe(qc, "u-2")).toBe(false);

    await unblockUser(qc, "u-2", {
      remote: (userId) => unblockUserRemote(userId, { fetchImpl }),
    });
    expect(isBlockedByMe(qc, "u-2")).toBe(false);
  });

  it("muteUser flips muted and keeps the server response", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });

    await muteUser(qc, "u-feed-3", {
      remote: (userId) => muteUserRemote(userId, { fetchImpl }),
    });

    expect(isMutedByMe(qc, "u-feed-3")).toBe(true);
    expect(isBlockedByMe(qc, "u-feed-3")).toBe(false);
  });

  it("rolls back for unknown users (mock 404)", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });

    await blockUser(qc, "nope", {
      remote: (userId) => blockUserRemote(userId, { fetchImpl }),
    });

    expect(isBlockedByMe(qc, "nope")).toBe(false);
  });
});
