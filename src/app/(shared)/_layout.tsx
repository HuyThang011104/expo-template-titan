import { Stack } from "expo-router";

/** `(shared)` group — post/user detail + dev-only screens, pushed from the root stack. */
export default function SharedGroupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
