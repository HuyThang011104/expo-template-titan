/**
 * Tests for `shared/api/client` + `auth-middleware`. All tests inject `fetchImpl`.
 */

import { getSecureItem, setSecureItem } from "../../storage/secure";
import { client } from "../client";
import { ApiError, isApiError } from "../errors";

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

// Minimal splash-screen mock: `client` pulls it in transitively without rendering.
jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const mockedGet = getSecureItem as jest.Mock;
const mockedSet = setSecureItem as jest.Mock;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected promise to reject");
}

beforeEach(() => {
  jest.resetAllMocks();
  mockedGet.mockResolvedValue(null);
  mockedSet.mockResolvedValue(undefined);
});

describe("client error mapping", () => {
  it("maps HTTP 500 to ApiError", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ message: "boom" }, 500));
    const error = await catchError(client.get("/posts", { auth: false, fetchImpl }));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error) ? error.status : null).toBe(500);
    expect(isApiError(error) ? error.code : null).toBe("HTTP");
  });

  it("maps network throw to NETWORK", async () => {
    const fetchImpl = jest.fn(async (): Promise<Response> => {
      throw new Error("down");
    });
    const error = await catchError(client.get("/posts", { auth: false, fetchImpl }));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error) ? error.code : null).toBe("NETWORK");
    expect(isApiError(error) ? error.status : null).toBeNull();
  });

  it("maps hung request to TIMEOUT", async () => {
    // Mock honors AbortSignal like real fetch (abort -> reject).
    const fetchImpl = jest.fn(
      (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> =>
        new Promise<Response>((_, reject) => {
          const [, init] = args;
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("AbortError"));
          });
        }),
    );
    const error = await catchError(client.get("/posts", { auth: false, fetchImpl, timeoutMs: 50 }));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error) ? error.code : null).toBe("TIMEOUT");
  });

  it("maps invalid JSON to PARSE", async () => {
    const fetchImpl = jest.fn(async () => new Response("not-json{", { status: 200 }));
    const error = await catchError(client.get("/posts", { auth: false, fetchImpl }));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error) ? error.code : null).toBe("PARSE");
  });

  it("resolves undefined for empty 200 body", async () => {
    const fetchImpl = jest.fn(async () => new Response("", { status: 200 }));
    await expect(client.get("/logout", { auth: false, fetchImpl })).resolves.toBeUndefined();
  });

  it("sends JSON body with content type on POST", async () => {
    let seenInit: RequestInit | undefined;
    const fetchImpl = jest.fn(async (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> => {
      [, seenInit] = args;
      return jsonResponse({ ok: true }, 200);
    });

    const data = await client.post<{ ok: boolean }>("/posts", { body: "hi" }, { auth: false, fetchImpl });

    expect(data).toEqual({ ok: true });
    expect(seenInit?.method).toBe("POST");
    expect(seenInit?.body).toBe(JSON.stringify({ body: "hi" }));
    expect(new Headers(seenInit?.headers).get("Content-Type")).toBe("application/json");
  });
});

describe("client auth retry (401)", () => {
  it("refreshes once then retries with the new token", async () => {
    mockedGet.mockResolvedValueOnce("old-token").mockResolvedValue("new-token");
    const seenAuth: (string | null)[] = [];
    const fetchImpl = jest.fn(async (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> => {
      const [, init] = args;
      seenAuth.push(new Headers(init?.headers).get("Authorization"));
      return seenAuth.length === 1
        ? new Response("unauthorized", { status: 401 })
        : jsonResponse({ ok: true }, 200);
    });

    const data = await client.get<{ ok: boolean }>("/me", { fetchImpl });

    expect(data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(seenAuth).toEqual(["Bearer old-token", "Bearer new-token"]);
    expect(mockedSet).toHaveBeenCalledTimes(1);
  });

  it("throws 401 when retry still fails, refresh called exactly once", async () => {
    mockedGet.mockResolvedValue("stale-token");
    const fetchImpl = jest.fn(async () => new Response("nope", { status: 401 }));

    const error = await catchError(client.get("/me", { fetchImpl }));

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error) ? error.status : null).toBe(401);
    expect(isApiError(error) ? error.code : null).toBe("UNAUTHORIZED");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(mockedSet).toHaveBeenCalledTimes(1);
  });
});
