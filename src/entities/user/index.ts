/**
 * Public API for `entities/user`.
 *
 * Outside code must import from here only — no deep imports.
 * Does not export: raw schema, `__fixtures__`.
 */

export type { User, UserId } from "./model";
export { fetchMe, fetchUser, type FetchOptions as UserFetchOptions } from "./api";
export { getUserData, hydrateUser, setUser } from "./cache";
export { useUser, type QueryFetchOptions as UseUserOptions } from "./queries";
export { Avatar, type AvatarProps, type AvatarSize } from "./ui/avatar";
export { UserRow, type UserRowProps } from "./ui/user-row";
