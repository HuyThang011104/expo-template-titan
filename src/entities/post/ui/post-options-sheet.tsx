/**
 * Viewer options sheet for a post (F14).
 *
 * The `...` affordance + long-press both open this sheet. Report is
 * intentionally not an entry point here. Save stays cross-entity and is
 * injected as a row; hide is feature-owned so the feed can filter locally.
 */

import { useImperativeHandle, useState, type ReactNode, type Ref } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Icon, ListItem, Sheet } from "@/shared/ui";

export type PostOptionsSheetHandle = {
  /** Opens the sheet — used by the card's long-press affordance. */
  open: () => void;
};

export type PostOptionsSheetProps = {
  postId: string;
  testID?: string;
  onHidePress?: () => void;
  /** Cross-entity by design; the feature injects `<SaveButton variant="row" />`. */
  saveAffordance?: ReactNode;
  /** React 19 ref-as-prop; lets `PostCard` open the sheet on long-press. */
  ref?: Ref<PostOptionsSheetHandle>;
};

export function PostOptionsSheet({
  postId,
  testID,
  onHidePress,
  saveAffordance,
  ref,
}: PostOptionsSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const show = (): void => {
    setMounted(true);
    setOpen(true);
  };

  useImperativeHandle(ref, () => ({ open: show }));

  return (
    <>
      <Pressable
        testID={testID ?? `post-options-${postId}`}
        accessibilityRole="button"
        accessibilityLabel="Post options"
        hitSlop={8}
        onPress={show}
        style={styles.touch}
      >
        <Icon name="more" size="md" color="textSecondary" />
      </Pressable>
      {mounted ? (
        <Sheet
          visible={open}
          onClose={() => {
            setOpen(false);
          }}
          title="Post options"
          testID={`post-options-sheet-${postId}`}
        >
          <View style={styles.rows}>
            {saveAffordance}
            {onHidePress ? (
              <ListItem
                testID={`post-hide-${postId}`}
                title="Hide post"
                leading={<Icon name="eyeOff" size="md" color="textSecondary" decorative />}
                onPress={() => {
                  setOpen(false);
                  onHidePress();
                }}
              />
            ) : null}
            <ListItem
              testID={`post-options-cancel-${postId}`}
              title="Cancel"
              onPress={() => {
                setOpen(false);
              }}
            />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rows: {
    gap: 4,
    paddingBottom: 8,
  },
});
