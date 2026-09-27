/**
 * Composer media strip (F1.2).
 *
 * Horizontal `expo-image` previews of the session picks with a per-thumb
 * remove button. Pure presentational — picking/uploading live in
 * `useComposerMedia` / `useComposerCreatePost`.
 */

import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

export type ComposerMediaStripProps = {
  uris: string[];
  onRemove: (index: number) => void;
  editable?: boolean;
};

const THUMB_SIZE = 72;

export function ComposerMediaStrip({ uris, onRemove, editable = true }: ComposerMediaStripProps) {
  const theme = useTheme();
  if (uris.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="composer-media-strip"
      contentContainerStyle={styles.row}
    >
      {uris.map((uri, index) => (
        <View
          key={`${uri}-${index}`}
          testID={`composer-media-thumb-${index}`}
          style={styles.thumbWrap}
        >
          <Image
            source={{ uri }}
            style={[styles.thumb, { borderRadius: theme.radius.md }]}
            contentFit="cover"
            transition={200}
          />
          {editable ? (
            <Pressable
              testID={`composer-media-remove-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
              onPress={() => onRemove(index)}
              style={[styles.remove, { backgroundColor: theme.color.backgroundElement }]}
            >
              <Text variant="small" style={styles.removeGlyph}>
                ×
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
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
  removeGlyph: {
    fontWeight: "700",
    lineHeight: 20,
  },
});
