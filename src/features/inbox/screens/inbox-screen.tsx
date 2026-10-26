/**
 * Inbox screen (F5 notifications).
 *
 * - Reads the inbox through `useInbox` (entity-backed infinite list).
 * - Header owns the mark-all-read action; rows own per-tap mark-read.
 * - Chat screens stay placeholders (F4 skipped) — this screen only.
 */

import { useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { hrefs } from "@/shared/navigation/hrefs";
import { Button, ErrorState, LoadingState, Screen, Text } from "@/shared/ui";

import { logInboxOpen, logMarkAllRead } from "../analytics";
import { NotificationsList } from "../components/notifications-list";
import { useInbox } from "../queries/use-inbox";

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

  const markAllDisabled = inbox.unreadCount === 0 || inbox.isMarkingAll;

  return (
    <Screen testID="inbox-screen">
      <View style={styles.headerRow}>
        <View style={styles.headerFlex}>
          <Text variant="title">Inbox</Text>
        </View>
        <Button
          title="Chats"
          variant="secondary"
          size="sm"
          testID="inbox-open-chats"
          onPress={() => {
            router.push(hrefs.chats());
          }}
        />
        <Button
          title={inbox.isMarkingAll ? "Marking…" : "Mark all read"}
          variant="secondary"
          size="sm"
          testID="inbox-mark-all"
          disabled={markAllDisabled}
          onPress={() => {
            logMarkAllRead(inbox.unreadCount);
            inbox.markAllRead();
          }}
        />
      </View>
      <View style={styles.listFlex}>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerFlex: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
});
