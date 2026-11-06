/**
 * Public API for `entities/account`.
 *
 * Outside code must import from here only — no deep imports.
 * Does not export: raw schemas.
 */

export type {
  AccountSession,
  ExportData,
  ExportPost,
  ExportProfile,
  SessionId,
} from "./model";
export { parseChangePasswordInput, parseExportData, parseSession, parseSessionList } from "./schema";
export {
  changePasswordRemote,
  deactivateAccountRemote,
  deleteAccountRemote,
  exportMyDataRemote,
  fetchSessions,
  revokeSessionRemote,
  type FetchOptions as AccountFetchOptions,
} from "./api";
export {
  useChangePassword,
  useDeactivateAccount,
  useDeleteAccount,
  useExportMyData,
  useRevokeSession,
  useSessions,
  type QueryFetchOptions as UseAccountOptions,
} from "./queries";
