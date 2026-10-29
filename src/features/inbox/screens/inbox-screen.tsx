/**
 * Inbox screen (F5 notifications, PF5.1).
 *
 * - Reads the inbox through `useInbox` (entity-backed infinite list).
 * - Native header owns the actions: Chats and Mark all read (testIDs kept).
 * - Rows own per-tap mark-read.
 * - Chat screens stay placeholders (F4 skipped) — this screen only.
 */

import { useEffect } from "react";
import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { hrefs } from "@/shared/navigation/hrefs";
import { Button, ErrorState, IconButton, LoadingState, Screen } from "@/shared/ui";

import { logInboxOpen, logMarkAllRead } from "../analytics";
import { NotificationsList } from "../components/notifications-list";
import { useInbox } from "../queries/use-inbox";

type InboxHeaderActionsProps = {
  unreadCount: number;
  markingAll: boolean;
  onMarkAllRead: () => void;
};

function InboxHeaderActions({
  unreadCount,
  markingAll,
  onMarkAllRead,
}: InboxHeaderActionsProps) {
  const disabled = unreadCount === 0 || markingAll;

  return (
    <View style={styles.headerActions}>
      <IconButton
        icon="comment"
        size="sm"
        accessibilityLabel="Chats"
        testID="inbox-open-chats"
        onPress={() => {
          router.push(hrefs.chats());
        }}
      />
      <Button
        title={markingAll ? "Marking…" : "Mark all read"}
        variant="ghost"
        size="sm"
        testID="inbox-mark-all"
        disabled={disabled}
        onPress={onMarkAllRead}
      />
    </View>
  );
}

export function InboxScreen() {
  const inbox = useInbox();

  useEffect(() => {
    logInboxOpen();
  }, []);

  if (inbox.isPending) {
    return (
      <Screen testID="inbox-screen">
        <LoadingState label="Loading inbox" testID="inbox-loading" />
      </Screen>
    );
  }

  if (inbox.isError) {
    return (
      <Screen testID="inbox-screen">
        <ErrorState
          title="Couldn't load your notifications"
          message="Check your connection and try again."
          testID="inbox-error"
          retryTestID="inbox-retry-button"
          onRetry={() => {
            void inbox.refetch();
          }}
        />
      </Screen>
    );
  }

  const markAllRead = (): void => {
    logMarkAllRead(inbox.unreadCount);
    inbox.markAllRead();
  };

  return (
    <Screen testID="inbox-screen">
      <Stack.Screen
        options={{
          headerRight: () => (
            <InboxHeaderActions
              unreadCount={inbox.unreadCount}
              markingAll={inbox.isMarkingAll}
              onMarkAllRead={markAllRead}
            />
          ),
        }}
      />
      <NotificationsList
        notificationIds={inbox.notificationIds}
        isFetchingNextPage={inbox.isFetchingNextPage}
        isRefetching={inbox.isRefetching}
        onEndReached={() => {
          if (inbox.hasNextPage && !inbox.isFetchingNextPage) void inbox.fetchNextPage();
        }}
        onRefresh={() => {
          void inbox.refetch();
        }}
        prefetchTarget={inbox.prefetchTarget}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
