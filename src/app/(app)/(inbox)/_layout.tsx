import { Stack } from "expo-router";

/**
 * Stack inside the inbox tab.
 * Native header with a per-screen title.
 */
export default function InboxLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Inbox" }} />
      <Stack.Screen name="chats/index" options={{ title: "Chats" }} />
      <Stack.Screen name="chats/[id]" options={{ title: "Chat" }} />
    </Stack>
  );
}
