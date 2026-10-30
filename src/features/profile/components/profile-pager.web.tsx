import { forwardRef, useImperativeHandle, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import type { ProfilePagerProps, ProfilePagerRef } from "./profile-pager";

/**
 * Web fallback: tap tabs still work through the screen's `tab` state, so the
 * pager only has to render the selected child. Swipe is native-only.
 */
export const ProfilePager = forwardRef<ProfilePagerRef, ProfilePagerProps>(function ProfilePager(
  { pageIndex = 0, children, testID = "profile-pager" },
  ref,
) {
  useImperativeHandle(
    ref,
    () => ({
      setPage: () => {},
      setPageWithoutAnimation: () => {},
    }),
    [],
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
