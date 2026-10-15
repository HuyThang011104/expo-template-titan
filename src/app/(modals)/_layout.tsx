import { Stack } from "expo-router";

/**
 * Modal group.
 * `presentation` is set per screen here; root only sets `headerShown: false`.
 * Composer = `formSheet`, media-viewer = `modal`, report = `formSheet`,
 * edit-post = `formSheet` (G1.3 text edit), settings + sub-screens =
 * `formSheet` (G2.3).
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
      <Stack.Screen
        name="settings"
        options={{ presentation: "formSheet", title: "Settings", headerShown: true }}
      />
      <Stack.Screen
        name="notif-settings"
        options={{ presentation: "formSheet", title: "Notifications", headerShown: true }}
      />
      <Stack.Screen
        name="privacy-settings"
        options={{ presentation: "formSheet", title: "Privacy", headerShown: true }}
      />
      <Stack.Screen
        name="account-settings"
        options={{ presentation: "formSheet", title: "Account", headerShown: true }}
      />
    </Stack>
  );
}
