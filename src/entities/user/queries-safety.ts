/**
 * Safety-action mutations (F6) — entity-owned because they wrap the
 * relationship cache and two features consume them (moderation, profile).
 *
 * Optimistic + rollback live in `relationship-cache`; these hooks only bind
 * the cache call to React Query and the shared API client.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  blockUserRemote,
  muteUserRemote,
  unblockUserRemote,
  unmuteUserRemote,
} from "./api-relationship";
import type { RelationshipFetchOptions } from "./api-relationship";
import { blockUser, muteUser, unblockUser, unmuteUser } from "./relationship-cache";

export type SafetyMutationOptions = RelationshipFetchOptions;

export function useBlockUser(userId: string, opts: SafetyMutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      blockUser(qc, userId, {
        remote: (id) => blockUserRemote(id, opts),
      }),
  });
}

export function useUnblockUser(userId: string, opts: SafetyMutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unblockUser(qc, userId, {
        remote: (id) => unblockUserRemote(id, opts),
      }),
  });
}

export function useMuteUser(userId: string, opts: SafetyMutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      muteUser(qc, userId, {
        remote: (id) => muteUserRemote(id, opts),
      }),
  });
}

export function useUnmuteUser(userId: string, opts: SafetyMutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unmuteUser(qc, userId, {
        remote: (id) => unmuteUserRemote(id, opts),
      }),
  });
}
