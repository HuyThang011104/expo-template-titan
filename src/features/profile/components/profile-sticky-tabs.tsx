/**
 * Sticky tabs overlay (PF4.3).
 *
 * Sits under the native header over the list, fading in with the shared
 * `stickyProgress` value owned by the profile scroll hook. The same progress
 * fades the in-list tabs out, so the two bars never read as duplicates.
 *
 * Spec: docs/feel-spec.md §4.4 (PF4.3).
 */

import { useCallback, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Tabs, useTheme } from "@/shared/ui";

export type ProfileStickyTabsProps = {
  /** 0 → 1 after the in-list tabs reach the header top. */
  progress: SharedValue<number>;
  value: string;
  onChange: (key: string) => void;
  /** Lets the screen hide the in-list tabs from screen readers (no duplicates). */
  onShownChange?: (shown: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export function ProfileStickyTabs({
  progress,
  value,
  onChange,
  onShownChange,
  style,
}: ProfileStickyTabsProps) {
  const theme = useTheme();
  const [shown, setShown] = useState(false);

  const handleShown = useCallback(
    (next: boolean) => {
      setShown(next);
      onShownChange?.(next);
    },
    [onShownChange],
  );

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
      style={[styles.container, style]}
    >
      <Animated.View style={[opacityStyle, { backgroundColor: theme.color.surface }]}>
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
