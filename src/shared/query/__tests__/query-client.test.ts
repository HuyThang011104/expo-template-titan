/**
 * Tests for `shared/query` defaults and the mock `/health` route.
 */

import { client } from "../../api/client";
import { ApiError } from "../../api/errors";
import { createMockFetch } from "../../api/mock-handlers";
import { createQueryClient } from "../query-client";

function apiError(status: number): ApiError {
  return new ApiError({
    status,
    code: status === 401 ? "UNAUTHORIZED" : "HTTP",
    url: "/x",
    message: `[api] Request failed: GET /x -> ${status}`,
  });
}

describe("query-client defaults", () => {
  it("uses staleTime 30s, no window-focus refetch, no mutation retry", () => {
    const qc = createQueryClient();

    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(qc.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
    expect(qc.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("retries once for network/5xx but never for 4xx", () => {
    const qc = createQueryClient();
    const retry = qc.getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") throw new Error("retry must be a function");

    expect(retry(0, apiError(401))).toBe(false);
    expect(retry(0, apiError(404))).toBe(false);
    expect(retry(0, apiError(500))).toBe(true);
    expect(retry(1, apiError(500))).toBe(false);
    expect(retry(0, new Error("boom"))).toBe(true);
    expect(retry(1, new Error("boom"))).toBe(false);
  });

  it("creates independent instances", () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});

describe("mock /health", () => {
  it("resolves { status: 'ok' } through the mock", async () => {
    const health = await client.get<{ status: string; variant: string }>("/health", {
      auth: false,
      fetchImpl: createMockFetch({ delayMs: 0 }),
    });

    expect(health.status).toBe("ok");
  });

  it("maps unknown mock routes to 404 ApiError", async () => {
    const error = await client
      .get("/nope", { auth: false, fetchImpl: createMockFetch({ delayMs: 0 }) })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) expect(error.status).toBe(404);
  });
});
