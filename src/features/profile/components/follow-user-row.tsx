/**
 * Follow list row (G1.1).
 *
 * Canonical `UserRow` + profile link + `FollowButton` (hidden for self).
 * Used by the followers / following / requests screens in this feature.
 */

import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { FollowButton, UserRow, useMe, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";

export type FollowUserRowProps = {
  userId: string;
  testID?: string;
  /** Hide the trailing `FollowButton` (e.g. request rows use Approve/Reject). */
  hideAction?: boolean;
};

export function FollowUserRow({ userId, testID, hideAction = false }: FollowUserRowProps) {
  const me = useMe();
  const user = useUser(userId);
  const isSelf = me.data?.id === userId;
  const handle = user.data?.handle;

  const row = (
    <View style={styles.row} testID={testID ?? `follow-row-${userId}`}>
      <View style={styles.info}>
        <UserRow userId={userId} />
      </View>
      {isSelf || hideAction ? null : <FollowButton userId={userId} />}
    </View>
  );

  if (!handle) return row;
  return (
    <Link href={hrefs.user(handle)} asChild>
      <Pressable>{row}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  info: {
    flex: 1,
  },
});
