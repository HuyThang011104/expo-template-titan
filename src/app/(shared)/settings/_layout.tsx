import { Stack } from "expo-router";

/**
 * Settings stack (not a modal).
 * URLs: `/settings`, `/settings/notifications`, `/settings/privacy`,
 * `/settings/account`. Native header + back stack; see docs/design-system.md 7.9.
 */
export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
    </Stack>
  );
}
