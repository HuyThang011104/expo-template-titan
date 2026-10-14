/**
 * Follow button (G1.1).
 *
 * Entity UI so every surface (profile, followers rows, search later) shares
 * one button: reads the canonical `useRelationship`, toggles via the
 * optimistic entity cache, fails inline with rollback (no auto-retry).
 */

import { StyleSheet, View } from "react-native";

import { Button, Text } from "@/shared/ui";

import { useFollowUser, useRelationship, useUnfollowUser } from "../queries";

export type FollowButtonProps = {
  userId: string;
  testID?: string;
  /** Injected for tests; defaults to the app client. */
  fetchImpl?: typeof fetch;
};

export function FollowButton({ userId, testID, fetchImpl }: FollowButtonProps) {
  const rel = useRelationship(userId, { fetchImpl });
  const follow = useFollowUser(userId, { fetchImpl });
  const unfollow = useUnfollowUser(userId, { fetchImpl });

  const status = rel.data?.followStatus ?? "none";
  const pending = rel.isPending || follow.isPending || unfollow.isPending;
  const failed = follow.isError || unfollow.isError;
  const id = testID ?? `follow-button-${userId}`;

  const title =
    status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow";

  return (
    <View style={styles.root}>
      <Button
        title={title}
        testID={id}
        variant={status === "none" ? "primary" : "secondary"}
        size="sm"
        loading={pending}
        onPress={() => {
          follow.reset();
          unfollow.reset();
          if (status === "none") follow.mutate();
          else unfollow.mutate();
        }}
      />
      {failed ? (
        <Text variant="caption" color="textSecondary" testID={`follow-error-${userId}`}>
          Couldn&apos;t update. Tap to retry.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-end",
    gap: 4,
  },
});
