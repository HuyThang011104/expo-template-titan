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

export function logSearchHistorySelect(query: string): void {
  logger.debug("[search] history select", { query });
}

export function logTrendingOpen(): void {
  logger.debug("[search] trending open");
}
