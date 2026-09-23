/**
 * Camera/library picking. Permissions go through `../permissions`;
 * results normalize to `PickedMedia`. Returns `[]`/`null` on denial or cancel — never throws.
 */

import * as ImagePicker from "expo-image-picker";

import { logger } from "../observability/logger";
import { ensureCameraAccess, ensurePhotoLibraryAccess } from "../permissions";

export type PickedMediaKind = "image" | "video";

export type PickedMedia = {
  uri: string;
  width: number;
  height: number;
  kind: PickedMediaKind;
  mimeType: string;
  fileSize?: number;
  /** Picker-reported duration; treat as opaque. */
  duration?: number | null;
};

export type LibraryKind = "images" | "videos" | "all";

export type PickOptions = {
  allowsMultiple?: boolean;
  /** 0–1, passed straight to the picker. */
  quality?: number;
};

type RawAsset = {
  uri?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  duration?: number | null;
};

/** Pure normalizer (exported for tests). Drops assets without a usable uri. */
export function normalizeAsset(asset: RawAsset): PickedMedia | null {
  if (!asset.uri) return null;
  const mimeType = asset.mimeType ?? "application/octet-stream";
  return {
    uri: asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    kind: mimeType.startsWith("video/") ? "video" : "image",
    mimeType,
    fileSize: asset.fileSize,
    duration: asset.duration ?? undefined,
  };
}

function collectAssets(result: ImagePicker.ImagePickerResult): PickedMedia[] {
  if (result.canceled) return [];
  const out: PickedMedia[] = [];
  for (const asset of result.assets) {
    const normalized = normalizeAsset(asset);
    if (normalized) out.push(normalized);
  }
  return out;
}

const MEDIA_TYPES: Record<LibraryKind, ImagePicker.MediaType[]> = {
  images: ["images"],
  videos: ["videos"],
  all: ["images", "videos"],
};

export async function pickFromLibrary(
  kind: LibraryKind = "all",
  options: PickOptions = {},
): Promise<PickedMedia[]> {
  if ((await ensurePhotoLibraryAccess()) !== "granted") return [];
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MEDIA_TYPES[kind],
      allowsMultipleSelection: options.allowsMultiple ?? false,
      quality: options.quality ?? 0.8,
      exif: false,
    });
    return collectAssets(result);
  } catch {
    logger.warn("[media] library pick failed");
    return [];
  }
}

export async function takePhoto(options: PickOptions = {}): Promise<PickedMedia | null> {
  if ((await ensureCameraAccess()) !== "granted") return null;
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: options.quality ?? 0.8,
      exif: false,
    });
    return collectAssets(result)[0] ?? null;
  } catch {
    logger.warn("[media] camera capture failed");
    return null;
  }
}
