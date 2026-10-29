/**
 * Q7 header title transition wiring (PF4.2).
 *
 * Owns the two shared values (`scrollY`, `switchRange`) and installs the
 * custom `headerTitle` exactly once per data change — never during scroll.
 * The scroll handler only writes one shared value; scrolling does not render
 * React or touch the navigator.
 *
 * Spec: docs/feel-spec.md §4.4.1.
 */

import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

import { ProfileHeaderTitle } from "../components/profile-title";
import type { TitleSwitchRange } from "../lib/title-progress";

/** Native header height used to start the fade before the block clears it. */
const HEADER_HEIGHT = 48;

export type UseProfileTitleTransitionArgs = {
  handle: string;
  displayName: string;
  /** Restored on unmount so the stack never keeps a stale custom title. */
  fallbackTitle: string;
  /** Install the title only once the canonical user data is available. */
  ready: boolean;
};

export type ProfileTitleTransition = {
  /** Reused by the sticky tabs overlay (PF4.3). */
  scrollY: SharedValue<number>;
  /** Bottom edge of the in-list tabs, in list content coordinates. */
  tabsBottom: SharedValue<number>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onIdentityLayout: (event: LayoutChangeEvent) => void;
  onTabsLayout: (event: LayoutChangeEvent) => void;
};

export function useProfileTitleTransition({
  handle,
  displayName,
  fallbackTitle,
  ready,
}: UseProfileTitleTransitionArgs): ProfileTitleTransition {
  const navigation = useNavigation();
  const scrollY = useSharedValue(0);
  const switchRange = useSharedValue<TitleSwitchRange>({
    start: Number.POSITIVE_INFINITY,
    end: Number.POSITIVE_INFINITY,
  });
  // 0 = not measured yet (the sticky overlay stays hidden).
  const tabsBottom = useSharedValue(0);

  // Stable element: the options effect must not re-run on scroll/renders.
  const title = useMemo(
    () =>
      handle.length > 0 && displayName.length > 0 ? (
        <ProfileHeaderTitle
          scrollY={scrollY}
          switchRange={switchRange}
          handle={handle}
          displayName={displayName}
        />
      ) : null,
    [displayName, handle, scrollY, switchRange],
  );

  useEffect(() => {
    if (!ready || !title) return;

    navigation.setOptions({ headerTitle: () => title });

    return () => {
      navigation.setOptions({ headerTitle: undefined, title: fallbackTitle });
    };
  }, [navigation, ready, title, fallbackTitle]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.set(event.nativeEvent.contentOffset.y);
    },
    [scrollY],
  );

  const onIdentityLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      switchRange.set({
        start: Math.max(0, y + height - HEADER_HEIGHT),
        end: y + height,
      });
    },
    [switchRange],
  );

  const onTabsLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      tabsBottom.set(y + height);
    },
    [tabsBottom],
  );

  return { scrollY, tabsBottom, onScroll, onIdentityLayout, onTabsLayout };
}
