/**
 * Notifications list — the single `AppList` that renders the inbox.
 *
 * - `data` is a flat `notificationIds` array read via canonical row.
 * - Tapping a row marks it read (entity mutation) and follows its target link.
 */

import { StyleSheet } from "react-native";

import { AppList, EmptyState, LoadingState } from "@/shared/ui";

import { NotificationRow } from "./notification-row";

export type NotificationsListProps = {
  notificationIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchTarget: (id: string) => void;
};

function InboxEmpty() {
  return (
    <EmptyState
      icon="inbox"
      title="You're all caught up"
      description="New likes, follows, and mentions will show up here."
      testID="inbox-empty"
    />
  );
}

export function NotificationsList({
  notificationIds,
  isFetchingNextPage,
  isRefetching,
  onEndReached,
  onRefresh,
  prefetchTarget,
}: NotificationsListProps) {
  return (
    <AppList
      testID="inbox-list"
      data={notificationIds}
      renderItem={({ item }) => (
        <NotificationRow notificationId={item} prefetchTarget={prefetchTarget} />
      )}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={<InboxEmpty />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <LoadingState label="Loading more notifications" style={styles.footer} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
  },
});
