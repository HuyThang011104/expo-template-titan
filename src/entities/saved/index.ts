/**
 * Public API for `entities/saved`.
 *
 * Outside code must import from here only — no deep imports.
 * All toggles must go through `setSaved`.
 * Does not export: raw schema.
 */

export type { SavedPostWireItem } from "./model";
export {
  fetchSavedPostsRemote,
  savePostRemote,
  unsavePostRemote,
  type FetchOptions as SavedFetchOptions,
  type SavedRemotePage,
} from "./api";
export { parseSavedPostWireItem } from "./schema";
export {
  getSavedIds,
  hydrateSavedItem,
  isSaved,
  setSaved,
  type SavedPostsPageShape,
  type SetSavedOptions,
  type SetSavedRemoteFn,
} from "./cache";
export {
  useIsSaved,
  useSavedPosts,
  useSetSaved,
  type QueryFetchOptions as UseSavedOptions,
  type SavedPostsPage,
} from "./queries";
export { SaveButton, type SaveButtonProps } from "./ui/save-button";
