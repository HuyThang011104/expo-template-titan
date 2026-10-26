import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from "react-native";

export type PressableProps = RNPressableProps & {
  /** Opacity applied while pressed. */
  pressedOpacity?: number;
};

/**
 * Pressable with the shared pressed feedback. Callers can still pass
 * `android_ripple`, `hitSlop`, and the rest of the native props.
 */
export function Pressable({ style, pressedOpacity = 0.6, ...rest }: PressableProps) {
  return (
    <RNPressable
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed ? { opacity: pressedOpacity } : undefined,
      ]}
      {...rest}
    />
  );
}
