/**
 * Feed skeleton — three flat rows that mirror the real `PostCard` anatomy
 * (author header, two body lines, media block, action row) so the swap to
 * content does not shift the layout. Built on the shared `Skeleton`
 * primitive (pulse, reduce-motion aware).
 */

import { StyleSheet, View } from "react-native";

import { Skeleton, useTheme } from "@/shared/ui";

const SKELETON_ROWS = [0, 1, 2];

function FeedSkeletonRow() {
  return (
    <View style={styles.row}>
      <View style={styles.authorRow}>
        <Skeleton width={40} height={40} radius="full" />
        <View style={styles.authorLines}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton height={14} width="92%" />
      <Skeleton height={14} width="70%" />
      <Skeleton height={220} radius="lg" />
      <View style={styles.actionsRow}>
        <Skeleton width={24} height={24} radius="full" />
        <Skeleton width={24} height={24} radius="full" />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  const theme = useTheme();

  return (
    <View testID="feed-skeleton" style={styles.root}>
      {SKELETON_ROWS.map((key) => (
        <View
          key={key}
          style={[styles.rowShell, { borderBottomColor: theme.color.border }]}
        >
          <FeedSkeletonRow />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "transparent",
  },
  rowShell: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  authorLines: {
    gap: 4,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
  },
});
