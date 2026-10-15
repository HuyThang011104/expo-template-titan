// Public API for `features/search`.
// Routes must import from here only — no deep imports.
export { HashtagScreen } from "./screens/hashtag-screen";
export { SearchScreen } from "./screens/search-screen";
export {
  fetchHashtagPage,
  normalizeHashtag,
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
