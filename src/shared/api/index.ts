// Public API of `src/shared/api`. No deep imports.
export { createAuthFetch, type AuthFetchOptions, type TokenReader } from "./auth-middleware";
export { client, request, type HttpMethod, type RequestOptions } from "./client";
export { absoluteUrl, apiBaseUrl, endpoints, realtimeUrl, wsBaseUrl } from "./endpoints";
export { ApiError, isApiError, type ApiErrorCode } from "./errors";
export {
  createMockFetch,
  type MockFetchOptions,
  type MockRequest,
  type MockRoute,
} from "./mock-handlers";
export { CursorPage } from "./pagination";
