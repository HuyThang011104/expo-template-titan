/**
 * Feed skeleton — three card-shaped skeleton blocks for first-page pending.
 * Built on the shared `Skeleton` primitive (pulse, reduce-motion aware).
 */

import { StyleSheet, View } from "react-native";

import { Skeleton, useTheme } from "@/shared/ui";

const SKELETON_CARDS = [0, 1, 2];

function FeedSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Skeleton width={40} height={40} radius="full" />
        <View style={styles.authorLines}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton height={16} width="90%" />
      <Skeleton height={180} radius="lg" />
    </View>
  );
}

export function FeedSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      {SKELETON_CARDS.map((key) => (
        <View
          key={key}
          style={[
            styles.cardShell,
            {
              backgroundColor: theme.color.surface,
              borderColor: theme.color.border,
            },
          ]}
        >
          <FeedSkeletonCard />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    padding: 16,
  },
  cardShell: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  card: {
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  authorLines: {
    gap: 4,
  },
});
