/**
 * User row.
 *
 * Takes `userId` and reads the canonical `useUser`; loading
 * shows a skeleton row, error/null shows a fallback.
 */

import { StyleSheet, View } from "react-native";

import { Skeleton, Text } from "@/shared/ui";

import { useUser } from "../queries";
import { Avatar } from "./avatar";

export type UserRowProps = {
  userId: string;
  testID?: string;
};

export function UserRow({ userId, testID }: UserRowProps) {
  const query = useUser(userId);

  if (query.isPending) {
    return (
      <View style={styles.row} testID={testID}>
        <Skeleton width={40} height={40} radius="full" />
        <View style={styles.names}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} style={styles.barShort} />
        </View>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Text variant="label" color="textSecondary" testID={testID}>
        Unknown user
      </Text>
    );
  }

  const user = query.data;
  return (
    <View style={styles.row} testID={testID}>
      <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={40} />
      <View style={styles.names}>
        <Text variant="labelStrong">{user.displayName}</Text>
        <Text variant="caption" color="textSecondary">
          @{user.handle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  names: {
    marginLeft: 12,
    justifyContent: "center",
    gap: 4,
  },
  barShort: {
    width: 80,
  },
});
