import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Icon } from "../icons";
import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type FieldProps = {
  children: ReactNode;
  label?: string;
  helper?: string;
  error?: string;
  counter?: string;
  testID?: string;
};

/**
 * Form field wrapper: label, control, and a single helper/error row. `error`
 * wins over `helper`; the counter stays visible on the right.
 */
export function Field({ children, label, helper, error, counter, testID }: FieldProps) {
  const theme = useTheme();
  const hasError = typeof error === "string" && error.length > 0;
  const message = hasError ? error : helper;

  return (
    <View style={{ gap: theme.space[1] }} testID={testID}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      {children}
      {message || counter ? (
        <View style={[styles.footer, { gap: theme.space[2] }]}>
          {message ? (
            <View style={[styles.message, { gap: theme.space[1] }]}>
              {hasError ? <Icon name="alert" size="sm" color="danger" decorative /> : null}
              <Text
                variant="caption"
                color={hasError ? "danger" : "textSecondary"}
                accessibilityRole={hasError ? "alert" : undefined}
                style={styles.messageText}
              >
                {message}
              </Text>
            </View>
          ) : (
            <View style={styles.message} />
          )}
          {counter ? (
            <Text variant="caption" color="textSecondary">
              {counter}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  message: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  messageText: {
    flexShrink: 1,
  },
});
