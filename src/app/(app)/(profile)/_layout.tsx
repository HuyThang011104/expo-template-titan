import { router, Stack } from "expo-router";

import { hrefs } from "@/shared/navigation/hrefs";
import { IconButton, useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * Stack inside the profile tab.
 * Native header with the settings entry point; "me" screen only.
 * `user/[handle]` lives in `(shared)`.
 */
export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={headerOptions(theme, {
          title: "Profile",
          right: () => (
            <IconButton
              icon="settings"
              accessibilityLabel="Settings"
              testID="profile-settings-button"
              onPress={() => {
                router.push(hrefs.settings());
              }}
            />
          ),
        })}
      />
    </Stack>
  );
}
