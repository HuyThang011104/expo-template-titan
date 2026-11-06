import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * Stack inside the search tab.
 * iOS attaches the native search bar from the screen (it owns the query state);
 * Android keeps the title header + the content SearchBar.
 */
export default function SearchLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Search" })} />
    </Stack>
  );
}
