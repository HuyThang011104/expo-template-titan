/**
 * Profile header (G2.1, PF4.1).
 *
 * Presentational: cover 140 → Avatar 96 overlapping by −32 → names, bio/link,
 * one stats line, then the full-width action slot. The follow/edit action and
 * list navigation are injected from the screen so this stays dumb. Reads the
 * canonical `User` so edits propagate.
 *
 * Spec: docs/feel-spec.md §4.4. The header lives inside the list's
 * `ListHeaderComponent` (one scroll container) — see `ProfilePostsList`.
 */

import { Image } from "expo-image";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { Avatar, type User } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { Text, useTheme } from "@/shared/ui";

const COVER_HEIGHT = 140;

export type ProfileHeaderProps = {
  user: User;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  countsVisible?: boolean;
  action?: ReactNode;
  /** Measures the identity block for the Q7 title threshold (PF4.2). */
  onIdentityLayout?: (event: LayoutChangeEvent) => void;
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
        <Text variant="label" color="textSecondary" style={styles.numeric}>
          <Text variant="labelStrong">{count}</Text> {kind}
        </Text>
      </Pressable>
    </Link>
  );
}

export function ProfileHeader({
  user,
  postsCount,
  followersCount,
  followingCount,
  countsVisible = false,
  action,
  onIdentityLayout,
  testID,
}: ProfileHeaderProps) {
  const theme = useTheme();
  let followStats: { followers: number; following: number } | null = null;
  if (countsVisible && typeof followersCount === "number" && typeof followingCount === "number") {
    followStats = { followers: followersCount, following: followingCount };
  }
  const statsVisible = postsCount !== undefined || followStats !== null;

  return (
    <View testID={testID} onLayout={onIdentityLayout} pointerEvents="box-none">
      <View
        pointerEvents="none"
        style={[styles.cover, { backgroundColor: theme.color.surfaceMuted }]}
      >
        {user.coverUrl ? (
          <Image
            source={{ uri: user.coverUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${user.displayName} cover`}
            testID={testID ? `${testID}-cover` : undefined}
          />
        ) : null}
      </View>
      <View pointerEvents="none" style={styles.avatarRow}>
        <View
          style={[
            styles.avatarRing,
            {
              backgroundColor: theme.color.background,
              borderColor: theme.color.background,
            },
          ]}
        >
          <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={96} />
        </View>
      </View>
      <View style={styles.identity}>
        <Text variant="h2" numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text variant="caption" color="textSecondary">
          @{user.handle}
        </Text>
        {user.bio ? (
          <Text variant="body" testID={testID ? `${testID}-bio` : undefined}>
            {user.bio}
          </Text>
        ) : null}
        {user.link ? (
          <Text
            variant="label"
            color="textSecondary"
            testID={testID ? `${testID}-link` : undefined}
          >
            {user.link}
          </Text>
        ) : null}
        {statsVisible ? (
          <View style={styles.stats}>
            {postsCount !== undefined ? (
              <>
                <Text variant="label" color="textSecondary" style={styles.numeric}>
                  <Text variant="labelStrong">{postsCount}</Text> posts
                </Text>
                {followStats ? (
                  <Text variant="label" color="textSecondary">
                    ·
                  </Text>
                ) : null}
              </>
            ) : null}
            {followStats ? (
              <>
                <CountLink
                  handle={user.handle}
                  kind="followers"
                  count={followStats.followers}
                  testID={`profile-followers-count-${user.handle}`}
                />
                <Text variant="label" color="textSecondary">
                  ·
                </Text>
                <CountLink
                  handle={user.handle}
                  kind="following"
                  count={followStats.following}
                  testID={`profile-following-count-${user.handle}`}
                />
              </>
            ) : null}
          </View>
        ) : null}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: "100%",
    height: COVER_HEIGHT,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  avatarRow: {
    paddingHorizontal: 16,
    marginTop: -32,
  },
  avatarRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  numeric: {
    fontVariant: ["tabular-nums"],
  },
  action: {
    marginTop: 12,
  },
});
