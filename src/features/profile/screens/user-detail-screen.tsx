/**
 * User detail screen (`/user/[handle]`, G2.1).
 *
 * Resolves `handle → user` via `useUserByHandle`, reads the canonical
 * `useRelationship` for follow state + counts, then reads that user's
 * infinite posts via `useUserPosts(user.id)`. Unknown handles show a
 * fallback, never a crash. Private/blocked targets show a gated empty
 * state instead of posts (G1.1 fail-closed: posts wait for the
 * relationship to resolve). Edit affordance shows only for self;
 * other viewers see Follow (never Edit).
 */

import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useUserPosts } from "@/entities/post";
import {
  FollowButton,
  getViewBlockReason,
  useMe,
  useRelationship,
  useUserByHandle,
} from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
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
  const qc = useQueryClient();
  const userQuery = useUserByHandle(handle);
  const userId = userQuery.data?.id ?? "";
  const me = useMe();
  // `useRelationship` seeds the same canonical entry `getViewBlockReason`
  // reads below, so gating never uses a stale copy.
  const rel = useRelationship(userId);
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
        <Text variant="body" testID="user-not-found">
          User không tồn tại.
        </Text>
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
  const isSelf = me.data?.id === user.id;
  const blockReason = rel.data
    ? getViewBlockReason(qc, user.id, me.data?.id ?? "")
    : null;

  return (
    <Screen testID="user-detail-screen">
      <ProfileHeader
        user={user}
        testID={`profile-header-${user.handle}`}
        countsVisible={rel.isSuccess}
        followersCount={rel.data?.followersCount}
        followingCount={rel.data?.followingCount}
        action={
          isSelf ? (
            <Button
              title="Edit"
              variant="secondary"
              size="sm"
              testID="user-detail-edit-button"
              onPress={() => {
                router.push(hrefs.editProfile());
              }}
            />
          ) : (
            <FollowButton userId={user.id} />
          )
        }
      />
      {rel.isPending ? (
        <View style={styles.center}>
          <Text variant="body">Loading posts…</Text>
        </View>
      ) : rel.isError || !rel.data ? (
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load follow status.</Text>
          <Button
            title="Retry"
            testID="user-relationship-retry-button"
            onPress={() => {
              void rel.refetch();
            }}
          />
        </View>
      ) : blockReason !== null ? (
        <View style={styles.center}>
          {blockReason === "private" ? (
            <>
              <Text variant="title" testID="private-empty-state">
                Private account
              </Text>
              <Text variant="body">Follow @{user.handle} to see their posts.</Text>
            </>
          ) : (
            <>
              <Text variant="title" testID="blocked-empty-state">
                Not available
              </Text>
              <Text variant="body">You can&apos;t see @{user.handle}&apos;s posts.</Text>
            </>
          )}
        </View>
      ) : posts.isPending ? (
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
