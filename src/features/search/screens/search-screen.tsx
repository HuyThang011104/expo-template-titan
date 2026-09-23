import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * Search placeholder (text plus tokens, no fetch yet).
 * Real search comes later.
 */
export function SearchScreen() {
  return (
    <Screen style={styles.root}>
      <Text variant="title">Search</Text>
      <Text variant="body">Coming soon — Phase F3.</Text>
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
