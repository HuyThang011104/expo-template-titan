import { Stack } from "expo-router";

import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

/**
 * Stack inside the inbox tab.
 * Native header with per-screen titles; unread badge lives on the tab trigger.
 */
export default function InboxLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Inbox" })} />
      <Stack.Screen name="chats/index" options={headerOptions(theme, { title: "Chats" })} />
      <Stack.Screen name="chats/[id]" options={headerOptions(theme, { title: "Chat" })} />
    </Stack>
  );
}
