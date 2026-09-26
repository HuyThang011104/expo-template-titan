/**
 * Tests for F1.1 `useComposerCreatePost`:
 * - success prepends the feed (via the entity, no full invalidate)
 * - HTTP failure throws and does NOT prepend / enqueue
 * - NETWORK failure enqueues `post.create` once and reports `queued`
 */

import { act, renderHook } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getPostData } from "../../../../entities/post";
import { ApiError } from "../../../../shared/api/errors";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { deleteDraft } from "../../../../shared/storage/db/drafts";
import { enqueueOutboxJob } from "../../../../shared/storage/db/outbox";
import {
  COMPOSER_OUTBOX_KIND,
  useComposerCreatePost,
} from "../use-create-post";

jest.mock("../../../../shared/storage/db/drafts", () => ({
  deleteDraft: jest.fn(async () => {}),
  loadDraft: jest.fn(async () => null),
  saveDraft: jest.fn(async () => {}),
}));

jest.mock("../../../../shared/storage/db/outbox", () => ({
  enqueueOutboxJob: jest.fn(async () => "job-1"),
}));

const mockedDeleteDraft = deleteDraft as jest.Mock;
const mockedEnqueue = enqueueOutboxJob as jest.Mock;

function setup(fetchImpl: typeof fetch = createMockFetch({ delayMs: 0 })) {
  const qc = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, fetchImpl, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useComposerCreatePost", () => {
  it("posts text-only and prepends the canonical feed entry", async () => {
    const { wrapper, qc, fetchImpl } = setup();
    const { result } = await renderHook(() => useComposerCreatePost({ fetchImpl }), {
      wrapper,
    });

    let postId = "";
    await act(async () => {
      const out = await result.current.submit({ body: "hello F1.1", mediaIds: [] });
      if (out.status !== "posted") throw new Error("expected posted");
      postId = out.postId;
    });

    expect(postId.length).toBeGreaterThan(0);
    expect(getPostData(qc, postId)?.body).toBe("hello F1.1");
    const feed = qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.homeFeed());
    expect(feed?.pages[0]?.postIds[0]).toBe(postId);
    expect(mockedDeleteDraft).toHaveBeenCalled();
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("HTTP failure throws without prepend or enqueue", async () => {
    const failingFetch = createMockFetch({ delayMs: 0, routes: [] });
    const { wrapper, qc } = setup(failingFetch);
    const { result } = await renderHook(() => useComposerCreatePost({ fetchImpl: failingFetch }), {
      wrapper,
    });

    await act(async () => {
      await expect(result.current.submit({ body: "hello", mediaIds: [] })).rejects.toThrow();
    });

    expect(qc.getQueryData(queryKeys.homeFeed())).toBeUndefined();
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });

  it("NETWORK failure enqueues post.create once and reports queued", async () => {
    const offlineFetch = (async () => {
      throw new ApiError({ status: null, code: "NETWORK", url: "/posts", message: "offline" });
    }) as unknown as typeof fetch;
    const { wrapper } = setup(offlineFetch);
    const { result } = await renderHook(() => useComposerCreatePost({ fetchImpl: offlineFetch }), {
      wrapper,
    });

    let status = "";
    await act(async () => {
      const out = await result.current.submit({ body: "offline post", mediaIds: [] });
      status = out.status;
    });

    expect(status).toBe("queued");
    expect(mockedEnqueue).toHaveBeenCalledTimes(1);
    expect(mockedEnqueue).toHaveBeenCalledWith(
      COMPOSER_OUTBOX_KIND,
      expect.stringContaining("offline post"),
    );
  });
});
