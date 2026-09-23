import { Stack } from "expo-router";

/**
 * Stack inside the search tab.
 * Native header with its own title. No `headerSearchBarOptions` yet.
 */
export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Search" }} />
    </Stack>
  );
}
