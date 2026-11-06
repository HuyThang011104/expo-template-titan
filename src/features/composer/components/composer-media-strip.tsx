/**
 * Composer media strip (F1.2 + P3 video).
 *
 * Horizontal previews of the session picks with a per-thumb remove button.
 * Images use `expo-image`; videos show a play placeholder + duration (no
 * player in the strip). Pure presentational — picking/uploading live in
 * `useComposerMedia` / `useComposerCreatePost`.
 */

import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { PickedMedia } from "@/shared/media";
import { Icon, Text } from "@/shared/ui";
import { useTheme } from "@/shared/ui/theme/use-theme";

export type ComposerMediaStripProps = {
  items: PickedMedia[];
  onRemove: (index: number) => void;
  editable?: boolean;
};

const THUMB_SIZE = 72;

function formatDuration(durationMs: number | null | undefined): string | null {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ComposerMediaStrip({ items, onRemove, editable = true }: ComposerMediaStripProps) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="composer-media-strip"
      contentContainerStyle={styles.row}
    >
      {items.map((item, index) => {
        const duration = formatDuration(item.duration);
        return (
          <View
            key={`${item.uri}-${index}`}
            testID={`composer-media-thumb-${index}`}
            style={styles.thumbWrap}
          >
            {item.kind === "video" ? (
              <View
                testID={`composer-media-video-${index}`}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Video ${index + 1}${duration ? `, ${duration}` : ""}`}
                style={[
                  styles.videoThumb,
                  { borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceMuted },
                ]}
              >
                <Icon name="play" size="lg" color="textSecondary" decorative />
                {duration ? (
                  <View style={[styles.duration, { backgroundColor: theme.color.surface }]}>
                    <Text variant="caption" color="textPrimary">
                      {duration}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Image
                source={{ uri: item.uri }}
                style={[styles.thumb, { borderRadius: theme.radius.md }]}
                contentFit="cover"
                transition={200}
                accessible
                accessibilityLabel={`Photo ${index + 1}`}
              />
            )}
            {editable ? (
              <Pressable
                testID={`composer-media-remove-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove media ${index + 1}`}
                onPress={() => onRemove(index)}
                style={[styles.remove, { backgroundColor: theme.color.surfaceMuted }]}
              >
                <Icon name="close" size="sm" color="textPrimary" />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  videoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  duration: {
    position: "absolute",
    right: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
