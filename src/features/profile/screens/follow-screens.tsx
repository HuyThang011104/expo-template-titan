/**
 * Follow list screens (G1.1): followers, following, incoming requests.
 *
 * Each screen is an id-list over the canonical user cache (same discipline
 * as `ProfilePostsList`): rows read `useUser`, never duplicate user data.
 */

import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import {
  useApproveFollowRequest,
  useFollowers,
  useFollowing,
  useFollowRequests,
  useRejectFollowRequest,
  useUserByHandle,
} from "@/entities/user";
import { AppList, Button, Screen, Text } from "@/shared/ui";

import { FollowUserRow } from "../components/follow-user-row";

function FollowListShell({
  testID,
  title,
  userIds,
  isPending,
  isError,
  isRefetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  refetch,
  emptyCopy,
  renderUserRow,
}: {
  testID: string;
  title: string;
  userIds: string[];
  isPending: boolean;
  isError: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  emptyCopy: string;
  renderUserRow?: (userId: string) => ReactElement;
}) {
  return (
    <Screen testID={testID}>
      <View style={styles.header}>
        <Text variant="title">{title}</Text>
      </View>
      {isPending ? (
        <View style={styles.center}>
          <Text variant="body">Loading…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load this list.</Text>
          <Button title="Retry" testID={`${testID}-retry-button`} onPress={refetch} />
        </View>
      ) : (
        <AppList
          testID={`${testID}-list`}
          data={userIds}
          renderItem={({ item }) =>
            renderUserRow ? renderUserRow(item) : <FollowUserRow userId={item} />
          }
          keyExtractor={(id) => id}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text variant="body">{emptyCopy}</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

export function FollowersScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();
  const resolved = useUserByHandle(handle ?? "");
  const userId = resolved.data?.id ?? "";
  const list = useFollowers(userId);

  if (!handle) {
    return (
      <Screen style={styles.center} testID="followers-screen">
        <Text variant="body">Missing user handle.</Text>
      </Screen>
    );
  }
  if (resolved.isPending) {
    return (
      <Screen style={styles.center} testID="followers-screen">
        <Text variant="body">Loading user…</Text>
      </Screen>
    );
  }
  if (resolved.isError || !resolved.data) {
    return (
      <Screen style={styles.center} testID="followers-screen">
        <Text variant="title">@{handle}</Text>
        <Text variant="body">User not found.</Text>
      </Screen>
    );
  }
  return (
    <FollowListShell
      testID="followers-screen"
      title={`Followers of @${handle}`}
      userIds={list.userIds}
      isPending={list.isPending}
      isError={list.isError}
      isRefetching={list.isRefetching}
      isFetchingNextPage={list.isFetchingNextPage}
      hasNextPage={list.hasNextPage}
      fetchNextPage={() => {
        void list.fetchNextPage();
      }}
      refetch={() => {
        void list.refetch();
      }}
      emptyCopy="No followers yet."
    />
  );
}

export function FollowingScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();
  const resolved = useUserByHandle(handle ?? "");
  const userId = resolved.data?.id ?? "";
  const list = useFollowing(userId);

  if (!handle) {
    return (
      <Screen style={styles.center} testID="following-screen">
        <Text variant="body">Missing user handle.</Text>
      </Screen>
    );
  }
  if (resolved.isPending) {
    return (
      <Screen style={styles.center} testID="following-screen">
        <Text variant="body">Loading user…</Text>
      </Screen>
    );
  }
  if (resolved.isError || !resolved.data) {
    return (
      <Screen style={styles.center} testID="following-screen">
        <Text variant="title">@{handle}</Text>
        <Text variant="body">User not found.</Text>
      </Screen>
    );
  }
  return (
    <FollowListShell
      testID="following-screen"
      title={`Following @${handle}`}
      userIds={list.userIds}
      isPending={list.isPending}
      isError={list.isError}
      isRefetching={list.isRefetching}
      isFetchingNextPage={list.isFetchingNextPage}
      hasNextPage={list.hasNextPage}
      fetchNextPage={() => {
        void list.fetchNextPage();
      }}
      refetch={() => {
        void list.refetch();
      }}
      emptyCopy="Not following anyone yet."
    />
  );
}

export function FollowRequestsScreen() {
  const list = useFollowRequests();
  return (
    <FollowListShell
      testID="follow-requests-screen"
      title="Follow requests"
      userIds={list.userIds}
      isPending={list.isPending}
      isError={list.isError}
      isRefetching={list.isRefetching}
      isFetchingNextPage={list.isFetchingNextPage}
      hasNextPage={list.hasNextPage}
      fetchNextPage={() => {
        void list.fetchNextPage();
      }}
      refetch={() => {
        void list.refetch();
      }}
      emptyCopy="No pending requests."
      renderUserRow={(userId) => <FollowRequestRow followerId={userId} />}
    />
  );
}

function FollowRequestRow({ followerId }: { followerId: string }) {
  const approve = useApproveFollowRequest(followerId);
  const reject = useRejectFollowRequest(followerId);
  const busy = approve.isPending || reject.isPending;
  const failed = approve.isError || reject.isError;
  return (
    <View>
      <FollowUserRow userId={followerId} testID={`follow-request-${followerId}`} hideAction />
      <View style={styles.requestActions}>
        <Button
          title="Approve"
          testID={`approve-button-${followerId}`}
          size="sm"
          loading={busy}
          onPress={() => {
            approve.reset();
            reject.reset();
            approve.mutate();
          }}
        />
        <Button
          title="Reject"
          testID={`reject-button-${followerId}`}
          variant="secondary"
          size="sm"
          loading={busy}
          onPress={() => {
            approve.reset();
            reject.reset();
            reject.mutate();
          }}
        />
      </View>
      {failed ? (
        <View style={styles.requestError}>
          <Text variant="caption" color="textSecondary">
            Couldn&apos;t update. Pull to retry.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  requestError: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
