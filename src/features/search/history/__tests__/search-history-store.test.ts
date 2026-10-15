/**
 * Tests for G2.2 search history store (kv-backed, per user).
 *
 * - Record dedupes case-insensitively, most-recent-first, capped at 20.
 * - Remove-one + clear-all work; users are isolated; corrupt JSON resets.
 */

import { deleteKvItem, setKvItem } from "../../../../shared/storage/kv";
import {
  clearSearchHistory,
  loadSearchHistory,
  recordSearchHistory,
  removeSearchHistoryItem,
  searchHistoryKey,
} from "../search-history-store";

const USER_A = "u-history-a";
const USER_B = "u-history-b";

beforeEach(() => {
  deleteKvItem(searchHistoryKey(USER_A));
  deleteKvItem(searchHistoryKey(USER_B));
});

describe("search history store", () => {
  it("records most-recent-first and dedupes case-insensitively", () => {
    recordSearchHistory(USER_A, "  Ava  ");
    recordSearchHistory(USER_A, "tech");
    recordSearchHistory(USER_A, "AVA");
    expect(loadSearchHistory(USER_A)).toEqual(["AVA", "tech"]);
  });

  it("ignores empty queries", () => {
    recordSearchHistory(USER_A, "   ");
    expect(loadSearchHistory(USER_A)).toEqual([]);
  });

  it("caps at 20 entries", () => {
    for (let i = 0; i < 25; i++) recordSearchHistory(USER_A, `q-${i}`);
    const history = loadSearchHistory(USER_A);
    expect(history).toHaveLength(20);
    expect(history[0]).toBe("q-24");
  });

  it("removes one entry and clears all", () => {
    recordSearchHistory(USER_A, "ava");
    recordSearchHistory(USER_A, "tech");
    expect(removeSearchHistoryItem(USER_A, "AVA")).toEqual(["tech"]);
    recordSearchHistory(USER_A, "food");
    clearSearchHistory(USER_A);
    expect(loadSearchHistory(USER_A)).toEqual([]);
  });

  it("isolates users and resets corrupt JSON", () => {
    recordSearchHistory(USER_A, "ava");
    expect(loadSearchHistory(USER_B)).toEqual([]);
    setKvItem(searchHistoryKey(USER_B), "not-json{{{");
    expect(loadSearchHistory(USER_B)).toEqual([]);
  });
});
