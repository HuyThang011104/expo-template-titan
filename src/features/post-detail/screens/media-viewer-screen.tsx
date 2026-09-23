import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * Fullscreen media viewer placeholder.
 * Belongs to `post-detail`, not `composer`.
 */
export function MediaViewerScreen() {
  return (
    <Screen style={styles.root}>
      <Text variant="title">Media</Text>
      <Text variant="body">Coming soon.</Text>
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
