import { Stack } from "expo-router";

/**
 * Stack inside the home tab.
 * Native header with its own title. No search bar, no custom toolbar.
 */
export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  );
}
