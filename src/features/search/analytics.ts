/**
 * Search analytics stub (F3).
 *
 * Logs in dev only with no network calls; signature stays for later wiring.
 */

import { logger } from "@/shared/observability/logger";

export function logSearchOpen(): void {
  logger.debug("[search] open");
}

export function logSearchQuery(query: string): void {
  logger.debug("[search] query", { query });
}
