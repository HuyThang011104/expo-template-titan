/**
 * Multipart media upload. Auth rides on `client` (Bearer + one 401 refresh);
 * one retry on NETWORK/TIMEOUT only, never on HTTP/validation errors.
 * No upload progress — RN `fetch` cannot report it; resumable uploads are future work.
 */

import { client } from "../api/client";
import { endpoints } from "../api/endpoints";
import { ApiError, isApiError } from "../api/errors";
import { logger } from "../observability/logger";
import type { PickedMedia } from "./picker";

export type UploadedMedia = {
  mediaId: string;
  url: string;
  kind: string;
};

export type UploadOptions = {
  /** Injected for tests + mocks. Never monkey-patch the global. */
  fetchImpl?: typeof fetch;
  fileFieldName?: string;
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

function fileNameFor(asset: PickedMedia): string {
  const ext = EXTENSIONS[asset.mimeType] ?? "bin";
  return `upload-${Date.now()}.${ext}`;
}

function buildForm(asset: PickedMedia, fieldName: string): FormData {
  const form = new FormData();
  form.append(fieldName, {
    uri: asset.uri,
    name: fileNameFor(asset),
    type: asset.mimeType,
  } as unknown as Blob);
  return form;
}

function isRetryable(error: unknown): boolean {
  return isApiError(error) && (error.code === "NETWORK" || error.code === "TIMEOUT");
}

function assertUploaded(data: unknown): UploadedMedia {
  if (
    data !== null &&
    typeof data === "object" &&
    typeof (data as { mediaId?: unknown }).mediaId === "string" &&
    typeof (data as { url?: unknown }).url === "string"
  ) {
    const { mediaId, url, kind } = data as { mediaId: string; url: string; kind?: unknown };
    return { mediaId, url, kind: typeof kind === "string" ? kind : "image" };
  }
  throw new ApiError({
    status: null,
    code: "PARSE",
    url: endpoints.uploadSessions(),
    message: "[media] Invalid upload response",
  });
}

export async function uploadMedia(
  asset: PickedMedia,
  options: UploadOptions = {},
): Promise<UploadedMedia> {
  const fieldName = options.fileFieldName ?? "file";
  const path = endpoints.uploadSessions();

  try {
    const data = await client.post<unknown>(path, buildForm(asset, fieldName), {
      fetchImpl: options.fetchImpl,
    });
    return assertUploaded(data);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    logger.warn("[media] upload retrying after network failure", { code: (error as ApiError).code });
    const data = await client.post<unknown>(path, buildForm(asset, fieldName), {
      fetchImpl: options.fetchImpl,
    });
    return assertUploaded(data);
  }
}
