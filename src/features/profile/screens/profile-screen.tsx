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
import { Button, Screen, Text } from "@/shared/ui";

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
            title="Settings"
            variant="secondary"
            size="sm"
            testID="profile-settings-button"
            onPress={() => {
              router.push(hrefs.settings());
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
            <Text variant="small" style={styles.requestsLink}>
              Follow requests ({requests.userIds.length})
            </Text>
          </Pressable>
        </Link>
      ) : null}
      <View style={styles.tabs}>
        <Pressable
          testID="profile-tab-posts"
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "posts" }}
          onPress={() => {
            setTab("posts");
          }}
          style={styles.tab}
        >
          <Text variant="small" style={tab === "posts" ? styles.tabActive : undefined}>
            Posts
          </Text>
        </Pressable>
        <Pressable
          testID="profile-tab-saved"
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "saved" }}
          onPress={() => {
            setTab("saved");
          }}
          style={styles.tab}
        >
          <Text variant="small" style={tab === "saved" ? styles.tabActive : undefined}>
            Saved
          </Text>
        </Pressable>
      </View>
      {tab === "saved" ? (
        <SavedTab saved={saved} />
      ) : posts.isPending ? (
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
  headerActions: {
    gap: 8,
  },
  requestsLink: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    paddingVertical: 4,
  },
  tabActive: {
    fontWeight: "700",
  },
  listFlex: {
    flex: 1,
  },
});

function SavedTab({ saved }: { saved: ReturnType<typeof useSavedPosts> }) {
  if (saved.isPending) {
    return (
      <View style={styles.center}>
        <Text variant="body">Loading saved…</Text>
      </View>
    );
  }
  if (saved.isError) {
    return (
      <View style={styles.center}>
        <Text variant="body">Couldn&apos;t load saved posts.</Text>
        <Button
          title="Retry"
          testID="saved-retry-button"
          onPress={() => {
            void saved.refetch();
          }}
        />
      </View>
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
