/**
 * User detail screen (`/user/[handle]`, G2.1, PF4.1).
 *
 * Resolves `handle → user` via `useUserByHandle`, reads the canonical
 * `useRelationship` for follow state + counts, then reads that user's
 * infinite posts via `useUserPosts(user.id)`. Unknown handles show a
 * fallback, never a crash. Private/blocked targets show a gated empty
 * state instead of posts (G1.1 fail-closed: posts wait for the
 * relationship to resolve). Edit affordance shows only for self;
 * other viewers see Follow (never Edit).
 *
 * One scroll container: the identity block is the list header; the overflow
 * (`more`) holds report / block / share.
 */

import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useUserPosts } from "@/entities/post";
import {
  FollowButton,
  getViewBlockReason,
  isBlockedByMe,
  useMe,
  useRelationship,
  useUserByHandle,
} from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  useTheme,
} from "@/shared/ui";

import { logUserOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { UserOverflowMenu } from "../components/profile-overflow-sheet";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";
import { useProfileTitleTransition } from "../hooks/use-profile-title-transition";

export function UserDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();

  if (!handle) {
    return (
      <Screen style={styles.center} testID="user-detail-screen">
        <EmptyState
          icon="alert"
          title="Missing user handle"
          description="Open a profile from the feed to view it here."
          testID="user-missing-handle"
        />
      </Screen>
    );
  }

  return <UserDetailBody handle={handle} />;
}

function UserDetailBody({ handle }: { handle: string }) {
  const qc = useQueryClient();
  const theme = useTheme();
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

  const titleTransition = useProfileTitleTransition({
    handle: userQuery.data?.handle ?? "",
    displayName: userQuery.data?.displayName ?? "",
    fallbackTitle: `@${handle}`,
    ready: userQuery.isSuccess,
  });

  if (userQuery.isPending) {
    return (
      <Screen testID="user-detail-screen">
        <LoadingState label="Loading user" testID="user-detail-loading" />
      </Screen>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <Screen testID="user-detail-screen">
        <ErrorState
          title={`@${handle}`}
          message="This user doesn't exist."
          testID="user-not-found"
          retryTestID="user-detail-retry-button"
          onRetry={() => {
            void userQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const user = userQuery.data;
  const isSelf = me.data?.id === user.id;
  const blocked = isBlockedByMe(qc, user.id);
  const blockReason = rel.data ? getViewBlockReason(qc, user.id, me.data?.id ?? "") : null;

  const header = (
    <ProfileHeader
      user={user}
      testID={`profile-header-${user.handle}`}
      postsCount={blockReason === null ? posts.postIds.length : 0}
      countsVisible={rel.isSuccess}
      followersCount={rel.data?.followersCount}
      followingCount={rel.data?.followingCount}
      onIdentityLayout={titleTransition.onIdentityLayout}
      action={
        isSelf ? (
          <Button
            title="Edit profile"
            variant="secondary"
            size="md"
            fullWidth
            style={{ borderRadius: theme.radius.full }}
            testID="user-detail-edit-button"
            onPress={() => {
              router.push(hrefs.editProfile());
            }}
          />
        ) : (
          <FollowButton userId={user.id} size="md" fullWidth pill />
        )
      }
    />
  );

  const gated =
    rel.isPending ? (
      <LoadingState label="Loading posts" testID="user-relationship-loading" />
    ) : rel.isError || !rel.data ? (
      <ErrorState
        title="Couldn't load follow status"
        message="Check your connection and try again."
        testID="user-relationship-error"
        retryTestID="user-relationship-retry-button"
        onRetry={() => {
          void rel.refetch();
        }}
      />
    ) : blockReason !== null ? (
      <EmptyState
        icon="lock"
        title={blockReason === "private" ? "Private account" : "Not available"}
        description={
          blockReason === "private"
            ? `Follow @${user.handle} to see their posts.`
            : `You can't see @${user.handle}'s posts.`
        }
        testID={blockReason === "private" ? "private-empty-state" : "blocked-empty-state"}
      />
    ) : posts.isPending ? (
      <LoadingState label="Loading posts" testID="user-posts-loading" />
    ) : posts.isError ? (
      <ErrorState
        title="Couldn't load posts"
        message="Check your connection and try again."
        testID="user-posts-error"
        retryTestID="user-posts-retry-button"
        onRetry={() => {
          void posts.refetch();
        }}
      />
    ) : undefined;

  return (
    <Screen testID="user-detail-screen">
      <Stack.Screen
        options={{
          headerRight: () => (
            <UserOverflowMenu userId={user.id} handle={user.handle} isBlocked={blocked} />
          ),
        }}
      />
      <ProfilePostsList
        postIds={blockReason === null ? posts.postIds : []}
        isFetchingNextPage={posts.isFetchingNextPage}
        isRefetching={posts.isRefetching}
        hasNextPage={blockReason === null && posts.hasNextPage}
        onEndReached={() => {
          void posts.fetchNextPage();
        }}
        onRefresh={() => {
          void posts.refetch();
        }}
        prefetchPost={posts.prefetchPost}
        onScroll={titleTransition.onScroll}
        scrollEventThrottle={16}
        header={header}
        emptyComponent={gated}
      />
      <ProfilePostsFooter visible={blockReason === null && posts.isFetchingNextPage} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
