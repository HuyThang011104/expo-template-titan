/**
 * Shared HTTP client.
 *
 * - Base URL from `env.apiUrl`; 10s `AbortController` timeout maps to TIMEOUT.
 * - Errors become `ApiError`; logs carry path/status/code only, never tokens.
 * - `auth: true` (default) routes through `createAuthFetch`; `auth: false`
 *   calls `fetchImpl` directly. Callers validate responses; no `any`, no zod.
 */

import { env } from "../config/env";
import { logger } from "../observability/logger";
import { createAuthFetch } from "./auth-middleware";
import { ApiError } from "./errors";
import { createMockFetch } from "./mock-handlers";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  /** Object becomes `JSON.stringify` output (+ `Content-Type`); strings pass through. */
  body?: unknown;
  timeoutMs?: number;
  /** Defaults to `true` — attaches Bearer and refreshes once on 401. */
  auth?: boolean;
  /**
   * Injected for tests + mocks. Never monkey-patch the global.
   * Defaults to the in-app mock backend when `EXPO_PUBLIC_API_MOCK=true`.
   */
  fetchImpl?: typeof fetch;
};

const DEFAULT_TIMEOUT_MS = 10_000;

let mockFetch: typeof fetch | null = null;

/** Singleton mock backend for E2E builds. Stateless — safe to share. */
function getMockFetch(): typeof fetch {
  if (!mockFetch) mockFetch = createMockFetch();
  return mockFetch;
}

function joinUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiUrl}${suffix}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    auth = true,
    fetchImpl = env.apiMock ? getMockFetch() : globalThis.fetch,
  } = options;

  const url = joinUrl(path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders: Record<string, string> = { ...(headers ?? {}) };
    let requestBody: string | FormData | undefined;
    if (body !== undefined) {
      if (typeof body === "string") {
        requestBody = body;
      } else if (typeof FormData !== "undefined" && body instanceof FormData) {
        // Multipart upload: fetch sets the boundary itself, never JSON-encode.
        requestBody = body;
      } else {
        if (requestHeaders["Content-Type"] === undefined) {
          requestHeaders["Content-Type"] = "application/json";
        }
        requestBody = JSON.stringify(body);
      }
    }

    const init: RequestInit = { method, headers: requestHeaders, signal: controller.signal };
    if (requestBody !== undefined) {
      init.body = requestBody;
    }

    const doFetch = auth ? createAuthFetch({ fetchImpl }) : fetchImpl;

    let response: Response;
    try {
      response = await doFetch(url, init);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError({
          status: null,
          code: "TIMEOUT",
          url: path,
          message: `[api] Request timed out: ${method} ${path}`,
        });
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError({
        status: null,
        code: "NETWORK",
        url: path,
        message: `[api] Network request failed: ${method} ${path}`,
      });
    }

    const text = await response.text();

    if (!response.ok) {
      const code = response.status === 401 ? "UNAUTHORIZED" : "HTTP";
      logger.warn("[api] request failed", { url: path, status: response.status, code });
      throw new ApiError({
        status: response.status,
        code,
        url: path,
        message: `[api] Request failed: ${method} ${path} -> ${response.status}`,
      });
    }

    if (text === "") {
      return undefined as unknown as T;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      logger.warn("[api] parse failed", { url: path });
      throw new ApiError({
        status: null,
        code: "PARSE",
        url: path,
        message: `[api] Invalid JSON response: ${method} ${path}`,
      });
    }
    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

type BodyOptions = Omit<RequestOptions, "method" | "body">;
type NoBodyOptions = Omit<RequestOptions, "method" | "body">;

export const client = {
  get: <T>(path: string, options?: NoBodyOptions): Promise<T> =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: BodyOptions): Promise<T> =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: BodyOptions): Promise<T> =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: BodyOptions): Promise<T> =>
    request<T>(path, { ...options, method: "PATCH", body }),
  del: <T>(path: string, options?: NoBodyOptions): Promise<T> =>
    request<T>(path, { ...options, method: "DELETE" }),
};
