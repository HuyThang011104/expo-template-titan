import { StyleSheet } from "react-native";

import { useSession } from "@/shared/auth";
import { Button, Screen, Text } from "@/shared/ui";

/**
 * "Me" profile placeholder (text plus tokens, no fetch yet).
 * Keeps the sign-out button so logout stays testable.
 */
export function ProfileScreen() {
  const { signOut } = useSession();

  return (
    <Screen style={styles.root}>
      <Text variant="title">Profile</Text>
      <Text variant="body">Coming soon — Phase F2.</Text>
      <Button title="Sign out" variant="secondary" onPress={signOut} />
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
