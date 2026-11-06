/**
 * Report input validation (F6).
 *
 * Manual checks (no zod at the feature layer — zod lives in entities).
 * The mock re-validates server-side; here we map to inline UI messages.
 */

import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportInput,
  type ReportReason,
  type ReportTargetType,
} from "./model";

export type ReportValidation =
  | { ok: true; value: ReportInput }
  | { ok: false; error: string };

function isTargetType(value: unknown): value is ReportTargetType {
  return value === "post" || value === "user";
}

function isReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value)
  );
}

export function validateReportInput(input: {
  targetType: unknown;
  targetId: unknown;
  reason: unknown;
  details?: unknown;
}): ReportValidation {
  if (!isTargetType(input.targetType)) {
    return { ok: false, error: "Missing report target." };
  }
  if (typeof input.targetId !== "string" || input.targetId.trim().length === 0) {
    return { ok: false, error: "Missing report target." };
  }
  if (!isReason(input.reason)) {
    return { ok: false, error: "Choose a reason for your report." };
  }
  if (input.details !== undefined && input.details !== "") {
    if (typeof input.details !== "string") {
      return { ok: false, error: "Details are not valid." };
    }
    if (input.details.length > REPORT_DETAILS_MAX_LENGTH) {
      return { ok: false, error: `Details are limited to ${REPORT_DETAILS_MAX_LENGTH} characters.` };
    }
  }
  const value: ReportInput = {
    targetType: input.targetType,
    targetId: input.targetId.trim(),
    reason: input.reason,
  };
  if (typeof input.details === "string" && input.details.length > 0) {
    value.details = input.details;
  }
  return { ok: true, value };
}
