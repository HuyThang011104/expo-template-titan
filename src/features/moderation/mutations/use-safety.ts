/**
 * Report + safety-action mutations (F6).
 *
 * - `useSubmitReport` posts once (no auto-retry: double-report risk).
 * - Safety hooks wrap the entity relationship cache (optimistic + rollback).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  blockUser,
  blockUserRemote,
  muteUser,
  muteUserRemote,
  unblockUser,
  unblockUserRemote,
  unmuteUser,
  unmuteUserRemote,
} from "@/entities/user";
import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { ReportInput } from "../model";

export type SubmitFetchOptions = {
  fetchImpl?: typeof fetch;
};

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

export function useBlockUser(userId: string, opts: SubmitFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      blockUser(qc, userId, {
        remote: (id) => blockUserRemote(id, opts),
      }),
  });
}

export function useUnblockUser(userId: string, opts: SubmitFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unblockUser(qc, userId, {
        remote: (id) => unblockUserRemote(id, opts),
      }),
  });
}

export function useMuteUser(userId: string, opts: SubmitFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      muteUser(qc, userId, {
        remote: (id) => muteUserRemote(id, opts),
      }),
  });
}

export function useUnmuteUser(userId: string, opts: SubmitFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unmuteUser(qc, userId, {
        remote: (id) => unmuteUserRemote(id, opts),
      }),
  });
}
