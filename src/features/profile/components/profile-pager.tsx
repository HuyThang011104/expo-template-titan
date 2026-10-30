import PagerView, { type PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactElement } from "react";
import { StyleSheet } from "react-native";

export type ProfilePagerRef = {
  setPage: (page: number) => void;
  setPageWithoutAnimation: (page: number) => void;
};

export type ProfilePagerProps = {
  pageIndex: number;
  onPageSelected: (page: number) => void;
  children: ReactElement[];
  testID?: string;
};

/**
 * Native horizontal pager for profile tabs. Each child must be a full-screen
 * View so FlashList owns vertical scrolling inside its own page.
 */
export const ProfilePager = forwardRef<ProfilePagerRef, ProfilePagerProps>(function ProfilePager(
  { pageIndex, onPageSelected, children, testID = "profile-pager" },
  ref,
) {
  const pagerRef = useRef<PagerView>(null);
  const selectedPage = useRef(pageIndex);

  useImperativeHandle(
    ref,
    () => ({
      setPage: (page) => {
        selectedPage.current = page;
        pagerRef.current?.setPage(page);
      },
      setPageWithoutAnimation: (page) => {
        selectedPage.current = page;
        pagerRef.current?.setPageWithoutAnimation(page);
      },
    }),
    [],
  );

  useEffect(() => {
    if (pageIndex === selectedPage.current) return;
    selectedPage.current = pageIndex;
    pagerRef.current?.setPage(pageIndex);
  }, [pageIndex]);

  const handlePageSelected = (event: PagerViewOnPageSelectedEvent): void => {
    const page = Math.round(event.nativeEvent.position);
    selectedPage.current = page;
    onPageSelected(page);
  };

  return (
    <PagerView
      ref={pagerRef}
      style={styles.container}
      initialPage={pageIndex}
      onPageSelected={handlePageSelected}
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
