/**
 * Settings analytics stub (G2.3).
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logSettingsOpen(): void {
  logger.debug("[settings] open hub");
}

export function logNotifSettingsOpen(): void {
  logger.debug("[settings] open notifications");
}

export function logPrivacySettingsOpen(): void {
  logger.debug("[settings] open privacy");
}

export function logAccountSettingsOpen(): void {
  logger.debug("[settings] open account");
}
