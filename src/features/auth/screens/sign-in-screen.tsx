import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { useSession } from "@/shared/auth";
import { t } from "@/shared/i18n";
import { Button, Screen, Text, useTheme } from "@/shared/ui";

/**
 * Mock sign-in screen.
 * TODO: add a username/password form plus a real API replacing `signIn()`.
 */
export function SignInScreen() {
  const { signIn } = useSession();
  const theme = useTheme();

  return (
    <Screen style={[styles.screen, { paddingHorizontal: theme.space.lg, gap: theme.space.md }]}>
      <Text variant="title">{t("auth.signIn")}</Text>
      <Button
        title={t("auth.signIn")}
        testID="sign-in-button"
        onPress={() => {
          signIn();
          router.replace("/");
        }}
      />
      <Button
        title={t("auth.signUp")}
        variant="ghost"
        onPress={() => {
          router.push("../sign-up");
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
