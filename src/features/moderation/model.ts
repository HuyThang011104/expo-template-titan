/**
 * Moderation model (F6).
 *
 * Plain types only — no `Post`/`User` redefined here. Reasons mirror the
 * mock validator in `shared/api/mock-handlers.ts`; keep in sync by hand.
 */

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "nudity",
  "violence",
  "misinformation",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or scam",
  harassment: "Harassment or bullying",
  nudity: "Nudity or sexual content",
  violence: "Violence or threats",
  misinformation: "False or misleading info",
  other: "Something else",
};

export type ReportTargetType = "post" | "user";

export type ReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
};

export type SafetyAction = "block" | "unblock" | "mute" | "unmute";

export const REPORT_DETAILS_MAX_LENGTH = 500;
