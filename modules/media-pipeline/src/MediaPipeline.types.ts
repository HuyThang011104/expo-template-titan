// Shared shapes for the MediaPipeline native module.
// The native side (Swift/Kotlin) must return exactly this; `video-info.ts`
// in `src/shared/media` sanitizes anything unexpected at runtime.

export type VideoMetadata = {
  width: number;
  height: number;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Bytes, or null when the provider does not report it. */
  fileSize: number | null;
};
