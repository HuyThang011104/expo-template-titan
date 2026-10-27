/**
 * Edit post screen (G1.3, `formSheet`).
 *
 * - Post id comes from route params (`postId`).
 * - Text-only edit (1–280 chars, media untouched): prefilled input → Save →
 *   canonical overwrite → dismiss. Feed + detail + profile update together
 *   because they read the same canonical entry.
 * - Only the owner should ever open this (owner menu is owner-only, and the
 *   server 403s otherwise); a 403/404 surfaces inline, never a crash.
 */

import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { parseUpdatePostInput, usePost, useUpdatePost } from "@/entities/post";
import { Button, Input, Screen, Text } from "@/shared/ui";

export function handleEditPostDismiss(): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/");
}

export function EditPostScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  if (!postId) {
    return (
      <Screen style={styles.center} testID="edit-post-screen">
        <Text variant="body">Missing post id.</Text>
        <Button
          title="Dismiss"
          variant="secondary"
          size="sm"
          testID="edit-post-dismiss-button"
          onPress={handleEditPostDismiss}
        />
      </Screen>
    );
  }

  return <EditPostBody postId={postId} />;
}

function EditPostBody({ postId }: { postId: string }) {
  const post = usePost(postId);
  const update = useUpdatePost(postId);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = post.data?.body ?? "";
  const value = body ?? initial;
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= 280 && !update.isPending;

  if (post.isPending) {
    return (
      <Screen style={styles.center} testID="edit-post-screen">
        <Text variant="body" color="textSecondary">
          Loading post…
        </Text>
      </Screen>
    );
  }

  if (post.isError || !post.data) {
    return (
      <Screen style={styles.center} testID="edit-post-screen">
        <Text variant="h3">This post is gone</Text>
        <Text variant="body" color="textSecondary">
          It may have been deleted.
        </Text>
        <Button
          title="Dismiss"
          variant="secondary"
          size="sm"
          testID="edit-post-dismiss-button"
          onPress={handleEditPostDismiss}
        />
      </Screen>
    );
  }

  const save = (): void => {
    setError(null);
    if (!parseUpdatePostInput({ body: value })) {
      setError("Posts are 1–280 characters.");
      return;
    }
    update.mutate(trimmed, {
      onSuccess: () => {
        handleEditPostDismiss();
      },
      onError: () => {
        setError("Couldn't save your edit. Tap Save to retry.");
      },
    });
  };

  return (
    <Screen testID="edit-post-screen">
      <View style={styles.root}>
        <Input
          value={value}
          onChangeText={(next) => {
            setBody(next);
            if (error) setError(null);
            if (update.isError) update.reset();
          }}
          placeholder="What's happening?"
          multiline
          maxLength={280}
          editable={!update.isPending}
          autoFocus
          testID="edit-post-input"
          accessibilityLabel="Post body"
        />
        <Text variant="caption" color="textSecondary" testID="edit-post-counter">
          {`${trimmed.length}/280`}
        </Text>
        {error ? (
          <Text variant="caption" color="danger" testID="edit-post-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          <Button
            title="Cancel"
            variant="secondary"
            size="sm"
            testID="edit-post-cancel-button"
            disabled={update.isPending}
            onPress={handleEditPostDismiss}
          />
          <Button
            title={update.isPending ? "Saving…" : "Save"}
            variant="primary"
            size="sm"
            testID="edit-post-save-button"
            disabled={!canSave}
            loading={update.isPending}
            onPress={save}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  root: {
    gap: 12,
    padding: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
