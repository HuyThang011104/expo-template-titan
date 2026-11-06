import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/** Deep links into a sub-setting still get the Settings hub below them. */
export const unstable_settings = {
  initialRouteName: "index",
};

/**
 * Settings stack (not a modal).
 * URLs: `/settings`, `/settings/notifications`, `/settings/privacy`,
 * `/settings/account`. Native header + back stack; see docs/design-system.md 7.9.
 */
export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Settings" })} />
      <Stack.Screen
        name="notifications"
        options={headerOptions(theme, { title: "Notifications" })}
      />
      <Stack.Screen name="privacy" options={headerOptions(theme, { title: "Privacy" })} />
      <Stack.Screen name="account" options={headerOptions(theme, { title: "Account" })} />
    </Stack>
  );
}
