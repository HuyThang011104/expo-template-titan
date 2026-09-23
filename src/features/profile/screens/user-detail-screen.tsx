import { useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * User placeholder for `/user/[handle]` — reads the param only.
 * The entity API is id-based, so no `useUser(handle)` here yet.
 */
export function UserDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();

  if (!handle) {
    return (
      <Screen style={styles.root}>
        <Text variant="body">Missing user handle.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.root}>
      <Text variant="title">@{handle}</Text>
      <Text variant="body">Coming soon — Phase F2.</Text>
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
