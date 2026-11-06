/**
 * Chat composer (F4 + G3.1). Controlled input + image attach + send button.
 * Draft persistence lives in `useChatDraft`; image state lives in `useChatImage`.
 * Image errors render inline and never clear the typed text.
 */

import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Icon, Input, Text, useTheme } from "@/shared/ui";

export type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  isSending: boolean;
  /** G2.3: locks the composer when the peer's messageAudience blocks us. */
  sendDisabled?: boolean;
  /** G3.1 image attachment (single image per message). */
  imageUri?: string | null;
  imageError?: string | null;
  isPickingImage?: boolean;
  isUploadingImage?: boolean;
  onPickImage?: () => void;
  onRemoveImage?: () => void;
};

export function ChatComposer({
  value,
  onChange,
  onSend,
  isSending,
  sendDisabled = false,
  imageUri = null,
  imageError = null,
  isPickingImage = false,
  isUploadingImage = false,
  onPickImage,
  onRemoveImage,
}: ChatComposerProps) {
  const theme = useTheme();
  const busy = isSending || isUploadingImage;
  const canSend = (value.trim().length > 0 || imageUri) && !busy && !sendDisabled;
  return (
    <View style={styles.column}>
      {imageError ? (
        <Text variant="caption" color="danger" testID="chat-image-error" style={styles.error}>
          {imageError}
        </Text>
      ) : null}
      {imageUri ? (
        <View style={styles.previewRow} testID="chat-image-preview">
          <Image
            source={imageUri}
            style={[styles.preview, { borderRadius: theme.radius.md }]}
            contentFit="cover"
          />
          <Pressable
            testID="chat-image-remove"
            accessibilityRole="button"
            accessibilityLabel="Remove image"
            onPress={onRemoveImage}
            style={styles.remove}
          >
            <Icon name="close" size="sm" color="textSecondary" />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        {onPickImage ? (
          <Button
            title={isPickingImage ? "..." : "Attach"}
            testID="chat-attach-button"
            variant="secondary"
            disabled={busy || isPickingImage}
            onPress={onPickImage}
          />
        ) : null}
        <View style={styles.flex}>
          <Input
            testID="chat-input"
            value={value}
            onChangeText={onChange}
            placeholder="Write a message..."
            multiline
            editable={!busy}
            onSubmitEditing={() => {
              if (canSend) onSend();
            }}
          />
        </View>
        <Button
          title={busy ? "Sending..." : "Send"}
          testID="chat-send-button"
          disabled={!canSend}
          loading={busy}
          onPress={onSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  error: {
    textAlign: "left",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  preview: {
    width: 96,
    height: 96,
  },
  remove: {
    marginLeft: 8,
    padding: 8,
  },
});
