/**
 * Orval mutator: the only adapter between generated code and `request()`.
 *
 * - Keeps the existing fetch pipeline (auth, timeout, mock, ApiError).
 * - Normalizes `HeadersInit` and strips a duplicated `/api` prefix.
 * - `request()` still owns JSON serialization, 204 handling, and errors.
 */

import { env } from "../config/env";

import { request, type HttpMethod } from "./client";

type OrvalInit = RequestInit & { signal?: AbortSignal };

function toHeaderRecord(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [key, value] of headers) out[key] = value;
    return out;
  }

  return { ...headers };
}

function toPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function stripApiPrefix(url: string): string {
  const pathname = toPath(url);
  const basePath = new URL(env.apiUrl, "http://localhost").pathname.replace(/\/+$/, "");

  const withoutDuplicate =
    basePath.length > 0 && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length)
      : pathname;

  return withoutDuplicate.startsWith("/") ? withoutDuplicate : `/${withoutDuplicate}`;
}

export const mobileMutator = async <T>(
  url: string,
  init?: OrvalInit,
): Promise<T> =>
  request<T>(stripApiPrefix(url), {
    method: (init?.method ?? "GET") as HttpMethod,
    headers: toHeaderRecord(init?.headers),
    body: init?.body ?? undefined,
  });
