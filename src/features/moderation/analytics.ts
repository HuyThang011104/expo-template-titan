/**
 * Moderation analytics stub (F6).
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 * Report details are never logged (PII).
 */

import { logger } from "@/shared/observability/logger";

import type { ReportReason, ReportTargetType, SafetyAction } from "./model";

export function logReportOpen(targetType: ReportTargetType): void {
  logger.debug("[moderation] report open", { targetType });
}

export function logReportSubmit(targetType: ReportTargetType, reason: ReportReason): void {
  logger.debug("[moderation] report submit", { targetType, reason });
}

export function logSafetyAction(action: SafetyAction, userId: string): void {
  logger.debug("[moderation] safety action", { action, userId });
}
