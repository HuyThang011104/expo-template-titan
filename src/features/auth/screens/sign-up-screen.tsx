import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { useSession } from "@/shared/auth";
import { t } from "@/shared/i18n";
import { Button, Screen, Text, useTheme } from "@/shared/ui";

/**
 * Mock sign-up screen mirroring sign-in; creating an account signs in directly.
 * TODO: add a form plus a real API replacing `signIn()`.
 */
export function SignUpScreen() {
  const { signIn } = useSession();
  const theme = useTheme();

  return (
    <Screen style={[styles.screen, { paddingHorizontal: theme.space.lg, gap: theme.space.md }]}>
      <Text variant="title">{t("auth.signUp")}</Text>
      <Button
        title={t("auth.signUp")}
        testID="sign-up-button"
        onPress={() => {
          signIn();
          router.replace("/");
        }}
      />
      <Button
        title={t("auth.signIn")}
        variant="ghost"
        onPress={() => {
          router.push("../sign-in");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    justifyContent: "center",
  },
});
