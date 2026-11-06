import { Stack } from "expo-router";

/**
 * Modal group.
 * `presentation` is set per screen here; root only sets `headerShown: false`.
 * Composer = `fullScreenModal` (staged media-first flow), media-viewer = `modal`,
 * report = `formSheet`, edit-post = `formSheet` (G1.3 text edit), edit-profile = `formSheet`.
 * Settings lives in `(shared)/settings` as a stack, not here (G2.3/G2.4).
 */
export default function ModalsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="composer"
        options={{ presentation: "fullScreenModal", title: "New post", headerShown: true }}
      />
      <Stack.Screen
        name="media-viewer"
        options={{ presentation: "modal", headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="report"
        options={{ presentation: "formSheet", title: "Report", headerShown: true }}
      />
      <Stack.Screen
        name="edit-post"
        options={{ presentation: "formSheet", title: "Edit post", headerShown: true }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ presentation: "formSheet", title: "Edit profile", headerShown: true }}
      />
    </Stack>
  );
}
