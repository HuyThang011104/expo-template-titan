/**
 * Composer details step (P2).
 *
 * Caption + selected media preview + submit readiness. Upload, outbox, and
 * mutation ownership stay in the screen; this component only renders state and
 * forwards edits (body text, remove thumb, go back to media).
 */

import { Pressable, StyleSheet, View } from "react-native";

import type { PickedMedia } from "@/shared/media";
import { Avatar, ComposerInput, CounterRing, Text, useTheme } from "@/shared/ui";

import { ComposerMediaStrip } from "./composer-media-strip";

export type ComposerDetailsStepProps = {
  displayName: string;
  avatarUrl: string | null;
  body: string;
  onChangeBody: (text: string) => void;
  items: PickedMedia[];
  onRemoveMedia: (index: number) => void;
  hasMedia: boolean;
  onChangeMedia: () => void;
  maxLength: number;
  trimmedLength: number;
  busy: boolean;
  isUploading: boolean;
  showRepickNote: boolean;
  error: string | null;
  queued: boolean;
};

export function ComposerDetailsStep({
  displayName,
  avatarUrl,
  body,
  onChangeBody,
  items,
  onRemoveMedia,
  hasMedia,
  onChangeMedia,
  maxLength,
  trimmedLength,
  busy,
  isUploading,
  showRepickNote,
  error,
  queued,
}: ComposerDetailsStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.root} testID="composer-step-details">
      <View style={styles.content}>
        <View style={styles.bodyRow}>
          <Avatar displayName={displayName} avatarUrl={avatarUrl} size={40} testID="composer-avatar" />
          <ComposerInput
            value={body}
            onChangeText={onChangeBody}
            placeholder="What's happening?"
            maxLength={maxLength}
            editable={!busy}
            autoFocus
            testID="composer-input"
            accessibilityLabel="Post body"
            style={styles.input}
          />
        </View>

        <ComposerMediaStrip items={items} onRemove={onRemoveMedia} editable={!busy} />

        {hasMedia && body.trim().length === 0 ? (
          <Text variant="caption" color="textSecondary" testID="composer-caption-optional">
            Caption is optional when you add media.
          </Text>
        ) : null}

        {isUploading ? (
          <Text variant="caption" color="textSecondary" testID="composer-uploading">
            Uploading…
          </Text>
        ) : null}

        {showRepickNote ? (
          <Text variant="caption" color="textSecondary" testID="composer-repick-note">
            Media from last time may need re-picking (tmp files don&apos;t survive restart).
          </Text>
        ) : null}

        {error ? (
          <Text
            variant="caption"
            color="danger"
            testID="composer-error"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        ) : null}

        {queued ? (
          <Text variant="caption" color="textSecondary" testID="composer-queued-badge">
            Queued — will send when online.
          </Text>
        ) : null}
      </View>

      <View
        testID="composer-toolbar"
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.color.surface,
            borderTopColor: theme.color.border,
          },
        ]}
      >
        <Pressable
          testID="composer-edit-media-button"
          accessibilityRole="button"
          accessibilityLabel={hasMedia ? "Change photos" : "Add photos"}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onChangeMedia}
          style={styles.toolbarAction}
        >
          <Text variant="label" color="primary">
            {hasMedia ? "Change photos" : "Add photos"}
          </Text>
        </Pressable>
        <View style={styles.toolbarSpacer} />
        <View style={styles.counterSlot}>
          <CounterRing
            value={trimmedLength}
            max={maxLength}
            warnFrom={(maxLength - 20) / maxLength}
            testID="composer-counter"
            accessibilityLabel={`${maxLength - trimmedLength} characters remaining`}
          />
        </View>
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
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  input: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarAction: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  toolbarSpacer: {
    flex: 1,
  },
  counterSlot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
