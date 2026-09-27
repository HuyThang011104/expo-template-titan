// Public API for `features/search`.
// Routes must import from here only — no deep imports.
export { SearchScreen } from "./screens/search-screen";
export {
  fetchSearchPage,
  normalizeSearchQuery,
  useSearch,
  type SearchFetchOptions,
  type SearchPage,
} from "./queries/use-search";
