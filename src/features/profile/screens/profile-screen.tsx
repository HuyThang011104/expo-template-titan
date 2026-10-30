/**
 * "Me" profile screen (`/(profile)` tab, G2.1, PF4.1).
 *
 * Each profile tab owns a FlashList inside a native horizontal pager, so a
 * swipe moves only the tab's content. The identity block and tabs render once
 * as an overlay above the pager and translate with the active list's
 * `scrollY`, so cover/avatar/names still scroll away while the overlay tabs
 * and native title follow the active page.
 */

import type { FlashListRef } from "@shopify/flash-list";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { useUserPosts } from "@/entities/post";
import { useSavedPosts } from "@/entities/saved";
import { useFollowRequests, useMe, useRelationship } from "@/entities/user";
import { useSession } from "@/shared/auth";
import { hrefs } from "@/shared/navigation/hrefs";
import { Button, ErrorState, LoadingState, Screen, Tabs, Text, useTheme } from "@/shared/ui";

import { logProfileOpen } from "../analytics";
import { ProfileHeader } from "../components/profile-header";
import { ProfileOverflowMenu } from "../components/profile-overflow-sheet";
import { ProfilePager, type ProfilePagerRef } from "../components/profile-pager";
import { ProfilePostsFooter, ProfilePostsList } from "../components/profile-posts-list";
import { ProfileStickyTabs } from "../components/profile-sticky-tabs";
import {
  useProfileTitleTransition,
  type ProfileTabKey,
} from "../hooks/use-profile-title-transition";

export function ProfileScreen() {
  const { signOut } = useSession();
  const theme = useTheme();
  const me = useMe();
  const userId = me.data?.id ?? "";
  const rel = useRelationship(userId);
  const requests = useFollowRequests();
  const posts = useUserPosts(userId);
  const saved = useSavedPosts();
  const [tab, setTab] = useState<ProfileTabKey>("posts");
  const [stickyShown, setStickyShown] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const pagerRef = useRef<ProfilePagerRef>(null);
  const postsListRef = useRef<FlashListRef<string>>(null);
  const savedListRef = useRef<FlashListRef<string>>(null);

  useEffect(() => {
    if (me.data) logProfileOpen(me.data.id);
  }, [me.data]);

  const titleTransition = useProfileTitleTransition({
    handle: me.data?.handle ?? "",
    displayName: me.data?.displayName ?? "",
    fallbackTitle: "Profile",
    ready: me.isSuccess,
  });

  // The overlay aligns with the list content origin, so translating it by the
  // active list's offset reproduces an in-list header without the pager
  // dragging it sideways. Negative overscroll moves it down (pull-to-refresh).
  const headerStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: -Math.min(titleTransition.scrollY.get(), headerHeight) }],
    }),
    [headerHeight, titleTransition.scrollY],
  );

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

  const handleTabChange = (key: string): void => {
    const nextTab: ProfileTabKey = key === "saved" ? "saved" : "posts";
    titleTransition.setActiveTab(nextTab);
    setTab(nextTab);
    pagerRef.current?.setPage(nextTab === "saved" ? 1 : 0);
  };

  const handlePageSelected = (page: number): void => {
    const nextTab: ProfileTabKey = page === 1 ? "saved" : "posts";
    titleTransition.setActiveTab(nextTab);
    setTab(nextTab);
  };

  const headerContent = (
    <View
      pointerEvents="box-none"
      onLayout={(event) => {
        setHeaderHeight(event.nativeEvent.layout.height);
      }}
    >
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

  const postsPage = (
    <View key="posts" style={styles.page}>
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
        listRef={postsListRef}
        onScroll={tab === "posts" ? titleTransition.onScrollFor("posts") : undefined}
        scrollEventThrottle={16}
        header={<View style={{ height: headerHeight }} />}
        progressViewOffset={headerHeight}
        footer={<ProfilePostsFooter visible={posts.isFetchingNextPage} />}
        emptyComponent={
          posts.isPending ? (
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
          ) : undefined
        }
        testID="profile-list"
      />
    </View>
  );

  const savedPage = (
    <View key="saved" style={styles.page}>
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
        listRef={savedListRef}
        onScroll={tab === "saved" ? titleTransition.onScrollFor("saved") : undefined}
        scrollEventThrottle={16}
        header={<View style={{ height: headerHeight }} />}
        progressViewOffset={headerHeight}
        footer={<ProfilePostsFooter visible={saved.isFetchingNextPage} />}
        emptyComponent={
          saved.isPending ? (
            <LoadingState label="Loading saved posts" testID="saved-loading" />
          ) : saved.isError ? (
            <ErrorState
              title="Couldn't load saved posts"
              message="Check your connection and try again."
              testID="saved-error"
              retryTestID="saved-retry-button"
              onRetry={() => {
                void saved.refetch();
              }}
            />
          ) : undefined
        }
        testID="saved-list"
      />
    </View>
  );

  return (
    <Screen testID="profile-screen">
      <Stack.Screen options={{ headerRight: () => <ProfileOverflowMenu /> }} />
      <ProfilePager
        ref={pagerRef}
        pageIndex={tab === "saved" ? 1 : 0}
        onPageSelected={handlePageSelected}
      >
        {[postsPage, savedPage]}
      </ProfilePager>
      <View pointerEvents="box-none" style={styles.headerClip}>
        <Animated.View pointerEvents="box-none" style={[styles.headerOverlay, headerStyle]}>
          {headerContent}
        </Animated.View>
      </View>
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
  page: {
    flex: 1,
  },
  headerClip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  requestsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
