/**
 * "Me" profile screen (`/(profile)` tab).
 *
 * - `useMe` for the header (`GET /users/me`, mock `u-1`).
 * - `useUserPosts(me.id)` for the infinite posts list (own FlashList,
 *   canonical `PostCard`, like works cross-cache with no extra patching).
 * - Keeps the sign-out button so logout stays testable.
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useMe } from "@/entities/user";
import { useUserPosts } from "@/entities/post";
import { useSession } from "@/shared/auth";
import { Button, Screen, Text } from "@/shared/ui";

import { logProfileOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";

export function ProfileScreen() {
  const { signOut } = useSession();
  const me = useMe();
  const userId = me.data?.id ?? "";
  const posts = useUserPosts(userId);

  useEffect(() => {
    if (me.data) logProfileOpen(me.data.id);
  }, [me.data]);

  if (me.isPending) {
    return (
      <Screen style={styles.center} testID="profile-screen">
        <Text variant="body">Loading profile…</Text>
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen style={styles.center} testID="profile-screen">
        <Text variant="title">Profile</Text>
        <Text variant="body">Couldn&apos;t load your profile.</Text>
        <Button
          title="Retry"
          testID="profile-retry-button"
          onPress={() => {
            void me.refetch();
          }}
        />
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </Screen>
    );
  }

  const user = me.data;

  return (
    <Screen testID="profile-screen">
      <View style={styles.headerRow}>
        <View style={styles.headerFlex}>
          <ProfileHeader user={user} testID={`profile-header-${user.handle}`} />
        </View>
        <Button
          title="Sign out"
          variant="secondary"
          size="sm"
          testID="profile-sign-out-button"
          onPress={signOut}
        />
      </View>
      {posts.isPending ? (
        <View style={styles.center}>
          <Text variant="body">Loading posts…</Text>
        </View>
      ) : posts.isError ? (
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load posts.</Text>
          <Button
            title="Retry"
            testID="profile-posts-retry-button"
            onPress={() => {
              void posts.refetch();
            }}
          />
        </View>
      ) : (
        <View style={styles.listFlex}>
          <ProfilePostsList
            postIds={posts.postIds}
            isFetchingNextPage={posts.isFetchingNextPage}
            isRefetching={posts.isRefetching}
            hasNextPage={posts.hasNextPage}
            onEndReached={() => {
              void posts.fetchNextPage();
            }}
            onRefresh={() => {
              void posts.refetch();
            }}
            prefetchPost={posts.prefetchPost}
          />
          <ProfilePostsFooter visible={posts.isFetchingNextPage} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  headerFlex: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
});
