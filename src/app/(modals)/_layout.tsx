import { Stack } from "expo-router";

/**
 * Modal group.
 * `presentation` is set per screen here; root only sets `headerShown: false`.
 * Composer = `formSheet`, media-viewer = `modal`.
 */
export default function ModalsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="composer"
        options={{ presentation: "formSheet", title: "New post", headerShown: true }}
      />
      <Stack.Screen
        name="media-viewer"
        options={{ presentation: "modal", title: "Media", headerShown: true }}
      />
    </Stack>
  );
}
