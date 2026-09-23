import { Stack } from "expo-router";

/**
 * Stack inside the profile tab.
 * Native header with its own title. "me" screen; `user/[handle]` lives in `(shared)`.
 */
export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
    </Stack>
  );
}
