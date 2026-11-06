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
import {
  ProfilePager,
  type ProfilePageScroll,
  type ProfilePagerRef,
} from "../components/profile-pager";
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
  const swipeSyncTargetRef = useRef<ProfileTabKey | null>(null);
  const programmaticNavRef = useRef(false);
  const programmaticNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (me.data) logProfileOpen(me.data.id);
  }, [me.data]);

  useEffect(() => {
    return () => {
      if (programmaticNavTimerRef.current) clearTimeout(programmaticNavTimerRef.current);
    };
  }, []);

  const titleTransition = useProfileTitleTransition({
    handle: me.data?.handle ?? "",
    displayName: me.data?.displayName ?? "",
    fallbackTitle: "Profile",
    ready: me.isSuccess,
  });
  // Worklets cannot capture `titleTransition` itself: it holds the animated
  // scroll handlers (`WorkletEventHandlerNative`), which are not copyable.
  // Close over the shared values directly instead.
  const { scrollY, tabsTop, stickyProgress } = titleTransition;

  // The overlay aligns with the list content origin, so translating it by the
  // active list's offset reproduces an in-list header without the pager
  // dragging it sideways. It stops when the tab row reaches the top, which
  // leaves the in-list tabs stuck under the sticky copy. Negative overscroll
  // moves it down (pull-to-refresh).
  const headerStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: -Math.min(scrollY.get(), tabsTop.get()) }],
    }),
    [scrollY, tabsTop],
  );

  // The in-list tabs fade out exactly as the sticky copy fades in.
  const inListTabsStyle = useAnimatedStyle(
    () => ({ opacity: 1 - stickyProgress.get() }),
    [stickyProgress],
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

  // Swiping a page whose list is at the top under a collapsed header would show
  // a blank header-sized gap. Align it to the current header offset so the
  // shared header never jumps between pages. When both pages are scrolled past
  // the header, keep their own offsets (the header is already fully collapsed).
  const alignIncomingPage = (tab: ProfileTabKey, headerOffset: number): number => {
    const targetList = tab === "saved" ? savedListRef : postsListRef;
    const count = tab === "saved" ? saved.postIds.length : posts.postIds.length;
    // An empty page cannot scroll far enough to sit under a collapsed header.
    if (count === 0) {
      targetList.current?.scrollToOffset({ offset: 0, animated: false });
      return 0;
    }

    const incomingOffset = Math.max(titleTransition.getPageScrollY(tab), 0);
    const tabsTopValue = tabsTop.get();
    const nearTop =
      tabsTopValue > 0 && (headerOffset < tabsTopValue || incomingOffset < tabsTopValue);
    const target = nearTop ? headerOffset : incomingOffset;

    if (target !== incomingOffset) {
      targetList.current?.scrollToOffset({ offset: target, animated: false });
    }

    return target;
  };

  const syncAndActivateTab = (nextTab: ProfileTabKey): void => {
    const headerOffset = Math.min(
      Math.max(titleTransition.scrollY.get(), 0),
      titleTransition.tabsTop.get(),
    );
    titleTransition.activateTab(nextTab, alignIncomingPage(nextTab, headerOffset));
  };

  const clearProgrammaticNav = (): void => {
    programmaticNavRef.current = false;
    if (programmaticNavTimerRef.current) {
      clearTimeout(programmaticNavTimerRef.current);
      programmaticNavTimerRef.current = null;
    }
  };

  const handleTabChange = (key: string): void => {
    const nextTab: ProfileTabKey = key === "saved" ? "saved" : "posts";
    if (nextTab === tab) return;

    // The pager animates, so ignore its scroll events; the target was aligned
    // above and activating it again would only touch the page being left.
    clearProgrammaticNav();
    programmaticNavRef.current = true;
    programmaticNavTimerRef.current = setTimeout(clearProgrammaticNav, 500);
    syncAndActivateTab(nextTab);
    setTab(nextTab);
    pagerRef.current?.setPage(nextTab === "saved" ? 1 : 0);
  };

  const handlePageSelected = (page: number): void => {
    const nextTab: ProfileTabKey = page === 1 ? "saved" : "posts";
    clearProgrammaticNav();
    swipeSyncTargetRef.current = null;
    syncAndActivateTab(nextTab);
    setTab(nextTab);
  };

  const handlePageScroll = ({ offset }: ProfilePageScroll): void => {
    if (programmaticNavRef.current) return;

    if (offset === 0) {
      swipeSyncTargetRef.current = null;
      return;
    }
    const tabsTopValue = tabsTop.get();
    if (tabsTopValue <= 0) return;

    // Align the incoming page as soon as the swipe starts, before it is more
    // than half visible; waiting for the halfway point makes it jump. `tab`
    // still points at the page being left until `onPageSelected` settles.
    const targetTab: ProfileTabKey = tab === "posts" ? "saved" : "posts";
    if (swipeSyncTargetRef.current === targetTab) return;
    swipeSyncTargetRef.current = targetTab;

    const headerOffset = Math.min(Math.max(titleTransition.scrollY.get(), 0), tabsTopValue);
    const incomingOffset = titleTransition.getPageScrollY(targetTab);
    const target = alignIncomingPage(targetTab, headerOffset);

    if (target !== incomingOffset) {
      titleTransition.setPageScrollY(targetTab, target);
    }
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
        <Animated.View style={inListTabsStyle}>
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
        </Animated.View>
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
        onScroll={titleTransition.onScrollFor("posts")}
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
        onScroll={titleTransition.onScrollFor("saved")}
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
        initialPage={0}
        pageIndex={tab === "saved" ? 1 : 0}
        onPageSelected={handlePageSelected}
        onPageScroll={handlePageScroll}
      >
        {[postsPage, savedPage]}
      </ProfilePager>
      <View pointerEvents="box-none" style={styles.headerClip}>
        <Animated.View pointerEvents="box-none" style={[styles.headerOverlay, headerStyle]}>
          {headerContent}
        </Animated.View>
      </View>
      <ProfileStickyTabs
        progress={stickyProgress}
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
