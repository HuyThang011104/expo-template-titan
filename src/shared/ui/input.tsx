/**
 * Token-based text input. Label + inline error; everything else passes
 * through to RN `TextInput`. Callers own value state and validation.
 */

import {
  StyleSheet,
  TextInput,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { Text } from "./text";
import { useTheme } from "./theme/use-theme";

export type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export function Input({
  value,
  onChangeText,
  label,
  error,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  returnKeyType,
  autoCapitalize = "sentences",
  multiline = false,
  maxLength,
  editable = true,
  onSubmitEditing,
  style,
  testID,
}: InputProps) {
  const theme = useTheme();
  const hasError = typeof error === "string" && error.length > 0;

  return (
    <>
      {label ? (
        <Text variant="small" style={{ color: theme.color.textSecondary }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        onSubmitEditing={onSubmitEditing}
        testID={testID}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        style={[
          styles.field,
          {
            backgroundColor: theme.color.backgroundElement,
            borderColor: hasError ? theme.color.danger : theme.color.backgroundSelected,
            borderRadius: theme.radius.md,
            color: theme.color.text,
            paddingHorizontal: theme.space.md,
            paddingVertical: theme.space.sm,
          },
          style,
        ]}
      />
      {hasError ? (
        <Text variant="caption" style={{ color: theme.color.danger }}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
  },
});
