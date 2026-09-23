/**
 * Auth middleware for fetch. Reads the token via `secure.ts` (never raw `SecureStore`).
 * Refreshes exactly once on 401, then retries once. Never logs raw tokens.
 */

import { SESSION_KEY } from "../auth";
import { logger } from "../observability/logger";
import { getSecureItem, setSecureItem } from "../storage/secure";

export type TokenReader = () => Promise<string | null>;

export type AuthFetchOptions = {
  fetchImpl?: typeof fetch;
  getToken?: TokenReader;
  onUnauthorized?: () => Promise<void>;
};

/** Keeps compatibility with the mock sign-in token. */
const MOCK_REFRESH_TOKEN = "dev-token";

function defaultGetToken(): Promise<string | null> {
  return getSecureItem(SESSION_KEY);
}

async function defaultRefreshMock(): Promise<void> {
  // TODO: replace with a real POST /auth/refresh.
  await setSecureItem(SESSION_KEY, MOCK_REFRESH_TOKEN);
}

function withBearer(init: RequestInit | undefined, token: string | null): RequestInit {
  if (token === null || token === "") return init ?? {};
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

export function createAuthFetch(options: AuthFetchOptions = {}): typeof fetch {
  const {
    fetchImpl = globalThis.fetch,
    getToken = defaultGetToken,
    onUnauthorized = defaultRefreshMock,
  } = options;

  return async function authFetch(input, init): Promise<Response> {
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      logger.warn("[api] getToken failed, continuing unauthenticated", { key: SESSION_KEY });
    }

    const response = await fetchImpl(input, withBearer(init, token));
    if (response.status !== 401) return response;

    try {
      await onUnauthorized();
    } catch {
      logger.warn("[api] refresh failed", { key: SESSION_KEY });
      return response;
    }

    let freshToken: string | null = null;
    try {
      freshToken = await getToken();
    } catch {
      logger.warn("[api] getToken failed after refresh", { key: SESSION_KEY });
    }
    return fetchImpl(input, withBearer(init, freshToken));
  };
}
