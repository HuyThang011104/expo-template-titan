/**
 * Feed analytics stub.
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logFeedRefresh(): void {
  logger.debug("[feed] manual refresh");
}

export function logFeedOpenDetail(postId: string): void {
  logger.debug("[feed] open detail", { postId });
}
