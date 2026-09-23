import { NativeModule, requireNativeModule } from "expo";

import type { VideoMetadata } from "./MediaPipeline.types";

declare class MediaPipelineModule extends NativeModule {
  getVideoMetadata(uri: string): Promise<VideoMetadata>;
}

export default requireNativeModule<MediaPipelineModule>("MediaPipeline");
