import { forwardRef, useImperativeHandle, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import type { ProfilePagerProps, ProfilePagerRef } from "./profile-pager";

/** Web fallback: preserve tap tabs without importing the native pager. */
export const ProfilePager = forwardRef<ProfilePagerRef, ProfilePagerProps>(function ProfilePager(
  { pageIndex, onPageSelected, children, testID = "profile-pager" },
  ref,
) {
  useImperativeHandle(
    ref,
    () => ({
      setPage: (page) => onPageSelected(page),
      setPageWithoutAnimation: (page) => onPageSelected(page),
    }),
    [onPageSelected],
  );

  const page = children[pageIndex] ?? children[0];

  return (
    <View testID={testID} style={styles.container}>
      {page as ReactElement}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
