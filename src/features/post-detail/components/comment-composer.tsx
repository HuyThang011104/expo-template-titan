/**
 * Comment composer (G1.2).
 *
 * Bottom input owned by the post-detail screen: validates 1–500 chars,
 * posts once per tap (button locks while pending, mutation never retries),
 * clears on success. Reply target is injected; the screen clears it.
 * The route is `Stack.Protected`, so a missing session only shows an
 * inline error and never crashes.
 */

import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { useCreateComment } from "@/entities/comment";
import { useSession } from "@/shared/auth";
import { Button, Input, Text } from "@/shared/ui";

export type ReplyTarget = {
  id: string;
  handle: string;
};

export type CommentComposerProps = {
  postId: string;
  replyTo: ReplyTarget | null;
  onClearReply: () => void;
  fetchImpl?: typeof fetch;
};

export function CommentComposer({ postId, replyTo, onClearReply, fetchImpl }: CommentComposerProps) {
  const { session } = useSession();
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const create = useCreateComment(postId, { fetchImpl });

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !create.isPending;

  const send = (): void => {
    if (!session) {
      setLocalError("Please sign in to comment.");
      return;
    }
    if (trimmed.length === 0) return;
    setLocalError(null);
    create.mutate(
      { body: trimmed, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setBody("");
          onClearReply();
        },
      },
    );
  };

  const error = localError ?? (create.isError ? "Couldn't post your comment. Tap Send to retry." : null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.root} testID="comment-composer">
        {replyTo ? (
          <View style={styles.replyBanner}>
            <Text variant="small" color="textSecondary" testID="comment-reply-banner">
              Replying to @{replyTo.handle}
            </Text>
            <Pressable
              testID="comment-reply-cancel"
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
              hitSlop={8}
              onPress={onClearReply}
            >
              <Text variant="small" color="textSecondary">
                ✕
              </Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.row}>
          <View style={styles.inputFlex}>
            <Input
              value={body}
              onChangeText={(text) => {
                setBody(text);
                if (localError) setLocalError(null);
                if (create.isError) create.reset();
              }}
              placeholder={replyTo ? `Reply to @${replyTo.handle}…` : "Write a comment…"}
              multiline
              maxLength={500}
              editable={!create.isPending}
              testID="comment-input"
            />
          </View>
          <Button
            title="Send"
            testID="comment-send-button"
            size="sm"
            disabled={!canSend}
            loading={create.isPending}
            onPress={send}
          />
        </View>
        {error ? (
          <Text variant="caption" color="textSecondary" testID="comment-error">
            {error}
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
});
