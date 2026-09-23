/**
 * FlashList wrapper. Virtualized feeds use this, never raw `FlashList` —
 * one place to pin draw distance, refresh, and end-reached behavior.
 * (FlashList v2 measures rows itself; there is no `estimatedItemSize`.)
 */

import { FlashList, type FlashListProps } from "@shopify/flash-list";
import type { ComponentType, ReactElement } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export type AppListProps<T> = {
  data: T[];
  renderItem: FlashListProps<T>["renderItem"];
  keyExtractor?: (item: T, index: number) => string;
  /** Extra render window in px. Raise for fast flings, lower for memory. */
  drawDistance?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: ComponentType | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppList<T>({
  data,
  renderItem,
  keyExtractor,
  drawDistance,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshing,
  onRefresh,
  ListEmptyComponent,
  contentContainerStyle,
  testID,
}: AppListProps<T>) {
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      drawDistance={drawDistance}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
