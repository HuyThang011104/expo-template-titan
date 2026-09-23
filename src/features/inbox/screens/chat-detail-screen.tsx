import { useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * Chat detail placeholder (reads the param, no fetch yet).
 */
export function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return (
      <Screen style={styles.root}>
        <Text variant="body">Missing chat id.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.root}>
      <Text variant="title">Chat {id}</Text>
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
