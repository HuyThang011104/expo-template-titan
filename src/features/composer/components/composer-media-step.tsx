/**
 * Composer media step (P2 + P3 video).
 *
 * Media-first surface: pick photos (up to 4) or one video from the library or
 * OS camera, preview the selection, remove thumbs, or skip straight to a
 * text-only post. Picking and draft syncing stay in the screen/hook.
 */

import { Pressable, StyleSheet, View } from "react-native";

import type { PickedMedia } from "@/shared/media";
import { Button, Text } from "@/shared/ui";

import { ComposerMediaStrip } from "./composer-media-strip";

export type ComposerMediaStepProps = {
  items: PickedMedia[];
  maxMedia: number;
  canAddImages: boolean;
  canAddVideo: boolean;
  onAddImages: () => void;
  onTakePhoto: () => void;
  onAddVideo: () => void;
  onRecordVideo: () => void;
  onRemove: (index: number) => void;
  onTextOnly: () => void;
  error?: string | null;
};

export function ComposerMediaStep({
  items,
  maxMedia,
  canAddImages,
  canAddVideo,
  onAddImages,
  onTakePhoto,
  onAddVideo,
  onRecordVideo,
  onRemove,
  onTextOnly,
  error = null,
}: ComposerMediaStepProps) {
  const hasMedia = items.length > 0;
  const isVideo = items[0]?.kind === "video";

  return (
    <View style={styles.root} testID="composer-step-media">
      <View style={styles.content}>
        <View style={styles.intro}>
          <Text variant="h3" accessibilityRole="header">Add media</Text>
          <Text variant="caption" color="textSecondary">
            Choose up to {maxMedia} photos or one video, then add a caption on the next step.
          </Text>
        </View>

        {canAddImages ? (
          <View style={styles.actions}>
            <Button
              title="Choose photos"
              icon="image"
              variant="secondary"
              fullWidth
              testID="composer-media-add"
              onPress={onAddImages}
            />
            <Button
              title="Take a photo"
              icon="camera"
              variant="secondary"
              fullWidth
              testID="composer-camera"
              onPress={onTakePhoto}
            />
          </View>
        ) : null}

        {canAddVideo ? (
          <View style={styles.actions}>
            <Button
              title="Choose video"
              icon="play"
              variant="secondary"
              fullWidth
              testID="composer-media-video-add"
              onPress={onAddVideo}
            />
            <Button
              title="Record video"
              icon="camera"
              variant="secondary"
              fullWidth
              testID="composer-media-video-record"
              onPress={onRecordVideo}
            />
          </View>
        ) : null}

        <ComposerMediaStrip items={items} onRemove={onRemove} />

        <Text
          variant="caption"
          color="textSecondary"
          style={styles.count}
          accessibilityLiveRegion="polite"
          testID="composer-media-count"
        >
          {isVideo ? "1 video selected" : `${items.length}/${maxMedia} selected`}
        </Text>

        {isVideo ? (
          <Text variant="caption" color="textSecondary" style={styles.count}>
            Remove the video to choose photos instead.
          </Text>
        ) : null}

        {error ? (
          <Text
            variant="caption"
            color="danger"
            style={styles.count}
            accessibilityRole="alert"
            testID="composer-media-limit-error"
          >
            {error}
          </Text>
        ) : null}

        {!hasMedia ? (
          <Pressable
            testID="composer-text-only-button"
            accessibilityRole="button"
            accessibilityLabel="Write text only"
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
