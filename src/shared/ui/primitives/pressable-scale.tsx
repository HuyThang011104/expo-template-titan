import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { motion } from "../theme/primitive";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Disabled when reduce motion is on. */
  scaleTo?: number;
  /** Opacity while pressed. */
  pressedOpacity?: number;
};

/**
 * Pressable with the shared scale + opacity feedback. Reduce motion keeps the
 * opacity and drops the scale. Callers still own `onPress` and `testID`.
 */
export function PressableScale({
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  scaleTo = 0.97,
  pressedOpacity = 0.85,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = 1 - pressed.value * (1 - pressedOpacity);

    if (reduceMotion) return { opacity };

    return {
      opacity,
      transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={(event) => {
        if (!disabled) {
          pressed.value = withTiming(1, {
            duration: motion.fast,
            easing: Easing.bezier(...motion.easing.standard),
          });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.6 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
