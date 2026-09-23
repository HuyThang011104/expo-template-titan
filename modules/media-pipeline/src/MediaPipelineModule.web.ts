import { registerWebModule, NativeModule } from "expo";

// MediaPipeline has no web implementation — callers must fall back
// (see `getLocalVideoMetadata` in `src/shared/media/video-info.ts`).
class MediaPipelineModule extends NativeModule {
  async getVideoMetadata(_uri: string): Promise<never> {
    throw new Error("MediaPipeline.getVideoMetadata is unavailable on web");
  }
}

export default registerWebModule(MediaPipelineModule, "MediaPipelineModule");
