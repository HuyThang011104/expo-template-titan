/**
 * Canonical `shared/api` error. All network/timeout/parse/HTTP failures map here.
 * `status: null` without an HTTP response; messages never carry secrets.
 */

export type ApiErrorCode = "NETWORK" | "TIMEOUT" | "HTTP" | "PARSE" | "UNAUTHORIZED";

type ApiErrorOptions = {
  status: number | null;
  code: ApiErrorCode;
  url: string;
  message: string;
};

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: ApiErrorCode;
  readonly url: string;

  constructor({ status, code, url, message }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.url = url;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
