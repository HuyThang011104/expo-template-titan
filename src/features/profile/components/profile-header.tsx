/**
 * Profile header (G2.1).
 *
 * Presentational: cover + avatar + names + bio/link + follower counts.
 * The follow/edit action and list navigation are injected from the screen
 * so this stays dumb. Reads the canonical `User` so edits propagate.
 */

import { Image } from "expo-image";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, type User } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { Text, useTheme } from "@/shared/ui";

export type ProfileHeaderProps = {
  user: User;
  followersCount?: number;
  followingCount?: number;
  countsVisible?: boolean;
  action?: ReactNode;
  testID?: string;
};

function CountLink({
  handle,
  kind,
  count,
  testID,
}: {
  handle: string;
  kind: "followers" | "following";
  count: number;
  testID: string;
}) {
  const href = kind === "followers" ? hrefs.userFollowers(handle) : hrefs.userFollowing(handle);
  return (
    <Link href={href} asChild>
      <Pressable testID={testID}>
        <Text variant="small">
          <Text variant="small" style={styles.countNumber}>
            {count}
          </Text>{" "}
          {kind}
        </Text>
      </Pressable>
    </Link>
  );
}

export function ProfileHeader({
  user,
  followersCount,
  followingCount,
  countsVisible = false,
  action,
  testID,
}: ProfileHeaderProps) {
  const theme = useTheme();
  return (
    <View testID={testID}>
      {user.coverUrl ? (
        <Image
          source={{ uri: user.coverUrl }}
          style={[styles.cover, { backgroundColor: theme.color.backgroundElement }]}
          contentFit="cover"
          transition={200}
          accessibilityLabel={`${user.displayName} cover`}
          testID={testID ? `${testID}-cover` : undefined}
        />
      ) : null}
      <View style={styles.root}>
        <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={48} />
        <View style={styles.names}>
          <Text variant="title">{user.displayName}</Text>
          <Text variant="body" color="textSecondary">
            @{user.handle}
          </Text>
          {user.bio ? (
            <Text variant="body" testID={testID ? `${testID}-bio` : undefined}>
              {user.bio}
            </Text>
          ) : null}
          {user.link ? (
            <Text
              variant="small"
              color="textSecondary"
              testID={testID ? `${testID}-link` : undefined}
            >
              {user.link}
            </Text>
          ) : null}
          {countsVisible && followersCount !== undefined && followingCount !== undefined ? (
            <View style={styles.counts}>
              <CountLink
                handle={user.handle}
                kind="followers"
                count={followersCount}
                testID={`profile-followers-count-${user.handle}`}
              />
              <CountLink
                handle={user.handle}
                kind="following"
                count={followingCount}
                testID={`profile-following-count-${user.handle}`}
              />
            </View>
          ) : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: "100%",
    height: 140,
  },
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
  counts: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  countNumber: {
    fontWeight: "700",
  },
  action: {
    justifyContent: "center",
  },
});
