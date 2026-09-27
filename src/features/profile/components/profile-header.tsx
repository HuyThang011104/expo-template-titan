/**
 * Profile header.
 *
 * Pure presentational: avatar + names. The `me` screen adds `Sign out`
 * next to it; user detail does not.
 */

import { StyleSheet, View } from "react-native";

import { Avatar, type User } from "@/entities/user";
import { Text } from "@/shared/ui";

export type ProfileHeaderProps = {
  user: User;
  testID?: string;
};

export function ProfileHeader({ user, testID }: ProfileHeaderProps) {
  return (
    <View style={styles.root} testID={testID}>
      <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={48} />
      <View style={styles.names}>
        <Text variant="title">{user.displayName}</Text>
        <Text variant="body" color="textSecondary">
          @{user.handle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  names: {
    flex: 1,
    justifyContent: "center",
  },
});
