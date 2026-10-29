/**
 * Save toggle button (G1.4).
 *
 * Entity UI so feed/detail/search share one button: reads `useIsSaved`,
 * toggles via the optimistic entity cache, fails inline with rollback
 * (no auto-retry). Saved rows render through canonical `PostCard`, so the
 * Saved tab updates with no extra fetch.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Icon, Text, useTheme } from "@/shared/ui";

import { useIsSaved, useSetSaved } from "../queries";

export type SaveButtonProps = {
  postId: string;
  testID?: string;
  /** Injected for tests; defaults to the app client. */
  fetchImpl?: typeof fetch;
};

export function SaveButton({ postId, testID, fetchImpl }: SaveButtonProps) {
  const theme = useTheme();
  const saved = useIsSaved(postId, { fetchImpl });
  const toggle = useSetSaved(postId, { fetchImpl });
  const id = testID ?? `save-button-${postId}`;

  return (
    <View style={styles.root}>
      <Pressable
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={saved ? "Saved" : "Save"}
        accessibilityState={{ selected: saved, busy: toggle.isPending }}
        disabled={toggle.isPending}
        hitSlop={theme.space[1]}
        onPress={() => {
          toggle.reset();
          toggle.mutate(!saved);
        }}
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
