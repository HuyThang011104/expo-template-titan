/**
 * Borderless auto-growing text input for composer surfaces.
 *
 * Spec: docs/feel-spec.md §5.2. Grows from `minLines` to `maxLines` and then
 * scrolls. Controlled; callers own draft state. Not wrapped in `Field`.
 */

import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputContentSizeChangeEventData,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { useTheme } from "../theme/use-theme";

export type ComposerInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minLines?: number;
  maxLines?: number;
  autoFocus?: boolean;
  maxLength?: number;
  editable?: boolean;
  accessibilityLabel?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export function ComposerInput({
  value,
  onChangeText,
  placeholder,
  minLines = 2,
  maxLines = 12,
  autoFocus = false,
  maxLength,
  editable = true,
  accessibilityLabel,
  onSubmitEditing,
  returnKeyType,
  style,
  testID,
}: ComposerInputProps) {
  const theme = useTheme();
  const lineHeight = theme.type.body.lineHeight;
  const minHeight = minLines * lineHeight;
  const maxHeight = maxLines * lineHeight;

  const [height, setHeight] = useState(minHeight);
  const [scrollEnabled, setScrollEnabled] = useState(false);

  function handleContentSizeChange(
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) {
    const contentHeight = event.nativeEvent.contentSize.height;
    const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

    setHeight(nextHeight);
    setScrollEnabled(contentHeight > maxHeight);
  }

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.color.textTertiary}
      multiline
      scrollEnabled={scrollEnabled}
      maxLength={maxLength}
      editable={editable}
      autoFocus={autoFocus}
      onContentSizeChange={handleContentSizeChange}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !editable }}
      style={[
        styles.input,
        theme.type.body,
        {
          color: theme.color.textPrimary,
          minHeight,
          maxHeight,
          height,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    flexGrow: 1,
    flexShrink: 1,
    padding: 0,
    textAlignVertical: "top",
  },
});
