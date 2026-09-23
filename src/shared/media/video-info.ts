/**
 * Local video metadata with graceful degradation.
 *
 * - Tries the `MediaPipeline` native module first (exact bytes/dimensions).
 * - Falls back to picker-reported values on web, Expo Go, or stale dev
 *   clients — callers always get a usable answer, never a throw.
 * - Native payloads are sanitized: a misbehaving module degrades field by
 *   field instead of poisoning the upload validation downstream.
 */

import { requireOptionalNativeModule } from "expo";

import { logger } from "../observability/logger";
import type { PickedMedia } from "./picker";

export type NativeVideoMetadata = {
  width: number;
  height: number;
  durationMs: number;
  fileSize: number | null;
};

export type LocalVideoMetadata = NativeVideoMetadata & {
  source: "native" | "picker";
};

type MediaPipelineNativeModule = {
  getVideoMetadata: (uri: string) => Promise<NativeVideoMetadata>;
};

function pickerFallback(asset: PickedMedia): LocalVideoMetadata {
  return {
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration ?? 0,
    fileSize: asset.fileSize ?? null,
    source: "picker",
  };
}

function sanitize(meta: Partial<NativeVideoMetadata> | null | undefined, fallback: LocalVideoMetadata): NativeVideoMetadata {
  const num = (value: unknown, backup: number): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : backup;
  return {
    width: num(meta?.width, fallback.width),
    height: num(meta?.height, fallback.height),
    durationMs: num(meta?.durationMs, fallback.durationMs),
    fileSize:
      typeof meta?.fileSize === "number" && Number.isFinite(meta.fileSize) && meta.fileSize >= 0
        ? meta.fileSize
        : fallback.fileSize,
  };
}

export async function getLocalVideoMetadata(asset: PickedMedia): Promise<LocalVideoMetadata> {
  const fallback = pickerFallback(asset);
  try {
    const mod = requireOptionalNativeModule<MediaPipelineNativeModule>("MediaPipeline");
    if (!mod) return fallback;
    const meta = await mod.getVideoMetadata(asset.uri);
    return { ...sanitize(meta, fallback), source: "native" };
  } catch {
    logger.warn("[media] native metadata failed, using picker values");
    return fallback;
  }
}
