/**
 * Save toggle button (G1.4).
 *
 * Entity UI so feed/detail/search share one button: reads `useIsSaved`,
 * toggles via the optimistic entity cache, fails inline with rollback
 * (no auto-retry). Saved rows render through canonical `PostCard`, so the
 * Saved tab updates with no extra fetch.
 */

import { StyleSheet, View } from "react-native";

import { Button, Text } from "@/shared/ui";

import { useIsSaved, useSetSaved } from "../queries";

export type SaveButtonProps = {
  postId: string;
  testID?: string;
  /** Injected for tests; defaults to the app client. */
  fetchImpl?: typeof fetch;
};

export function SaveButton({ postId, testID, fetchImpl }: SaveButtonProps) {
  const saved = useIsSaved(postId, { fetchImpl });
  const toggle = useSetSaved(postId, { fetchImpl });
  const id = testID ?? `save-button-${postId}`;

  return (
    <View style={styles.root}>
      <Button
        title={saved ? "Saved" : "Save"}
        testID={id}
        variant={saved ? "secondary" : "ghost"}
        size="sm"
        loading={toggle.isPending}
        onPress={() => {
          toggle.reset();
          toggle.mutate(!saved);
        }}
      />
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
});
