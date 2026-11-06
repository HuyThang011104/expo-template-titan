/**
 * Report + safety-action mutations (F6).
 *
 * - `useSubmitReport` posts once (no auto-retry: double-report risk).
 * - Safety hooks live in `entities/user` (they wrap the relationship cache
 *   and are also used by the profile overflow); re-exported here so the
 *   moderation public API stays unchanged.
 */

import { useMutation } from "@tanstack/react-query";

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { ReportInput } from "../model";

export type SubmitFetchOptions = {
  fetchImpl?: typeof fetch;
};

export { useBlockUser, useMuteUser, useUnblockUser, useUnmuteUser } from "@/entities/user";

function parseReportResponse(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (record["ok"] !== true || typeof record["reportId"] !== "string") return null;
  return record["reportId"];
}

export function useSubmitReport(opts: SubmitFetchOptions = {}) {
  return useMutation({
    mutationFn: async (input: ReportInput): Promise<string> => {
      const data = await client.post<unknown>(endpoints.reports(), input, {
        fetchImpl: opts.fetchImpl,
      });
      const reportId = parseReportResponse(data);
      if (!reportId) {
        logger.warn("[moderation] invalid report response");
        throw new Error("[moderation] Invalid report response");
      }
      return reportId;
    },
  });
}
