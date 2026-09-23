import { Stack } from "expo-router";

/** `(auth)` group — always accessible while logged out. */
export default function AuthGroupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
