/**
 * User canonical cache.
 *
 * - Only place allowed to `setQueryData(queryKeys.user…)` for users.
 * - Takes an injected `qc: QueryClient` so tests use a clean instance.
 */

import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import type { User } from "./model";

/** Overwrite the canonical user. */
export function setUser(qc: QueryClient, user: User): void {
  qc.setQueryData(queryKeys.user(user.id), user);
}

/** Read the canonical user (no fetch). */
export function getUserData(qc: QueryClient, id: string): User | undefined {
  return qc.getQueryData<User>(queryKeys.user(id));
}

/** Named alias for the feed hydrator — same as `setUser`. */
export function hydrateUser(qc: QueryClient, user: User): void {
  setUser(qc, user);
}
