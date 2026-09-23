/**
 * Runtime permission gates. Native declarations live in
 * `plugins/with-titan-permissions.js`; this only asks at runtime.
 * Every function returns a decision and never throws — screens branch on it.
 */

import * as ImagePicker from "expo-image-picker";
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

import { logger } from "../observability/logger";

export type PermissionDecision = "granted" | "denied";

type PermissionStatus = {
  granted: boolean;
  canAskAgain?: boolean;
};

async function decide(
  label: string,
  get: () => Promise<PermissionStatus>,
  request: () => Promise<PermissionStatus>,
): Promise<PermissionDecision> {
  try {
    const current = await get();
    if (current.granted) return "granted";
    if (current.canAskAgain === false) return "denied";
    const next = await request();
    return next.granted ? "granted" : "denied";
  } catch {
    logger.warn("[permissions] check failed", { label });
    return "denied";
  }
}

/** Camera (composer capture). */
export function ensureCameraAccess(): Promise<PermissionDecision> {
  return decide(
    "camera",
    ImagePicker.getCameraPermissionsAsync,
    ImagePicker.requestCameraPermissionsAsync,
  );
}

/** Photo/video library (composer picker). */
export function ensurePhotoLibraryAccess(): Promise<PermissionDecision> {
  return decide(
    "photo-library",
    () => ImagePicker.getMediaLibraryPermissionsAsync(false),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(false),
  );
}

/** Microphone (video posts, voice notes). */
export function ensureMicrophoneAccess(): Promise<PermissionDecision> {
  return decide("microphone", getRecordingPermissionsAsync, requestRecordingPermissionsAsync);
}
