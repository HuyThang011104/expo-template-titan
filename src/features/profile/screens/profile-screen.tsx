/**
 * "Me" profile screen (`/(profile)` tab, G2.1).
 *
 * - `useMe` for the header (`GET /users/me`, mock `u-1`).
 * - `useUserPosts(me.id)` for the infinite posts list (own FlashList,
 *   canonical `PostCard`, like works cross-cache with no extra patching).
 * - Own profile only, so the Edit button always shows here;
 *   `UserDetailScreen` never shows it to other viewers.
 * - Keeps the sign-out button so logout stays testable.
 */

import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useFollowRequests, useMe, useRelationship } from "@/entities/user";
import { useUserPosts } from "@/entities/post";
import { useSavedPosts } from "@/entities/saved";
import { useSession } from "@/shared/auth";
import { hrefs } from "@/shared/navigation/hrefs";
import {
  Button,
  ErrorState,
  LoadingState,
  Screen,
  Tabs,
  Text,
} from "@/shared/ui";

import { logProfileOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";

export function ProfileScreen() {
  const { signOut } = useSession();
  const me = useMe();
  const userId = me.data?.id ?? "";
  const rel = useRelationship(userId);
  const requests = useFollowRequests();
  const posts = useUserPosts(userId);
  const saved = useSavedPosts();
  const [tab, setTab] = useState<"posts" | "saved">("posts");

  useEffect(() => {
    if (me.data) logProfileOpen(me.data.id);
  }, [me.data]);

  if (me.isPending) {
    return (
      <Screen testID="profile-screen">
        <LoadingState label="Loading profile" testID="profile-loading" />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen style={styles.center} testID="profile-screen">
        <ErrorState
          title="Couldn't load your profile"
          message="Check your connection and try again."
          testID="profile-error"
          retryTestID="profile-retry-button"
          onRetry={() => {
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
          <ProfileHeader
            user={user}
            testID={`profile-header-${user.handle}`}
            countsVisible={rel.isSuccess}
            followersCount={rel.data?.followersCount}
            followingCount={rel.data?.followingCount}
          />
        </View>
        <View style={styles.headerActions}>
          <Button
            title="Edit"
            variant="secondary"
            size="sm"
            testID="profile-edit-button"
            onPress={() => {
              router.push(hrefs.editProfile());
            }}
          />
          <Button
            title="Sign out"
            variant="secondary"
            size="sm"
            testID="profile-sign-out-button"
            onPress={signOut}
          />
        </View>
      </View>
      {requests.isSuccess && requests.userIds.length > 0 ? (
        <Link href={hrefs.followRequests()} asChild>
          <Pressable testID="profile-requests-button">
            <Text variant="labelStrong" style={styles.requestsLink}>
              Follow requests ({requests.userIds.length})
            </Text>
          </Pressable>
        </Link>
      ) : null}
      <Tabs
        variant="underline"
        items={[
          { key: "posts", label: "Posts", testID: "profile-tab-posts" },
          { key: "saved", label: "Saved", testID: "profile-tab-saved" },
        ]}
        value={tab}
        onChange={(key) => {
          setTab(key as "posts" | "saved");
        }}
        testID="profile-tabs"
      />
      {tab === "saved" ? (
        <SavedTab saved={saved} />
      ) : posts.isPending ? (
        <LoadingState label="Loading posts" testID="profile-posts-loading" />
      ) : posts.isError ? (
        <ErrorState
          title="Couldn't load posts"
          message="Check your connection and try again."
          testID="profile-posts-error"
          retryTestID="profile-posts-retry-button"
          onRetry={() => {
            void posts.refetch();
          }}
        />
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
  headerActions: {
    gap: 8,
  },
  requestsLink: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listFlex: {
    flex: 1,
  },
});

function SavedTab({ saved }: { saved: ReturnType<typeof useSavedPosts> }) {
  if (saved.isPending) {
    return <LoadingState label="Loading saved posts" testID="saved-loading" />;
  }
  if (saved.isError) {
    return (
      <ErrorState
        title="Couldn't load saved posts"
        message="Check your connection and try again."
        testID="saved-error"
        retryTestID="saved-retry-button"
        onRetry={() => {
          void saved.refetch();
        }}
      />
    );
  }
  return (
    <View style={styles.listFlex}>
      <ProfilePostsList
        postIds={saved.postIds}
        isFetchingNextPage={saved.isFetchingNextPage}
        isRefetching={saved.isRefetching}
        hasNextPage={saved.hasNextPage}
        onEndReached={() => {
          void saved.fetchNextPage();
        }}
        onRefresh={() => {
          void saved.refetch();
        }}
        prefetchPost={() => {}}
        testID="saved-list"
      />
      <ProfilePostsFooter visible={saved.isFetchingNextPage} />
    </View>
  );
}
