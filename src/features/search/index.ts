// Public API for `features/search`.
// Routes must import from here only — no deep imports.
export { HashtagScreen } from "./screens/hashtag-screen";
export { SearchScreen } from "./screens/search-screen";
export { HashtagHeader } from "./components/hashtag-header";
export { SearchHistoryList } from "./components/search-history-list";
export { TrendingList } from "./components/trending-list";
export {
  fetchHashtagPage,
  useHashtag,
  type HashtagFetchOptions,
  type HashtagPage,
} from "./queries/use-hashtag";
export {
  fetchSearchPage,
  normalizeSearchQuery,
  useSearch,
  type SearchFetchOptions,
  type SearchPage,
} from "./queries/use-search";
export {
  fetchTrending,
  useTrending,
  type TrendingData,
  type TrendingFetchOptions,
} from "./queries/use-trending";
export { useSearchHistory } from "./hooks/use-search-history";
export {
  clearSearchHistory,
  loadSearchHistory,
  recordSearchHistory,
  removeSearchHistoryItem,
  searchHistoryKey,
  SEARCH_HISTORY_MAX,
} from "./history/search-history-store";
export {
  normalizeHashtag,
  parseHashtagPage,
  parseTrendingPage,
  SEARCH_MIN_LENGTH,
  type HashtagInfo,
  type HashtagPageWire,
  type TrendingPageWire,
} from "./schema";
