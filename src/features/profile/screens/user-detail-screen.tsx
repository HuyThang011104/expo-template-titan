/**
 * User detail screen (`/user/[handle]`).
 *
 * Resolves `handle → user` via `useUserByHandle`, then reads that user's
 * infinite posts via `useUserPosts(user.id)`. Unknown handles show a
 * fallback, never a crash.
 */

import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useUserPosts } from "@/entities/post";
import { useUserByHandle } from "@/entities/user";
import { Button, Screen, Text } from "@/shared/ui";

import { logUserOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";

export function UserDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();

  if (!handle) {
    return (
      <Screen style={styles.center} testID="user-detail-screen">
        <Text variant="body">Missing user handle.</Text>
      </Screen>
    );
  }

  return <UserDetailBody handle={handle} />;
}

function UserDetailBody({ handle }: { handle: string }) {
  const userQuery = useUserByHandle(handle);
  const userId = userQuery.data?.id ?? "";
  const posts = useUserPosts(userId);

  useEffect(() => {
    logUserOpen(handle);
  }, [handle]);

  if (userQuery.isPending) {
    return (
      <Screen style={styles.center} testID="user-detail-screen">
        <Text variant="body">Loading user…</Text>
      </Screen>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <Screen style={styles.center} testID="user-detail-screen">
        <Text variant="title">@{handle}</Text>
        <Text variant="body">User not found.</Text>
        <Button
          title="Retry"
          testID="user-detail-retry-button"
          onPress={() => {
            void userQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const user = userQuery.data;

  return (
    <Screen testID="user-detail-screen">
      <ProfileHeader user={user} testID={`profile-header-${user.handle}`} />
      {posts.isPending ? (
        <View style={styles.center}>
          <Text variant="body">Loading posts…</Text>
        </View>
      ) : posts.isError ? (
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load posts.</Text>
          <Button
            title="Retry"
            testID="user-posts-retry-button"
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
  listFlex: {
    flex: 1,
  },
});
