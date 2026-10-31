/**
 * Composer media step (P2).
 *
 * Media-first surface: pick images (library or camera), preview the current
 * selection, remove thumbs, or skip straight to a text-only post. Picking and
 * draft syncing stay in the screen/hook; this component is presentational.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Button, Text } from "@/shared/ui";

import { ComposerMediaStrip } from "./composer-media-strip";

export type ComposerMediaStepProps = {
  uris: string[];
  maxMedia: number;
  canAddMore: boolean;
  onAdd: () => void;
  onTakePhoto: () => void;
  onRemove: (index: number) => void;
  onTextOnly: () => void;
};

export function ComposerMediaStep({
  uris,
  maxMedia,
  canAddMore,
  onAdd,
  onTakePhoto,
  onRemove,
  onTextOnly,
}: ComposerMediaStepProps) {
  const hasMedia = uris.length > 0;

  return (
    <View style={styles.root} testID="composer-step-media">
      <View style={styles.content}>
        <View style={styles.intro}>
          <Text variant="h3">Add photos</Text>
          <Text variant="caption" color="textSecondary">
            Choose up to {maxMedia} photos, then add a caption on the next step.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Choose from library"
            icon="image"
            variant="secondary"
            fullWidth
            disabled={!canAddMore}
            testID="composer-media-add"
            onPress={onAdd}
          />
          <Button
            title="Take a photo"
            icon="camera"
            variant="secondary"
            fullWidth
            disabled={!canAddMore}
            testID="composer-camera"
            onPress={onTakePhoto}
          />
        </View>

        <ComposerMediaStrip uris={uris} onRemove={onRemove} />

        <Text
          variant="caption"
          color="textSecondary"
          style={styles.count}
          testID="composer-media-count"
        >
          {uris.length}/{maxMedia} selected
        </Text>

        {!hasMedia ? (
          <Pressable
            testID="composer-text-only-button"
            accessibilityRole="button"
            onPress={onTextOnly}
            style={styles.textOnly}
          >
            <Text variant="link">Write text only</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 12,
    padding: 16,
    justifyContent: "center",
  },
  intro: {
    gap: 4,
  },
  actions: {
    gap: 8,
  },
  count: {
    textAlign: "center",
  },
  textOnly: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
