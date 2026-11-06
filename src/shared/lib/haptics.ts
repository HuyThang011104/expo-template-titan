/**
 * Haptics util — the only place that imports `expo-haptics`.
 *
 * Spec: docs/feel-spec.md §5.4. Features call these helpers instead of the
 * native module so feedback can be swapped or killed centrally. Every call is
 * a no-op on web, when disabled, or when the platform throws.
 */

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Central kill switch. Set to `false` to silence every haptic. */
export const HAPTICS_ENABLED = true;

function canRun(): boolean {
  return HAPTICS_ENABLED && Platform.OS !== "web";
}

async function run(action: () => Promise<unknown>): Promise<void> {
  if (!canRun()) return;

  try {
    await action();
  } catch {
    // Haptics are best-effort; unsupported devices throw silently.
  }
}

/** Light tap — like, save, toggle. */
export function hapticLight(): Promise<void> {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Success notification — post published, message sent. */
export function hapticSuccess(): Promise<void> {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning notification — destructive or blocked action. */
export function hapticWarning(): Promise<void> {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
