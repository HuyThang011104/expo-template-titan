import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * Chat list placeholder (text plus tokens, no fetch yet).
 */
export function ChatListScreen() {
  return (
    <Screen style={styles.root}>
      <Text variant="title">Chats</Text>
      <Text variant="body">Coming soon — Phase F4.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
