/**
 * Success envelope returned by the backend.
 *
 * Generated functions return this shape; unwrap it exactly once at the
 * entity API boundary before mapping DTOs to domain models.
 */

export type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  path: string;
  timestamp: string;
  data: T;
};

export function unwrapApiEnvelope<T>(body: ApiEnvelope<T>): T {
  return body.data;
}
