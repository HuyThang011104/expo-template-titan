/**
 * Owner menu for own posts (G1.3).
 *
 * The `...` affordance + `Sửa / Xóa` sheet + destructive delete confirm.
 * Delete runs through `useDeletePost` (server confirms first, then the id is
 * stripped from every list); failures show inline with retry. Edit
 * navigation stays feature-owned via `onEditPress` (entity never imports
 * a router or another feature).
 */

import { useImperativeHandle, useState, type ReactNode, type Ref } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Icon, Sheet, Text } from "@/shared/ui";

import { useDeletePost, usePost } from "../queries";

export type PostOwnerMenuHandle = {
  /** Opens the sheet — used by the card's long-press affordance. */
  open: () => void;
};

export type PostOwnerMenuProps = {
  postId: string;
  onEditPress: () => void;
  testID?: string;
  /** Cross-entity by design; the feature injects `<SaveButton variant="row" />`. */
  saveAffordance?: ReactNode;
  /** Injected for tests; defaults to the app client. */
  fetchImpl?: typeof fetch;
  /** React 19 ref-as-prop; lets `PostCard` open the sheet on long-press. */
  ref?: Ref<PostOwnerMenuHandle>;
};

export function PostOwnerMenu({
  postId,
  onEditPress,
  testID,
  saveAffordance,
  fetchImpl,
  ref,
}: PostOwnerMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeletePost(postId, { fetchImpl });
  const post = usePost(postId).data;

  const open = (): void => {
    remove.reset();
    setMenuOpen(true);
  };

  const closeAll = (): void => {
    setConfirming(false);
    setMenuOpen(false);
    remove.reset();
  };

  useImperativeHandle(ref, () => ({ open }));

  return (
    <>
      <Pressable
        testID={testID ?? `post-menu-${postId}`}
        accessibilityRole="button"
        accessibilityLabel="Post options"
        hitSlop={8}
        onPress={open}
        style={styles.touch}
      >
        <Icon name="more" size="md" color="textSecondary" />
      </Pressable>
      <Sheet
        visible={menuOpen}
        onClose={closeAll}
        title="Your post"
        testID={`post-menu-sheet-${postId}`}
      >
        {confirming ? (
          <View style={styles.confirm} testID={`post-delete-confirm-${postId}`}>
            <Text variant="title">Delete this post?</Text>
            <Text variant="body" color="textSecondary">
              It will disappear from feed, profile, and search. This can&apos;t be undone.
            </Text>
            {remove.isError ? (
              <Text variant="caption" color="textSecondary" testID={`post-delete-error-${postId}`}>
                Couldn&apos;t delete. Try again.
              </Text>
            ) : null}
            <View style={styles.buttons}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                testID={`post-delete-cancel-${postId}`}
                disabled={remove.isPending}
                onPress={() => {
                  setConfirming(false);
                  remove.reset();
                }}
              />
              <Button
                title={remove.isPending ? "Deleting…" : "Delete"}
                variant="primary"
                size="sm"
                testID={`post-delete-button-${postId}`}
                disabled={remove.isPending}
                loading={remove.isPending}
                onPress={() => {
                  remove.mutate(undefined, {
                    onSuccess: () => {
                      closeAll();
                    },
                  });
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.rows}>
            {saveAffordance}
            <Pressable
              testID={`post-edit-button-${postId}`}
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                onEditPress();
              }}
              style={styles.row}
            >
              <Text variant="body">Sửa bài viết</Text>
            </Pressable>
            <Pressable
              testID={`post-delete-open-${postId}`}
              accessibilityRole="button"
              onPress={() => {
                remove.reset();
                setConfirming(true);
              }}
              style={styles.row}
            >
              <Text variant="body">Xóa bài viết</Text>
            </Pressable>
            {post ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {post.body.slice(0, 60)}
              </Text>
            ) : null}
          </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  touch: {
    padding: 4,
  },
  rows: {
    gap: 4,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 12,
  },
  confirm: {
    gap: 12,
    paddingBottom: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
