/**
 * Feed skeleton — three gray cards for first-page pending.
 * Token colors only, no shimmer library.
 */

import { StyleSheet, View } from "react-native";

import { useTheme } from "@/shared/ui";

const SKELETON_CARDS = [0, 1, 2];
const SKELETON_CARD_HEIGHT = 160;

export function FeedSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      {SKELETON_CARDS.map((key) => (
        <View
          key={key}
          style={[
            styles.card,
            {
              backgroundColor: theme.color.backgroundElement,
              borderRadius: theme.radius.md,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    padding: 12,
  },
  card: {
    height: SKELETON_CARD_HEIGHT,
  },
});
