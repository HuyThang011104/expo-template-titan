/**
 * Shared `QueryClient`.
 *
 * - `staleTime` 30s; one retry for network/5xx only, never 401/4xx.
 * - No window-focus refetch; mutations never auto-retry (callers roll back).
 * - `queryClient` is the provider singleton; `createQueryClient()` is for tests.
 */

import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/errors";

function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError && error.status !== null && error.status >= 400 && error.status < 500) {
    return false;
  }
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
