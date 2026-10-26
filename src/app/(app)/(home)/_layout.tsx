import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * Stack inside the home tab.
 * Native header from the shared factory; large title on the feed.
 */
export default function HomeLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Home", large: true })} />
    </Stack>
  );
}
