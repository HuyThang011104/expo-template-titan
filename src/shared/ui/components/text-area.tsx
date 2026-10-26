import { StyleSheet } from "react-native";

import { Input, type InputProps } from "./input";

export type TextAreaProps = Omit<InputProps, "multiline">;

/** Multiline input with the spec's 96pt minimum height. */
export function TextArea({ style, ...rest }: TextAreaProps) {
  return <Input {...rest} multiline style={[styles.area, style]} />;
}

const styles = StyleSheet.create({
  area: {
    minHeight: 96,
  },
});
