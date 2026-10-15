/**
 * Tests for G2.3 block enforcement everywhere (mock-backed, single viewer).
 *
 * Blocking noah (u-feed-4) must hide him from feed + search + hashtag +
 * profile posts + comments at once ("không sót mặt"); unblocking restores.
 * Reads raw wire pages (no feature imports — boundary stays clean).
 */

import { client } from "../../../../shared/api/client";
import { endpoints } from "../../../../shared/api/endpoints";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { blockUserRemote, unblockUserRemote } from "../../../../entities/user";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

type WirePostItem = { post: { id: string; authorId: string }; author: { id: string } };
type WireCommentItem = { comment: { id: string; authorId: string }; author: { id: string } };

async function getWire<T>(path: string, fetchImpl: typeof fetch): Promise<T> {
  return client.get<T>(path, { fetchImpl });
}

async function allCommentAuthorIds(fetchImpl: typeof fetch): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 4; page++) {
    const data: { items: WireCommentItem[]; nextCursor: string | null } = await getWire(
      endpoints.postComments("feed-p-1", cursor),
      fetchImpl,
    );
    for (const item of data.items) ids.push(item.comment.authorId);
    cursor = data.nextCursor;
    if (!cursor) break;
  }
  return ids;
}

describe("block enforcement everywhere (G2.3)", () => {
  it("hides noah from feed/search/hashtag/profile/comments, then restores", async () => {
    const fetchImpl = createMockFetch({ delayMs: 0 });

    // Baseline: travel has 3 posts (2 by noah).
    const before = await getWire<{ items: WirePostItem[]; postCount: number }>(
      endpoints.hashtag("travel", null),
      fetchImpl,
    );
    expect(before.postCount).toBe(3);

    const blocked = await blockUserRemote("u-feed-4", { fetchImpl });
    expect(blocked?.blockedByMe).toBe(true);

    const feed = await getWire<{ items: WirePostItem[] }>(endpoints.homeFeed(), fetchImpl);
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.items.every((item) => item.post.authorId !== "u-feed-4")).toBe(true);

    const search = await getWire<{ users: { id: string }[]; items: WirePostItem[] }>(
      endpoints.search("noah", null),
      fetchImpl,
    );
    expect(search.users.some((user) => user.id === "u-feed-4")).toBe(false);
    expect(search.items.some((item) => item.post.authorId === "u-feed-4")).toBe(false);

    const tag = await getWire<{ items: WirePostItem[]; postCount: number }>(
      endpoints.hashtag("travel", null),
      fetchImpl,
    );
    expect(tag.postCount).toBe(1);
    expect(tag.items.every((item) => item.post.authorId !== "u-feed-4")).toBe(true);

    const profile = await getWire<{ items: WirePostItem[] }>(
      endpoints.userPosts("u-feed-4", null),
      fetchImpl,
    );
    expect(profile.items).toHaveLength(0);

    expect(await allCommentAuthorIds(fetchImpl)).not.toContain("u-feed-4");

    const unblocked = await unblockUserRemote("u-feed-4", { fetchImpl });
    expect(unblocked?.blockedByMe).toBe(false);

    const restored = await getWire<{ postCount: number }>(
      endpoints.hashtag("travel", null),
      fetchImpl,
    );
    expect(restored.postCount).toBe(3);
  });
});
