/**
 * Hashtag header (G2.2).
 *
 * Presentational: `#tag` + đếm bài. Count comes from the server total
 * (`postCount`) with a loaded-ids fallback; unknown tags show 0, never crash.
 */

import { StyleSheet, View } from "react-native";

import { Text } from "@/shared/ui";

export type HashtagHeaderProps = {
  tag: string;
  postCount: number | null;
  testID?: string;
};

export function HashtagHeader({ tag, postCount, testID = "hashtag-header" }: HashtagHeaderProps) {
  const count = postCount ?? 0;
  return (
    <View style={styles.root} testID={testID}>
      <Text variant="h2" testID="hashtag-title">
        #{tag}
      </Text>
      <Text variant="label" color="textSecondary" testID="hashtag-count">
        {count === 1 ? "1 post" : `${count} posts`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
