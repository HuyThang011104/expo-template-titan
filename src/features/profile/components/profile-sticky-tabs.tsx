/**
 * Sticky tabs overlay (PF4.3).
 *
 * Sits under the native header over the list, fading in when the in-list
 * tabs scroll past the overlay's top edge. Reuses the PF4.2 `scrollY` +
 * measured `tabsBottom`, so scrolling still never renders React: opacity is
 * native, and the only JS update is the interactive/a11y flag at the
 * threshold.
 *
 * Spec: docs/feel-spec.md §4.4 (item 1) and PF4.3 contract.
 */

import { useCallback, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

import { Tabs, useTheme } from "@/shared/ui";

/** Opacity ramp length before the in-list tabs fully clear the header. */
const FADE_DISTANCE = 32;

export type ProfileStickyTabsProps = {
  scrollY: SharedValue<number>;
  tabsBottom: SharedValue<number>;
  value: string;
  onChange: (key: string) => void;
  /** Lets the screen hide the in-list tabs from screen readers (no duplicates). */
  onShownChange?: (shown: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export function ProfileStickyTabs({
  scrollY,
  tabsBottom,
  value,
  onChange,
  onShownChange,
  style,
}: ProfileStickyTabsProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);

  const handleShown = useCallback(
    (next: boolean) => {
      setShown(next);
      onShownChange?.(next);
    },
    [onShownChange],
  );

  const progress = useDerivedValue(() => {
    const bottom = tabsBottom.get();
    if (bottom <= 0) return 0;
    const scroll = scrollY.get();
    if (reduceMotion) return scroll >= bottom ? 1 : 0;
    const start = Math.max(0, bottom - FADE_DISTANCE);
    const raw = (scroll - start) / FADE_DISTANCE;
    return raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  });

  useAnimatedReaction(
    () => progress.get() >= 1,
    (current, previous) => {
      if (current === previous) return;
      runOnJS(handleShown)(current);
    },
    [handleShown],
  );

  const opacityStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return (
    <View
      testID="profile-sticky-tabs"
      pointerEvents={shown ? "auto" : "none"}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
      style={[styles.container, { backgroundColor: theme.color.surface }, style]}
    >
      <Animated.View style={opacityStyle}>
        <Tabs
          variant="underline"
          items={[
            { key: "posts", label: "Posts", testID: "profile-sticky-tab-posts" },
            { key: "saved", label: "Saved", testID: "profile-sticky-tab-saved" },
          ]}
          value={value}
          onChange={onChange}
          testID="profile-sticky-tab-list"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
