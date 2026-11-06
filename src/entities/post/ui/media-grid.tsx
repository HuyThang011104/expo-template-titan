/**
 * Post media layout — one surface for feed, search, hashtag and profile lists.
 *
 * Spec: docs/feel-spec.md §4.1 / §5.3 (F6, PD8). `PostMedia` has no width or
 * height, so ratios are fixed: a single image is 4:5 capped at 420, grids use
 * square cells. Videos render as a dark tile with a play badge; a single video
 * stays on `PostVideo` in `PostCard` and never reaches this component.
 *
 * Renders only — no fetching and no navigation. The owning feature passes
 * `onPress` for the media viewer.
 */

import { Image } from "expo-image";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Icon, useTheme } from "@/shared/ui";

import type { PostMedia } from "../model";

export type MediaGridProps = {
  media: PostMedia[];
  onPress?: (index: number) => void;
  /** Cap for the single-media ratio. Defaults to 420; ignored by `feed`. */
  maxHeight?: number;
  /** `feed` is edge-to-edge with no radius; `card` keeps the inset frame. */
  variant?: "feed" | "card";
  testID?: string;
};

const SINGLE_ASPECT_RATIO = 4 / 5;
const SINGLE_MAX_HEIGHT = 420;

export function MediaGrid({
  media,
  onPress,
  maxHeight = SINGLE_MAX_HEIGHT,
  variant = "card",
  testID,
}: MediaGridProps) {
  const theme = useTheme();

  if (media.length === 0) return null;

  const gap = variant === "feed" ? 2 : theme.space[1];
  const radius = variant === "feed" ? 0 : theme.radius.md;
  const singleStyle =
    variant === "feed"
      ? { aspectRatio: SINGLE_ASPECT_RATIO, borderRadius: 0 }
      : { aspectRatio: SINGLE_ASPECT_RATIO, maxHeight, borderRadius: radius };

  if (media.length === 1) {
    return (
      <View testID={testID} style={styles.single}>
        <MediaTile
          item={media[0]}
          index={0}
          count={1}
          onPress={onPress}
          testID={testID ? `${testID}-0` : undefined}
          style={singleStyle}
        />
      </View>
    );
  }

  if (media.length === 2) {
    return (
      <View testID={testID} style={[styles.row, { gap }]}>
        {media.map((item, index) => (
          <MediaTile
            key={`${item.url}-${index}`}
            item={item}
            index={index}
            count={media.length}
            onPress={onPress}
            testID={testID ? `${testID}-${index}` : undefined}
            style={[styles.cell, { borderRadius: radius }]}
          />
        ))}
      </View>
    );
  }

  if (media.length === 3) {
    return (
      <View testID={testID} style={[styles.row, { gap }]}>
        <MediaTile
          item={media[0]}
          index={0}
          count={3}
          onPress={onPress}
          testID={testID ? `${testID}-0` : undefined}
          style={[styles.largeCell, { borderRadius: radius }]}
        />
        <View style={[styles.column, { gap }]}>
          {media.slice(1).map((item, offset) => {
            const index = offset + 1;
            return (
              <MediaTile
                key={`${item.url}-${index}`}
                item={item}
                index={index}
                count={3}
                onPress={onPress}
                testID={testID ? `${testID}-${index}` : undefined}
                style={[styles.smallCell, { borderRadius: radius }]}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.row, { gap }]}>
      <View style={[styles.column, { gap }]}>
        <MediaTile
          item={media[0]}
          index={0}
          count={media.length}
          onPress={onPress}
          testID={testID ? `${testID}-0` : undefined}
          style={[styles.cell, { borderRadius: radius }]}
        />
        <MediaTile
          item={media[2]}
          index={2}
          count={media.length}
          onPress={onPress}
          testID={testID ? `${testID}-2` : undefined}
          style={[styles.cell, { borderRadius: radius }]}
        />
      </View>
      <View style={[styles.column, { gap }]}>
        <MediaTile
          item={media[1]}
          index={1}
          count={media.length}
          onPress={onPress}
          testID={testID ? `${testID}-1` : undefined}
          style={[styles.cell, { borderRadius: radius }]}
        />
        <MediaTile
          item={media[3]}
          index={3}
          count={media.length}
          onPress={onPress}
          testID={testID ? `${testID}-3` : undefined}
          style={[styles.cell, { borderRadius: radius }]}
        />
      </View>
    </View>
  );
}

type MediaTileProps = {
  item: PostMedia;
  index: number;
  count: number;
  onPress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function MediaTile({ item, index, count, onPress, style, testID }: MediaTileProps) {
  const theme = useTheme();
  const video = item.kind === "video";
  const label = video ? `Video ${index + 1} of ${count}` : `Media ${index + 1} of ${count}`;
  const videoTestID = testID ? `${testID}-video` : undefined;

  const content = video ? (
    <View testID={videoTestID} style={[styles.videoTile, { backgroundColor: theme.color.overlay }]}>
      <View style={[styles.playBadge, { backgroundColor: theme.color.primary }]}>
        <Icon name="play" size="md" color="onPrimary" decorative />
      </View>
    </View>
  ) : (
    <Image
      source={{ uri: item.url }}
      style={styles.image}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={200}
    />
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        style={[styles.tile, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      style={[styles.tile, style]}
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  single: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
  column: {
    flex: 1,
  },
  tile: {
    overflow: "hidden",
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
  largeCell: {
    flex: 2,
    aspectRatio: 1,
  },
  smallCell: {
    flex: 1,
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
