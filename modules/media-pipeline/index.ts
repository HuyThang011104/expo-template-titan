// Re-export the native module. On web, it will be resolved to MediaPipelineModule.web.ts
// and on native platforms to MediaPipelineModule.ts
export { default } from './src/MediaPipelineModule';
export * from './src/MediaPipeline.types';
