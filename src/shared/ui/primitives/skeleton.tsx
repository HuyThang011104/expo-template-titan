import { useEffect } from "react";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { RadiusName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: RadiusName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Pulse placeholder. The pulse is disabled when the OS reports reduce motion,
 * leaving a static `skeleton` block.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = "sm",
  style,
  testID,
}: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    opacity.value = withRepeat(
      withTiming(0.45, { duration: theme.motion.slow }),
      -1,
      true,
    );
  }, [opacity, reduceMotion, theme.motion.slow]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: theme.radius[radius],
          backgroundColor: theme.color.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
