/**
 * Q7 header title crossfade (PF4.2).
 *
 * Two stacked `Text`s: `@handle` fades out while the display name fades in
 * as the identity block scrolls under the native header. Opacity comes from
 * Reanimated shared values, so scrolling never re-renders the navigator; the
 * accessibility label is the only JS update, and it flips once per crossing.
 *
 * Spec: docs/feel-spec.md §4.4.1.
 */

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

import { useTheme } from "@/shared/ui";
import { headerTitleStyle } from "@/shared/ui/navigation/header-options";

import {
  isTitleSwitched,
  titleAccessibilityLabel,
  titleProgress,
  titleProgressSnapped,
  type TitleSwitchRange,
} from "../lib/title-progress";

export type ProfileHeaderTitleProps = {
  scrollY: SharedValue<number>;
  switchRange: SharedValue<TitleSwitchRange>;
  handle: string;
  displayName: string;
};

export function ProfileHeaderTitle({
  scrollY,
  switchRange,
  handle,
  displayName,
}: ProfileHeaderTitleProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [switched, setSwitched] = useState(false);

  const progress = useDerivedValue(() =>
    reduceMotion
      ? titleProgressSnapped(scrollY.get(), switchRange.get())
      : titleProgress(scrollY.get(), switchRange.get()),
  );

  // One JS update per threshold crossing — never per frame.
  useAnimatedReaction(
    () => isTitleSwitched(progress.get()),
    (current, previous) => {
      if (current !== previous) runOnJS(setSwitched)(current);
    },
    [progress],
  );

  const handleStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const textStyle = [styles.text, headerTitleStyle(theme)];

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={titleAccessibilityLabel(switched, handle, displayName)}
      testID="profile-title"
    >
      <Animated.Text
        style={[textStyle, nameStyle]}
        numberOfLines={1}
        accessible={false}
        testID="profile-title-name"
      >
        {displayName}
      </Animated.Text>
      <Animated.Text
        style={[textStyle, styles.overlay, handleStyle]}
        numberOfLines={1}
        accessible={false}
        testID="profile-title-handle"
      >
        @{handle}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "60%",
  },
  text: {
    textAlign: "left",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
