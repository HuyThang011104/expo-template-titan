import { Stack } from "expo-router";

/**
 * Create tab shell. The trigger is `disabled` and only pushes `/composer`
 * (see `(app)/_layout.tsx`); this route exists so the tab has a unique URL
 * (`/create`) and never competes with `/` for the initial route.
 */
export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
    </Stack>
  );
}
