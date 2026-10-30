import PagerView from "react-native-pager-view";
import { forwardRef, useImperativeHandle, useRef, type ReactElement } from "react";
import { StyleSheet } from "react-native";

export type ProfilePagerRef = {
  setPage: (page: number) => void;
  setPageWithoutAnimation: (page: number) => void;
};

export type ProfilePageScroll = {
  /** Page being left while swiping. */
  position: number;
  /** Progress toward the next page, 0 → 1. */
  offset: number;
};

export type ProfilePagerProps = {
  /** Page shown on mount. The native pager owns its index after that. */
  initialPage?: number;
  /** Web-only: selects which child is rendered (native pager ignores it). */
  pageIndex?: number;
  onPageSelected: (page: number) => void;
  /** Fires while a swipe or tab animation is in progress. */
  onPageScroll?: (event: ProfilePageScroll) => void;
  children: ReactElement[];
  testID?: string;
};

/**
 * Native horizontal pager for profile tabs. Each child must be a full-screen
 * View so FlashList owns vertical scrolling inside its own page.
 *
 * The pager is uncontrolled: taps call `setPage`, swipes report through
 * `onPageSelected`, and the screen keeps the single `tab` state. There is no
 * `pageIndex` effect fighting the gesture.
 */
export const ProfilePager = forwardRef<ProfilePagerRef, ProfilePagerProps>(function ProfilePager(
  { initialPage = 0, onPageSelected, onPageScroll, children, testID = "profile-pager" },
  ref,
) {
  const pagerRef = useRef<PagerView>(null);

  useImperativeHandle(
    ref,
    () => ({
      setPage: (page) => {
        pagerRef.current?.setPage(page);
      },
      setPageWithoutAnimation: (page) => {
        pagerRef.current?.setPageWithoutAnimation(page);
      },
    }),
    [],
  );

  return (
    <PagerView
      ref={pagerRef}
      style={styles.container}
      initialPage={initialPage}
      onPageSelected={(event) => {
        onPageSelected(Math.round(event.nativeEvent.position));
      }}
      onPageScroll={(event) => {
        onPageScroll?.({
          position: event.nativeEvent.position,
          offset: event.nativeEvent.offset,
        });
      }}
      testID={testID}
    >
      {children}
    </PagerView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
