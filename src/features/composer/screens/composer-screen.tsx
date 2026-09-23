import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

/**
 * Composer placeholder opened as a `formSheet`.
 * Dismisses back to the previous tab.
 */
export function ComposerScreen() {
  return (
    <Screen style={styles.root}>
      <Text variant="title">New post</Text>
      <Text variant="body">Composer — coming in Phase F1.</Text>
      <Button title="Dismiss" variant="secondary" onPress={() => router.dismiss()} />
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
