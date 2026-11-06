/**
 * Profile header scroll wiring (PF4.2 / PF4.3).
 *
 * Owns `scrollY` (the visible page's offset), the per-page offsets so each
 * pager tab keeps its own position, and the sticky-tabs progress derived from
 * `tabsTop`. The scroll handlers are Reanimated worklets, so offsets are
 * written on the UI thread and the overlay header/title stay frame-locked to
 * the native list instead of trailing the JS bridge. React never re-renders
 * per frame.
 *
 * Spec: docs/feel-spec.md §4.4.1 and §4.4 (PF4.3).
 */

import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import {
  useAnimatedScrollHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { ProfileHeaderTitle } from "../components/profile-title";
import type { TitleSwitchRange } from "../lib/title-progress";

/** Native header height used to start the fade before the block clears it. */
const HEADER_HEIGHT = 48;
/** Crossfade length between the stuck in-list tabs and the sticky overlay. */
const FADE_DISTANCE = 32;

export type UseProfileTitleTransitionArgs = {
  handle: string;
  displayName: string;
  /** Restored on unmount so the stack never keeps a stale custom title. */
  fallbackTitle: string;
  /** Install the title only once the canonical user data is available. */
  ready: boolean;
};

export type ProfileTabKey = "posts" | "saved";

export type ProfileTitleTransition = {
  /** Offset of the active page; drives the header, title, and sticky tabs. */
  scrollY: SharedValue<number>;
  /** Switches the active page and points the chrome at `offset`. */
  activateTab: (tab: ProfileTabKey, offset: number) => void;
  /** Last reported offset for a page (used to align pages on tab change). */
  getPageScrollY: (tab: ProfileTabKey) => number;
  /** Updates a page offset after an imperative scroll. */
  setPageScrollY: (tab: ProfileTabKey, offset: number) => void;
  /** Top edge of the in-list tabs, in list content coordinates. */
  tabsTop: SharedValue<number>;
  /** 0 → 1 after the in-list tabs reach the native header. */
  stickyProgress: SharedValue<number>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollFor: (tab: ProfileTabKey) => (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
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
  const reduceMotion = useReducedMotion();
  const switchRange = useSharedValue<TitleSwitchRange>({
    start: Number.POSITIVE_INFINITY,
    end: Number.POSITIVE_INFINITY,
  });
  // 0 = not measured yet (the header does not move and the overlay stays hidden).
  const tabsTop = useSharedValue(0);
  const activeTab = useSharedValue<ProfileTabKey>("posts");
  const postsScrollY = useSharedValue(0);
  const savedScrollY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // The header stops translating when the tabs reach the top, so the two tab
  // bars crossfade at the same position instead of one chasing the other.
  const stickyProgress = useDerivedValue(() => {
    const top = tabsTop.get();
    if (top <= 0) return 0;
    const scroll = scrollY.get();
    if (reduceMotion) return scroll >= top ? 1 : 0;
    const raw = (scroll - top) / FADE_DISTANCE;
    return raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  });

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

  const activateTab = useCallback(
    (tab: ProfileTabKey, offset: number): void => {
      const value = Math.max(0, offset);
      activeTab.set(tab);
      if (tab === "saved") {
        savedScrollY.set(value);
      } else {
        postsScrollY.set(value);
      }
      scrollY.set(value);
    },
    [activeTab, postsScrollY, savedScrollY, scrollY],
  );

  const getPageScrollY = useCallback(
    (tab: ProfileTabKey): number => (tab === "saved" ? savedScrollY.get() : postsScrollY.get()),
    [postsScrollY, savedScrollY],
  );

  const setPageScrollY = useCallback(
    (tab: ProfileTabKey, offset: number): void => {
      if (tab === "saved") {
        savedScrollY.set(offset);
      } else {
        postsScrollY.set(offset);
      }
    },
    [postsScrollY, savedScrollY],
  );

  const postsScroll = useAnimatedScrollHandler(
    (event) => {
      const value = event.contentOffset.y;
      postsScrollY.set(value);
      if (activeTab.get() === "posts") scrollY.set(value);
    },
    [activeTab, postsScrollY, scrollY],
  );

  const savedScroll = useAnimatedScrollHandler(
    (event) => {
      const value = event.contentOffset.y;
      savedScrollY.set(value);
      if (activeTab.get() === "saved") scrollY.set(value);
    },
    [activeTab, savedScrollY, scrollY],
  );

  const onScrollFor = useCallback(
    (tab: ProfileTabKey) => (tab === "saved" ? savedScroll : postsScroll),
    [postsScroll, savedScroll],
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
      tabsTop.set(event.nativeEvent.layout.y);
    },
    [tabsTop],
  );

  return {
    scrollY,
    tabsTop,
    stickyProgress,
    activateTab,
    getPageScrollY,
    setPageScrollY,
    onScroll: postsScroll,
    onScrollFor,
    onIdentityLayout,
    onTabsLayout,
  };
}
