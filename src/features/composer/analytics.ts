/**
 * Composer analytics stub (F1.1).
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logComposerOpen(): void {
  logger.debug("[composer] open");
}

export function logComposerPost(): void {
  logger.debug("[composer] post attempt");
}

export function logComposerSuccess(postId: string): void {
  logger.debug("[composer] post success", { postId });
}

export function logComposerFail(reason: string): void {
  logger.debug("[composer] post fail", { reason });
}
