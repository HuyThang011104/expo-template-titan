/**
 * Account queries (G2.4).
 *
 * - `useSessions` lists logins; revoke invalidates so a remote logout
 *   disappears at once (revoking the current session also signs out — the
 *   screen owns `signOut`, this only reports `revokedCurrent`).
 * - Password/deactivate/delete/export throw on failure so screens show
 *   inline retry; no auto-retry (double-submit risk).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import {
  changePasswordRemote,
  deactivateAccountRemote,
  deleteAccountRemote,
  exportMyDataRemote,
  fetchSessions,
  revokeSessionRemote,
} from "./api";
import { parseChangePasswordInput } from "./schema";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export function useSessions(opts: QueryFetchOptions = {}) {
  return useQuery({
    queryKey: queryKeys.accountSessions(),
    queryFn: () => fetchSessions(opts),
    staleTime: 30_000,
  });
}

export function useChangePassword(opts: QueryFetchOptions = {}) {
  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const parsed = parseChangePasswordInput({ currentPassword, newPassword });
      if (!parsed) throw new Error("Mật khẩu mới phải từ 6 ký tự và khác mật khẩu cũ.");
      const ok = await changePasswordRemote(
        parsed.currentPassword,
        parsed.newPassword,
        opts,
      );
      if (!ok) throw new Error("Couldn't change your password. Tap to retry.");
    },
  });
}

export function useRevokeSession(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await revokeSessionRemote(id, opts);
      if (!result.ok) throw new Error("Couldn't sign out that session. Tap to retry.");
      return result;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accountSessions() });
    },
  });
}

export function useDeactivateAccount(opts: QueryFetchOptions = {}) {
  return useMutation({
    mutationFn: async () => {
      const ok = await deactivateAccountRemote(opts);
      if (!ok) throw new Error("Couldn't deactivate your account. Tap to retry.");
    },
  });
}

export function useDeleteAccount(opts: QueryFetchOptions = {}) {
  return useMutation({
    mutationFn: async () => {
      const ok = await deleteAccountRemote(opts);
      if (!ok) throw new Error("Couldn't delete your account. Tap to retry.");
    },
  });
}

export function useExportMyData(opts: QueryFetchOptions = {}) {
  return useMutation({
    mutationFn: async () => {
      const data = await exportMyDataRemote(opts);
      if (!data) throw new Error("Couldn't export your data. Tap to retry.");
      return data;
    },
  });
}
