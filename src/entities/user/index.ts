/**
 * Public API for `entities/user`.
 *
 * Outside code must import from here only — no deep imports.
 * Does not export: raw schema, `__fixtures__`.
 */

export type { User, UserId } from "./model";
// Parses wire users; raw zod schema stays private (mirrors entities/post).
export { parseUser } from "./schema";
export {
  fetchMe,
  fetchUser,
  fetchUserByHandle,
  type FetchOptions as UserFetchOptions,
} from "./api";
export {
  getUserByHandleData,
  getUserData,
  hydrateUser,
  setUser,
  setUserByHandle,
} from "./cache";
export {
  useMe,
  useUser,
  useUserByHandle,
  type QueryFetchOptions as UseUserOptions,
} from "./queries";
export { Avatar, type AvatarProps, type AvatarSize } from "./ui/avatar";
export { UserRow, type UserRowProps } from "./ui/user-row";
// Safety relationship (F6 moderation); raw zod schema stays private.
export type { Relationship } from "./relationship";
export { parseRelationship } from "./relationship-schema";
export {
  blockUserRemote,
  fetchRelationship,
  muteUserRemote,
  unblockUserRemote,
  unmuteUserRemote,
  type RelationshipFetchOptions,
} from "./api-relationship";
export {
  blockUser,
  defaultRelationship,
  getRelationship,
  invalidateVisibleLists,
  isBlockedByMe,
  isMutedByMe,
  muteUser,
  setRelationship,
  unblockUser,
  unmuteUser,
  type SafetyActionOptions,
  type SafetyRemoteFn,
} from "./relationship-cache";
