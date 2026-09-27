/**
 * Profile analytics stub.
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logProfileOpen(userId: string): void {
  logger.debug("[profile] open me", { userId });
}

export function logUserOpen(handle: string): void {
  logger.debug("[profile] open user", { handle });
}

export function logProfileOpenDetail(postId: string): void {
  logger.debug("[profile] open detail", { postId });
}
