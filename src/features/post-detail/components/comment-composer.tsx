/**
 * Comment composer (G1.2, PF3.1).
 *
 * Bottom input owned by the post-detail screen: validates 1–500 chars,
 * posts once per tap (button locks while pending, mutation never retries),
 * clears on success. Reply target is injected; the screen clears it.
 * The route is `Stack.Protected`, so a missing session only shows an
 * inline error and never crashes.
 *
 * Spec: docs/feel-spec.md §4.3. Pill `ComposerInput` (1–4 lines) plus an
 * `IconButton send` that only appears once there is text; the reply banner
 * sits above the pill. Keyboard avoidance stays on `react-native-keyboard-controller`.
 */

import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useQueryClient } from "@tanstack/react-query";

import { useCreateComment } from "@/entities/comment";
import { parseRichText } from "@/entities/post";
import { canTagUser, getUserByHandleData, useMe } from "@/entities/user";
import { useSession } from "@/shared/auth";
import { findBlockedMentionHandles } from "@/shared/lib/mention-gate";
import { ComposerInput, Icon, IconButton, Text, useTheme } from "@/shared/ui";

export type ReplyTarget = {
  id: string;
  handle: string;
};

export type CommentComposerProps = {
  postId: string;
  replyTo: ReplyTarget | null;
  onClearReply: () => void;
  /** `focus=comment` (PF3.1): opens the detail with the input focused. */
  autoFocus?: boolean;
  fetchImpl?: typeof fetch;
};

export function CommentComposer({
  postId,
  replyTo,
  onClearReply,
  autoFocus = false,
  fetchImpl,
}: CommentComposerProps) {
  const { session } = useSession();
  const qc = useQueryClient();
  const me = useMe();
  const theme = useTheme();
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
    // G2.3: respect mentioned users' tagAudience before sending.
    const viewerId = me.data?.id ?? "";
    const handles = parseRichText(trimmed)
      .filter((segment) => segment.kind === "mention")
      .map((segment) => (segment.kind === "mention" ? segment.handle : ""));
    const blocked = findBlockedMentionHandles(
      handles,
      (handle) => getUserByHandleData(qc, handle)?.id,
      (targetId) => canTagUser(qc, targetId, viewerId),
    );
    if (blocked.length > 0) {
      setLocalError(`@${blocked[0]} không cho phép tag.`);
      return;
    }
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
      <View
        style={[styles.root, { borderTopColor: theme.color.border }]}
        testID="comment-composer"
      >
        {replyTo ? (
          <View style={styles.replyBanner}>
            <Text variant="label" color="textSecondary" testID="comment-reply-banner">
              Replying to @{replyTo.handle}
            </Text>
            <Pressable
              testID="comment-reply-cancel"
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
              hitSlop={8}
              onPress={onClearReply}
            >
              <Icon name="close" size="sm" color="textSecondary" decorative />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.row}>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: theme.color.surfaceSunken,
                borderRadius: theme.radius.full,
              },
            ]}
          >
            <ComposerInput
              value={body}
              onChangeText={(text) => {
                setBody(text);
                if (localError) setLocalError(null);
                if (create.isError) create.reset();
              }}
              placeholder={replyTo ? `Reply to @${replyTo.handle}…` : "Add a comment…"}
              minLines={1}
              maxLines={4}
              maxLength={500}
              editable={!create.isPending}
              autoFocus={autoFocus}
              accessibilityLabel="Comment"
              testID="comment-input"
            />
          </View>
          {trimmed.length > 0 ? (
            <IconButton
              icon="send"
              accessibilityLabel="Send comment"
              variant="primary"
              size="md"
              disabled={!canSend}
              testID="comment-send-button"
              onPress={send}
            />
          ) : null}
        </View>
        {error ? (
          <Text variant="caption" color="danger" testID="comment-error">
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
    borderTopWidth: StyleSheet.hairlineWidth,
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
  pill: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
  },
});
