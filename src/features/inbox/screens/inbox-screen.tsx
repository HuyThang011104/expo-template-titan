import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * Inbox placeholder (text plus tokens, no fetch yet).
 * Real chat comes later.
 */
export function InboxScreen() {
  return (
    <Screen style={styles.root}>
      <Text variant="title">Inbox</Text>
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
