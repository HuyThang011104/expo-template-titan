/**
 * Tests for F1.3 `post.create` drain:
 * - text-only + photo payloads post and prepend the home feed
 * - invalid payloads throw (worker retries, then dead-letters)
 * - unknown kinds resolve without sending (no head-of-line block)
 * - full `drainOutbox` pass sends once; a second pass sends nothing (no double-post)
 */

import type { InfiniteData } from "@tanstack/react-query";

import { getPostData } from "../../../entities/post";
import { createMockFetch } from "../../../shared/api/mock-handlers";
import { queryClient, queryKeys } from "../../../shared/query";
import { drainOutbox } from "../../../shared/storage/db/outbox-worker";
import { COMPOSER_OUTBOX_KIND } from "../mutations/use-create-post";
import {
  dispatchComposerOutboxJob,
  handlePostCreateJob,
  parsePostCreatePayload,
} from "../outbox-sender";

const mockFetchImpl = () => createMockFetch({ delayMs: 0 });

const mockGetDatabase = jest.fn();

jest.mock("../../../shared/storage/db/client", () => ({
  getDatabase: () => mockGetDatabase(),
}));

type FeedPage = { postIds: string[]; nextCursor: string | null };

function readFeedIds(): string[] {
  const data = queryClient.getQueryData<InfiniteData<FeedPage, string | null>>(
    queryKeys.homeFeed(),
  );
  return (data?.pages ?? []).flatMap((page) => page.postIds);
}

beforeEach(() => {
  queryClient.clear();
});

describe("parsePostCreatePayload", () => {
  it("accepts a valid payload with trimmed body", () => {
    expect(
      parsePostCreatePayload(JSON.stringify({ body: "  hi  ", localUris: ["file:///a.jpg"] })),
    ).toEqual({ body: "hi", localUris: ["file:///a.jpg"] });
  });

  it("throws on non-JSON, bad shape, bad body, and >4 uris", () => {
    expect(() => parsePostCreatePayload("nope")).toThrow();
    expect(() => parsePostCreatePayload(JSON.stringify(null))).toThrow();
    expect(() => parsePostCreatePayload(JSON.stringify({ body: "   ", localUris: [] }))).toThrow();
    expect(() =>
      parsePostCreatePayload(JSON.stringify({ body: "ok", localUris: ["1", "2", "3", "4", "5"] })),
    ).toThrow();
    expect(() =>
      parsePostCreatePayload(JSON.stringify({ body: "ok", localUris: [42] })),
    ).toThrow();
  });
});

describe("handlePostCreateJob", () => {
  it("posts text-only and prepends the feed", async () => {
    await handlePostCreateJob(JSON.stringify({ body: "drained post", localUris: [] }), {
      fetchImpl: mockFetchImpl(),
    });
    const ids = readFeedIds();
    expect(ids).toHaveLength(1);
    expect(getPostData(queryClient, ids[0] ?? "")?.body).toBe("drained post");
  });

  it("re-uploads local uris before posting", async () => {
    await handlePostCreateJob(JSON.stringify({ body: "photo drain", localUris: ["file:///a.jpg"] }), {
      fetchImpl: mockFetchImpl(),
    });
    const ids = readFeedIds();
    expect(getPostData(queryClient, ids[0] ?? "")?.media).toHaveLength(1);
  });
});

describe("dispatchComposerOutboxJob", () => {
  it("drops unknown kinds without throwing", async () => {
    await expect(
      dispatchComposerOutboxJob({ kind: "chat.send", payload: "{}" }, { fetchImpl: mockFetchImpl() }),
    ).resolves.toBeUndefined();
    expect(readFeedIds()).toHaveLength(0);
  });
});

describe("drainOutbox with a post.create job", () => {
  type Row = {
    id: string;
    kind: string;
    payload: string;
    status: string;
    attempts: number;
    created_at: number;
    updated_at: number;
  };

  function makeFakeDb(seed: Row[]) {
    const rows = [...seed];
    return {
      runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
        if (sql.startsWith("DELETE FROM outbox WHERE id = ?")) {
          const index = rows.findIndex((row) => row.id === params[0]);
          if (index >= 0) rows.splice(index, 1);
          return;
        }
        if (sql.startsWith("UPDATE outbox SET status = ?")) {
          const row = rows.find((candidate) => candidate.id === params[3]);
          if (row) {
            row.status = params[0] as string;
            row.attempts = params[1] as number;
            row.updated_at = params[2] as number;
          }
        }
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("WHERE status = 'pending'")) {
          return rows
            .filter((row) => row.status === "pending")
            .sort((a, b) => a.created_at - b.created_at);
        }
        if (sql.startsWith("SELECT attempts FROM outbox")) return rows;
        return [];
      }),
    };
  }

  function seedRow(): Row {
    return {
      id: "job-1",
      kind: COMPOSER_OUTBOX_KIND,
      payload: JSON.stringify({ body: "queued while offline", localUris: [] }),
      status: "pending",
      attempts: 0,
      created_at: 1,
      updated_at: 1,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends once; the next pass sends nothing (no double-post)", async () => {
    mockGetDatabase.mockResolvedValue(makeFakeDb([seedRow()]));
    const fetchImpl = mockFetchImpl();
    const sender = (job: { kind: string; payload: string }) =>
      dispatchComposerOutboxJob(job, { fetchImpl });

    const first = await drainOutbox(sender);
    expect(first).toEqual({ sent: 1, retried: 0, dead: 0 });
    expect(readFeedIds()).toHaveLength(1);

    const second = await drainOutbox(sender);
    expect(second).toEqual({ sent: 0, retried: 0, dead: 0 });
    expect(readFeedIds()).toHaveLength(1);
  });
});
