/**
 * Save toggle button (G1.4).
 *
 * Entity UI so feed/detail/search share one button: reads `useIsSaved`,
 * toggles via the optimistic entity cache, fails inline with rollback
 * (no auto-retry). `variant="row"` renders the same toggle as an options
 * sheet row; the feed keeps Save out of the action row (F14).
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Icon, ListItem, Text, useTheme } from "@/shared/ui";

import { useIsSaved, useSetSaved } from "../queries";

export type SaveButtonProps = {
  postId: string;
  testID?: string;
  /** `row` is the three-dot sheet treatment; `icon` is the compact toggle. */
  variant?: "icon" | "row";
  /** Injected for tests; defaults to the app client. */
  fetchImpl?: typeof fetch;
};

export function SaveButton({ postId, testID, variant = "icon", fetchImpl }: SaveButtonProps) {
  const theme = useTheme();
  const saved = useIsSaved(postId, { fetchImpl });
  const toggle = useSetSaved(postId, { fetchImpl });
  const id = testID ?? `save-button-${postId}`;

  function handlePress(): void {
    toggle.reset();
    toggle.mutate(!saved);
  }

  if (variant === "row") {
    return (
      <View style={styles.root}>
        <ListItem
          testID={id}
          title={saved ? "Saved" : "Save post"}
          leading={
            <Icon
              name={saved ? "bookmarkFill" : "bookmark"}
              size="md"
              color={saved ? "primary" : "textSecondary"}
              decorative
            />
          }
          disabled={toggle.isPending}
          onPress={handlePress}
        />
        {toggle.isError ? (
          <Text variant="caption" color="textSecondary" testID={`save-error-${postId}`}>
            Couldn&apos;t save. Tap to retry.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={saved ? "Saved" : "Save"}
        accessibilityState={{ selected: saved, busy: toggle.isPending }}
        disabled={toggle.isPending}
        hitSlop={theme.space[1]}
        onPress={handlePress}
        style={styles.touch}
      >
        <Icon
          name={saved ? "bookmarkFill" : "bookmark"}
          size="md"
          color={saved ? "primary" : "textSecondary"}
          decorative
        />
      </Pressable>
      {toggle.isError ? (
        <Text variant="caption" color="textSecondary" testID={`save-error-${postId}`}>
          Couldn&apos;t save. Tap to retry.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-start",
    gap: 4,
  },
  touch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
