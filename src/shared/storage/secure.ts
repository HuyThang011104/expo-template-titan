import * as SecureStore from "expo-secure-store";

import { logger } from "../observability/logger";

/**
 * Secret storage wrapping `expo-secure-store`.
 *
 * - Native: Keystore/Keychain via async API only (sync calls block JS).
 * - Web: unencrypted `localStorage` fallback for dev only.
 * - iOS may reject values over ~2048 bytes; native errors warn then rethrow.
 *
 * TODO: add `requireAuthentication`/biometrics for sensitive keys.
 */

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      `[secure] Invalid key "${key}". Keys may only contain alphanumeric characters, ".", "-" and "_".`,
    );
  }
}

function isWeb(): boolean {
  return process.env.EXPO_OS === "web";
}

async function assertAvailable(): Promise<void> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    throw new Error("[secure] SecureStore is not available on this device.");
  }
}

function readWeb(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWeb(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    logger.warn("[secure] web fallback setItem failed", { key });
    throw error;
  }
}

function removeWeb(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logger.warn("[secure] web fallback deleteItem failed", { key });
    throw error;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  assertValidKey(key);
  if (isWeb()) return readWeb(key);
  await assertAvailable();
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  assertValidKey(key);
  if (isWeb()) {
    writeWeb(key, value);
    return;
  }
  await assertAvailable();
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    // Large payloads may be rejected by iOS — warn then rethrow.
    logger.warn("[secure] setItem failed", { key });
    throw error;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  assertValidKey(key);
  if (isWeb()) {
    removeWeb(key);
    return;
  }
  await assertAvailable();
  await SecureStore.deleteItemAsync(key);
}
