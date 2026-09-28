/**
 * Inbox screen (F5 notifications).
 *
 * - Reads the inbox through `useInbox` (entity-backed infinite list).
 * - Header owns the mark-all-read action; rows own per-tap mark-read.
 * - Chat screens stay placeholders (F4 skipped) — this screen only.
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

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
        <Text variant="body" testID="inbox-loading">
          Loading inbox…
        </Text>
      </Screen>
    );
  }

  if (inbox.isError) {
    return (
      <Screen style={styles.center} testID="inbox-screen">
        <Text variant="title">Inbox</Text>
        <Text variant="body">Couldn&apos;t load your notifications.</Text>
        <Button
          title="Retry"
          testID="inbox-retry-button"
          onPress={() => {
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
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
