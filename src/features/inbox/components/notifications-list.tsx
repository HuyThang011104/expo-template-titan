/**
 * Notifications list — the single `FlashList` that renders the inbox.
 *
 * - `data` is a flat `notificationIds` array read via canonical row.
 * - Tapping a row marks it read (entity mutation) and follows its target link.
 */

import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text, useTheme } from "@/shared/ui";

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
    <View style={styles.empty}>
      <Text variant="body" testID="inbox-empty">
        You&apos;re all caught up.
      </Text>
    </View>
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
  const theme = useTheme();

  return (
    <FlashList
      testID="inbox-list"
      data={notificationIds}
      renderItem={({ item }) => (
        <NotificationRow notificationId={item} prefetchTarget={prefetchTarget} />
      )}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={<InboxEmpty />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={theme.color.primary} style={styles.footer} />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    padding: 24,
  },
  footer: {
    padding: 16,
  },
  separator: {
    height: 8,
  },
});
