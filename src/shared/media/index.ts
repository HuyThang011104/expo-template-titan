// Public API of `src/shared/media`. No deep imports.
export { AppImage, type AppImageProps } from "./image";
export { AppVideo, type AppVideoProps } from "./video";
export {
  normalizeAsset,
  pickFromLibrary,
  takePhoto,
  type LibraryKind,
  type PickOptions,
  type PickedMedia,
  type PickedMediaKind,
} from "./picker";
export { uploadMedia, type UploadedMedia, type UploadOptions } from "./upload";
export {
  getLocalVideoMetadata,
  type LocalVideoMetadata,
  type NativeVideoMetadata,
} from "./video-info";
