/**
 * User row.
 *
 * Takes `userId` and reads the canonical `useUser`; loading
 * shows a gray skeleton, error/null shows a fallback.
 */

import { StyleSheet, View } from "react-native";

import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

import { useUser } from "../queries";
import { Avatar } from "./avatar";

export type UserRowProps = {
  userId: string;
  testID?: string;
};

export function UserRow({ userId, testID }: UserRowProps) {
  const theme = useTheme();
  const query = useUser(userId);

  if (query.isPending) {
    return (
      <View style={styles.row} testID={testID}>
        <View
          style={[
            styles.avatarSkeleton,
            {
              backgroundColor: theme.color.backgroundElement,
              borderRadius: theme.radius.full,
            },
          ]}
        />
        <View style={styles.names}>
          <View
            style={[
              styles.bar,
              {
                backgroundColor: theme.color.backgroundElement,
                borderRadius: theme.radius.sm,
              },
            ]}
          />
          <View
            style={[
              styles.barShort,
              {
                backgroundColor: theme.color.backgroundElement,
                borderRadius: theme.radius.sm,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Unknown user
      </Text>
    );
  }

  const user = query.data;
  return (
    <View style={styles.row} testID={testID}>
      <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={40} />
      <View style={styles.names}>
        <Text variant="small" style={styles.displayName}>
          {user.displayName}
        </Text>
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
  },
  displayName: {
    fontWeight: "700",
  },
  avatarSkeleton: {
    width: 40,
    height: 40,
  },
  bar: {
    width: 120,
    height: 14,
  },
  barShort: {
    width: 80,
    height: 12,
    marginTop: 6,
  },
});
