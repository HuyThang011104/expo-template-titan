/**
 * Token-based text input. Label, helper/error, counter, and optional leading
 * or trailing icons; everything else passes through to RN `TextInput`.
 * Callers own value state and validation.
 */

import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { Icon, type IconName } from "../icons";
import { useTheme } from "../theme/use-theme";
import { Field } from "./field";

export type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  helper?: string;
  counter?: boolean;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  onSubmitEditing?: () => void;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export function Input({
  value,
  onChangeText,
  label,
  error,
  helper,
  counter = false,
  leadingIcon,
  trailingIcon,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  returnKeyType,
  autoCapitalize = "sentences",
  multiline = false,
  maxLength,
  editable = true,
  autoFocus = false,
  accessibilityLabel,
  onSubmitEditing,
  style,
  testID,
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = typeof error === "string" && error.length > 0;

  const counterText = counter
    ? maxLength !== undefined
      ? `${value.length}/${maxLength}`
      : `${value.length}`
    : undefined;

  const iconColor = hasError ? "danger" : focused ? "primary" : "textSecondary";

  return (
    <Field
      label={label}
      helper={helper}
      error={error}
      counter={counterText}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.color.surfaceMuted,
            borderColor: hasError
              ? theme.color.danger
              : focused
                ? theme.color.borderStrong
                : theme.color.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.space[4],
            gap: theme.space[2],
            alignItems: multiline ? "flex-start" : "center",
          },
        ]}
      >
        {leadingIcon ? <Icon name={leadingIcon} size="md" color={iconColor} decorative /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: !editable }}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              color: theme.color.textPrimary,
              paddingVertical: theme.space[2],
            },
            style,
          ]}
        />
        {trailingIcon ? <Icon name={trailingIcon} size="md" color={iconColor} decorative /> : null}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 44,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
    paddingHorizontal: 0,
  },
  multiline: {
    textAlignVertical: "top",
  },
});
