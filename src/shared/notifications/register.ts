import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { client } from "../api/client";
import { logger } from "../observability/logger";

/**
 * Expo push token registration. Call only after login, never at cold start.
 * Creates the Android channel first; posts the token to `POST /devices`.
 * Never throws and never logs the raw token value.
 */

export type RegisterPushOptions = {
  /** Injected for tests + mocks. Never monkey-patch the global. */
  fetchImpl?: typeof fetch;
};

export type DevicePayload = {
  expoPushToken: string;
  platform: string;
};

const ANDROID_PUSH_CHANNEL_ID = "default";

function currentPlatform(): string {
  return process.env.EXPO_OS ?? "native";
}

/**
 * Pure platform gates (exported for tests).
 * Takes the platform explicitly because `EXPO_OS` is inlined at compile time.
 */
export function isPushSupportedPlatform(platform: string | undefined): boolean {
  return platform !== "web";
}

export function needsAndroidChannel(platform: string | undefined): boolean {
  return platform === "android";
}

async function ensureAndroidChannel(): Promise<void> {
  if (!needsAndroidChannel(process.env.EXPO_OS)) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_PUSH_CHANNEL_ID, {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    logger.warn("[notifications] set channel failed", { channelId: ANDROID_PUSH_CHANNEL_ID });
  }
}

function readProjectId(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === "string" && fromExtra.length > 0) return fromExtra;
  const easConfig = (Constants as unknown as { easConfig?: { projectId?: unknown } }).easConfig;
  const fromEas = easConfig?.projectId;
  if (typeof fromEas === "string" && fromEas.length > 0) return fromEas;
  return null;
}

/** Saves the token to the backend. Network errors throw for the caller to handle. */
export async function saveDeviceToken(
  token: string,
  options: RegisterPushOptions = {},
): Promise<void> {
  const payload: DevicePayload = { expoPushToken: token, platform: currentPlatform() };
  await client.post("/devices", payload, { fetchImpl: options.fetchImpl });
}

/**
 * Full flow: channel (Android) -> permission -> token -> `POST /devices`.
 * Returns the token when fetched, `null` when permission/project/token is missing.
 */
export async function registerForPushNotifications(
  options: RegisterPushOptions = {},
): Promise<string | null> {
  if (!isPushSupportedPlatform(process.env.EXPO_OS)) {
    logger.warn("[notifications] push unsupported on web, skipping registration");
    return null;
  }
  if (!Device.isDevice) {
    logger.debug("[notifications] not a physical device, attempting registration anyway");
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    logger.warn("[notifications] permission not granted, skipping registration");
    return null;
  }

  const projectId = readProjectId();
  if (!projectId) {
    logger.warn("[notifications] missing EAS projectId, skipping registration");
    return null;
  }

  let token: string | null = null;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    logger.warn("[notifications] getExpoPushToken failed");
    return null;
  }
  if (!token) {
    logger.warn("[notifications] empty push token");
    return null;
  }

  try {
    await saveDeviceToken(token, options);
  } catch {
    // Token fetched; a transient save failure retries on next login.
    logger.warn("[notifications] POST /devices failed");
  }
  return token;
}
