import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { Screen, Text } from "@/shared/ui";

/**
 * 404 screen: `shared/ui` + `Link` back to `/`.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <Screen style={styles.container}>
        <Text variant="title">Not found</Text>
        <Text variant="body">This screen does not exist.</Text>
        <Link href="/" asChild>
          <Text variant="link">Go home</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
