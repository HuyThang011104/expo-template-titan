import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { t } from "@/shared/i18n";
import { Button, Input, Screen, Text, useTheme } from "@/shared/ui";

/**
 * Shared mock auth form (spec §8.1 AuthPage): headerless, centered,
 * display title + email/password with inline validation errors.
 * The session is a mock — any valid-looking credentials sign in.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function AuthForm({
  mode,
  submitTestID,
  onSubmit,
  onSwitch,
}: {
  mode: "signIn" | "signUp";
  submitTestID: string;
  onSubmit: () => void;
  onSwitch: () => void;
}) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailError = !email
    ? t("auth.emailRequired")
    : EMAIL_PATTERN.test(email)
      ? undefined
      : t("auth.emailInvalid");
  const passwordError = !password
    ? t("auth.passwordRequired")
    : password.length < PASSWORD_MIN_LENGTH
      ? t("auth.passwordTooShort")
      : undefined;

  const isValid = !emailError && !passwordError;

  function handleSubmit() {
    setSubmitted(true);
    if (isValid) onSubmit();
  }

  return (
    <Screen header={false} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.content, { maxWidth: theme.layout.contentMaxWidth, gap: theme.space[5] }]}>
          <View style={[styles.header, { gap: theme.space[2] }]}>
            <Text variant="display">{t(`auth.${mode}Title`)}</Text>
            <Text variant="body" color="textSecondary">
              {t(`auth.${mode}Subtitle`)}
            </Text>
          </View>

          <View style={[styles.form, { gap: theme.space[4] }]}>
            <Input
              value={email}
              onChangeText={setEmail}
              label={t("auth.email")}
              placeholder={t("auth.emailPlaceholder")}
              leadingIcon="profile"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={submitted ? emailError : undefined}
              accessibilityLabel={t("auth.email")}
              testID={`auth-${mode}-email-input`}
              onSubmitEditing={handleSubmit}
              returnKeyType="next"
            />
            <Input
              value={password}
              onChangeText={setPassword}
              label={t("auth.password")}
              placeholder="••••••••"
              leadingIcon="lock"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              error={submitted ? passwordError : undefined}
              accessibilityLabel={t("auth.password")}
              testID={`auth-${mode}-password-input`}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
            <Button
              title={t(mode === "signIn" ? "auth.signIn" : "auth.signUp")}
              onPress={handleSubmit}
              fullWidth
              size="lg"
              style={{ borderRadius: theme.radius.full }}
              testID={submitTestID}
              accessibilityLabel={t(mode === "signIn" ? "auth.signIn" : "auth.signUp")}
            />
          </View>

          <Button
            title={
              mode === "signIn"
                ? `${t("auth.noAccount")} ${t("auth.signUp")}`
                : `${t("auth.haveAccount")} ${t("auth.signIn")}`
            }
            variant="ghost"
            onPress={onSwitch}
            testID={`auth-switch-to-${mode === "signIn" ? "sign-up" : "sign-in"}`}
            accessibilityLabel={
              mode === "signIn"
                ? `${t("auth.noAccount")} ${t("auth.signUp")}`
                : `${t("auth.haveAccount")} ${t("auth.signIn")}`
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "flex-start",
  },
  form: {
    width: "100%",
  },
});
