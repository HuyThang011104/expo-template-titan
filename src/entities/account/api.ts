/**
 * Account remote API (G2.4).
 *
 * - Calls shared `client` and validates via the entity parsers.
 * - No caching here; only `queries.ts` invalidates lists.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import type { AccountSession, ExportData } from "./model";
import { parseExportData, parseSessionList } from "./schema";

export type { ExportData };

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/sessions` → valid sessions (bad entries skipped). */
export async function fetchSessions(opts: FetchOptions = {}): Promise<AccountSession[]> {
  const data = await client.get<unknown>(endpoints.sessions(), {
    fetchImpl: opts.fetchImpl,
  });
  if (data !== null && typeof data === "object" && "items" in data) {
    return parseSessionList((data as { items: unknown }).items);
  }
  return parseSessionList(data);
}

/**
 * POST `/auth/change-password` → `true` on `{ ok: true }`.
 * Throws on transport/HTTP errors (400 = weak/new-equals-current).
 */
export async function changePasswordRemote(
  currentPassword: string,
  newPassword: string,
  opts: FetchOptions = {},
): Promise<boolean> {
  const data = await client.post<unknown>(
    endpoints.changePassword(),
    { currentPassword, newPassword },
    { fetchImpl: opts.fetchImpl },
  );
  return (
    data !== null &&
    typeof data === "object" &&
    (data as Record<string, unknown>)["ok"] === true
  );
}

/**
 * DELETE `/sessions/:id` → `{ ok, revokedCurrent }`.
 * Throws on transport/HTTP errors (404 = unknown session).
 */
export async function revokeSessionRemote(
  id: string,
  opts: FetchOptions = {},
): Promise<{ ok: boolean; revokedCurrent: boolean }> {
  const data = await client.del<unknown>(endpoints.revokeSession(id), {
    fetchImpl: opts.fetchImpl,
  });
  if (data !== null && typeof data === "object") {
    const raw = data as Record<string, unknown>;
    return { ok: raw["ok"] === true, revokedCurrent: raw["revokedCurrent"] === true };
  }
  return { ok: false, revokedCurrent: false };
}

/** POST `/users/me/deactivate` → `true` on `{ ok: true }`. */
export async function deactivateAccountRemote(opts: FetchOptions = {}): Promise<boolean> {
  const data = await client.post<unknown>(endpoints.deactivate(), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return (
    data !== null &&
    typeof data === "object" &&
    (data as Record<string, unknown>)["ok"] === true
  );
}

/** DELETE `/users/me` → `true` on `{ ok: true }`. */
export async function deleteAccountRemote(opts: FetchOptions = {}): Promise<boolean> {
  const data = await client.del<unknown>(endpoints.deleteMe(), {
    fetchImpl: opts.fetchImpl,
  });
  return (
    data !== null &&
    typeof data === "object" &&
    (data as Record<string, unknown>)["ok"] === true
  );
}

/** GET `/users/me/export` → `ExportData | null`. */
export async function exportMyDataRemote(
  opts: FetchOptions = {},
): Promise<ExportData | null> {
  const data = await client.get<unknown>(endpoints.exportMe(), {
    fetchImpl: opts.fetchImpl,
  });
  return parseExportData(data);
}
