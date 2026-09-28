/**
 * Inbox analytics stub (F5).
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logInboxOpen(): void {
  logger.debug("[inbox] open");
}

export function logNotificationTap(notificationId: string): void {
  logger.debug("[inbox] tap notification", { notificationId });
}

export function logMarkAllRead(count: number): void {
  logger.debug("[inbox] mark all read", { count });
}
