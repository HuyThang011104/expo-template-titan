/**
 * "Me" profile screen (`/(profile)` tab, G2.1, PF4.1).
 *
 * - `useMe` for the header (`GET /users/me`, mock `u-1`).
 * - `useUserPosts(me.id)` for the infinite posts list (canonical `PostCard`,
 *   like works cross-cache with no extra patching).
 * - One scroll container: the identity block + follow-requests row + tabs are
 *   the list header, so cover/avatar/names scroll away (PF4.3 adds the sticky
 *   tabs overlay).
 * - Overflow (`more`) replaces the old header buttons: Follow requests,
 *   Settings, Sign out (testID preserved on the sheet item).
 */

import type { FlashListRef } from "@shopify/flash-list";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useUserPosts } from "@/entities/post";
import { useSavedPosts } from "@/entities/saved";
import { useFollowRequests, useMe, useRelationship } from "@/entities/user";
import { useSession } from "@/shared/auth";
import { hrefs } from "@/shared/navigation/hrefs";
import { Button, ErrorState, LoadingState, Screen, Tabs, Text, useTheme } from "@/shared/ui";

import { logProfileOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { ProfileOverflowMenu } from "../components/profile-overflow-sheet";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";
import { ProfileStickyTabs } from "../components/profile-sticky-tabs";
import { useProfileTitleTransition } from "../hooks/use-profile-title-transition";

export function ProfileScreen() {
  const { signOut } = useSession();
  const theme = useTheme();
  const me = useMe();
  const userId = me.data?.id ?? "";
  const rel = useRelationship(userId);
  const requests = useFollowRequests();
  const posts = useUserPosts(userId);
  const saved = useSavedPosts();
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [stickyShown, setStickyShown] = useState(false);
  const listRef = useRef<FlashListRef<string>>(null);

  useEffect(() => {
    if (me.data) logProfileOpen(me.data.id);
  }, [me.data]);

  const titleTransition = useProfileTitleTransition({
    handle: me.data?.handle ?? "",
    displayName: me.data?.displayName ?? "",
    fallbackTitle: "Profile",
    ready: me.isSuccess,
  });

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
  const requestCount = requests.userIds.length;
  const active = tab === "saved" ? saved : posts;

  const handleTabChange = (key: string): void => {
    setTab(key as "posts" | "saved");
    // PF4.3: reset scroll when switching tabs (sticky overlay included).
    titleTransition.scrollY.set(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const header = (
    <View>
      <ProfileHeader
        user={user}
        testID={`profile-header-${user.handle}`}
        postsCount={posts.postIds.length}
        countsVisible={rel.isSuccess}
        followersCount={rel.data?.followersCount}
        followingCount={rel.data?.followingCount}
        onIdentityLayout={titleTransition.onIdentityLayout}
        action={
          <Button
            title="Edit profile"
            variant="secondary"
            size="md"
            fullWidth
            style={{ borderRadius: theme.radius.full }}
            testID="profile-edit-button"
            onPress={() => {
              router.push(hrefs.editProfile());
            }}
          />
        }
      />
      {requestCount > 0 ? (
        <Pressable
          testID="profile-requests-button"
          accessibilityRole="button"
          onPress={() => {
            router.push(hrefs.followRequests());
          }}
          style={[styles.requestsRow, { borderColor: theme.color.border }]}
        >
          <Text variant="labelStrong">Follow requests ({requestCount})</Text>
        </Pressable>
      ) : null}
      <View
        onLayout={titleTransition.onTabsLayout}
        accessibilityElementsHidden={stickyShown}
        importantForAccessibility={stickyShown ? "no-hide-descendants" : "auto"}
      >
        <Tabs
          variant="underline"
          items={[
            { key: "posts", label: "Posts", testID: "profile-tab-posts" },
            { key: "saved", label: "Saved", testID: "profile-tab-saved" },
          ]}
          value={tab}
          onChange={handleTabChange}
          testID="profile-tabs"
        />
      </View>
    </View>
  );

  return (
    <Screen testID="profile-screen">
      <Stack.Screen options={{ headerRight: () => <ProfileOverflowMenu /> }} />
      <ProfilePostsList
        postIds={active.postIds}
        isFetchingNextPage={active.isFetchingNextPage}
        isRefetching={active.isRefetching}
        hasNextPage={active.hasNextPage}
        onEndReached={() => {
          void active.fetchNextPage();
        }}
        onRefresh={() => {
          void active.refetch();
        }}
        prefetchPost={tab === "saved" ? () => {} : posts.prefetchPost}
        listRef={listRef}
        onScroll={titleTransition.onScroll}
        scrollEventThrottle={16}
        header={header}
        emptyComponent={
          active.isPending ? (
            <LoadingState
              label={tab === "saved" ? "Loading saved posts" : "Loading posts"}
              testID={tab === "saved" ? "saved-loading" : "profile-posts-loading"}
            />
          ) : active.isError ? (
            <ErrorState
              title={tab === "saved" ? "Couldn't load saved posts" : "Couldn't load posts"}
              message="Check your connection and try again."
              testID={tab === "saved" ? "saved-error" : "profile-posts-error"}
              retryTestID={tab === "saved" ? "saved-retry-button" : "profile-posts-retry-button"}
              onRetry={() => {
                void active.refetch();
              }}
            />
          ) : undefined
        }
        testID={tab === "saved" ? "saved-list" : "profile-list"}
      />
      <ProfilePostsFooter visible={active.isFetchingNextPage} />
      <ProfileStickyTabs
        scrollY={titleTransition.scrollY}
        tabsBottom={titleTransition.tabsBottom}
        value={tab}
        onChange={handleTabChange}
        onShownChange={setStickyShown}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  requestsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
