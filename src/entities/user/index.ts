/**
 * Public API for `entities/user`.
 *
 * Outside code must import from here only — no deep imports.
 * Does not export: raw schema, `__fixtures__`.
 */

export type {
  MessageAudience,
  PostVisibility,
  PrivacySettings,
  TagAudience,
  User,
  UserAuthorSnapshot,
  UserId,
} from "./model";
export { DEFAULT_PRIVACY_SETTINGS } from "./model";
// Parses wire users; raw zod schema stays private (mirrors entities/post).
export { parsePrivacySettings, parseUpdatePrivacyInput, parseUpdateProfileInput, parseUser } from "./schema";
export {
  fetchMe,
  fetchUser,
  fetchUserByHandle,
  updateProfileRemote,
  type FetchOptions as UserFetchOptions,
  type UpdateProfilePayload,
} from "./api";
export {
  getUserByHandleData,
  getUserData,
  hydrateUser,
  mergeAuthorSnapshot,
  setUser,
  setUserByHandle,
  setUserEverywhere,
  updateProfile,
} from "./cache";
export {
  updatePrivacyRemote,
  type UpdatePrivacyPayload,
} from "./api-privacy";
export {
  canMessageTarget,
  canTagUser,
  filterVisibleCommentIds,
  filterVisibleNotificationIds,
  filterVisiblePostIds,
  filterVisibleUserIds,
  isHiddenBySafety,
  isPostVisibleToViewer,
  updatePrivacy,
} from "./privacy-cache";
export {
  useApproveFollowRequest,
  useFollowers,
  useFollowing,
  useFollowRequests,
  useFollowUser,
  useMe,
  useRejectFollowRequest,
  useRelationship,
  useUnfollowUser,
  useUpdatePrivacy,
  useUpdateProfile,
  useUser,
  useUserByHandle,
  type FollowListPageShape,
  type QueryFetchOptions as UseUserOptions,
} from "./queries";
export { Avatar, type AvatarProps, type AvatarSize } from "./ui/avatar";
export { UserRow, type UserRowProps } from "./ui/user-row";
export { FollowButton, type FollowButtonProps } from "./ui/follow-button";
// Safety relationship (F6 moderation); raw zod schema stays private.
export type { FollowStatus, Relationship } from "./relationship";
export { parseRelationship } from "./relationship-schema";
export {
  approveFollowRequestRemote,
  blockUserRemote,
  fetchRelationship,
  followUserRemote,
  muteUserRemote,
  rejectFollowRequestRemote,
  unblockUserRemote,
  unfollowUserRemote,
  unmuteUserRemote,
  type RelationshipFetchOptions,
} from "./api-relationship";
export {
  fetchFollowersRemote,
  fetchFollowingRemote,
  fetchFollowRequestsRemote,
  type FollowListFetchOptions,
  type FollowListPage,
} from "./api-follow";
export {
  approveFollowRequest,
  blockUser,
  canViewPosts,
  defaultRelationship,
  followUser,
  getFollowStatus,
  getRelationship,
  getViewBlockReason,
  invalidateVisibleLists,
  isBlockedByMe,
  isMutedByMe,
  muteUser,
  rejectFollowRequest,
  setRelationship,
  unblockUser,
  unfollowUser,
  unmuteUser,
  type FollowActionOptions,
  type FollowRequestOptions,
  type SafetyActionOptions,
  type SafetyRemoteFn,
  type FollowRemoteFn,
  type FollowRequestRemoteFn,
  type ViewBlockReason,
} from "./relationship-cache";
