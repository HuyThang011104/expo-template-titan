/**
 * Tests for the F1.2 draft shape (text + local uris, debounced save).
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { COMPOSER_DRAFT_KEY, useComposerDraft } from "../use-composer-draft";

const mockStore = new Map<string, string>();
const mockSaveDraft = jest.fn(async (key: string, value: string) => {
  mockStore.set(key, value);
});
const mockLoadDraft = jest.fn(async (key: string) => mockStore.get(key) ?? null);
const mockDeleteDraft = jest.fn(async (key: string) => {
  mockStore.delete(key);
});

jest.mock("@/shared/storage/db/drafts", () => ({
  saveDraft: (...args: [string, string]) => mockSaveDraft(...args),
  loadDraft: (...args: [string]) => mockLoadDraft(...args),
  deleteDraft: (...args: [string]) => mockDeleteDraft(...args),
}));

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe("useComposerDraft", () => {
  it("loads text + uris and clears both", async () => {
    mockStore.set(
      COMPOSER_DRAFT_KEY,
      JSON.stringify({ body: "hello", localUris: ["file:///a.jpg"] }),
    );
    const { result } = await renderHook(() => useComposerDraft());
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.body).toBe("hello");
    expect(result.current.localUris).toEqual(["file:///a.jpg"]);

    await act(async () => {
      await result.current.clear();
    });
    expect(result.current.body).toBe("");
    expect(result.current.localUris).toEqual([]);
    expect(mockDeleteDraft).toHaveBeenCalledWith(COMPOSER_DRAFT_KEY);
  });

  it("debounces a single save carrying body + uris", async () => {
    const { result } = await renderHook(() => useComposerDraft());
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    act(() => {
      result.current.setBody("draft text");
      result.current.setLocalUris(["file:///a.jpg"]);
    });
    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });
    const payload = JSON.parse(mockSaveDraft.mock.calls[0]?.[1] ?? "{}") as {
      body: string;
      localUris: string[];
    };
    expect(payload).toEqual({ body: "draft text", localUris: ["file:///a.jpg"] });
  });
});
