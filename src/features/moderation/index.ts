// Public API for `features/moderation`.
// Routes must import from here only — no deep imports.
export { ReportScreen, handleReportDismiss } from "./screens/report-screen";
export type {
  ReportInput,
  ReportReason,
  ReportTargetType,
  SafetyAction,
} from "./model";
export { REPORT_REASONS, REPORT_REASON_LABELS, REPORT_DETAILS_MAX_LENGTH } from "./model";
export { validateReportInput, type ReportValidation } from "./validation";
export {
  useSubmitReport,
  useBlockUser,
  useUnblockUser,
  useMuteUser,
  useUnmuteUser,
  type SubmitFetchOptions,
} from "./mutations/use-safety";
