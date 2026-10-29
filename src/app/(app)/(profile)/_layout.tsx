import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * Stack inside the profile tab.
 * Native header; "me" screen only. `user/[handle]` lives in `(shared)`.
 * The screen owns `headerRight` (overflow sheet, PF4.1).
 */
export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Profile" })} />
    </Stack>
  );
}
