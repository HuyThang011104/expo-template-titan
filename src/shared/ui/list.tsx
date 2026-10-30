/**
 * FlashList wrapper. Virtualized feeds use this, never raw `FlashList` —
 * one place to pin draw distance, refresh, and end-reached behavior.
 * (FlashList v2 measures rows itself; there is no `estimatedItemSize`.)
 */

import { FlashList, type FlashListProps, type FlashListRef } from "@shopify/flash-list";
import type { ComponentType, ReactElement, Ref } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export type AppListProps<T> = {
  /** Imperative handle for screen-owned scroll resets (PF4.3). */
  ref?: Ref<FlashListRef<T>>;
  data: T[];
  renderItem: FlashListProps<T>["renderItem"];
  keyExtractor?: (item: T, index: number) => string;
  /** Extra render window in px. Raise for fast flings, lower for memory. */
  drawDistance?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Android refresh spinner offset, e.g. below a collapsing overlay header. */
  progressViewOffset?: number;
  /** Screen-owned scroll handler (JS or Reanimated worklet). */
  onScroll?: FlashListProps<T>["onScroll"];
  scrollEventThrottle?: FlashListProps<T>["scrollEventThrottle"];
  ListEmptyComponent?: ComponentType | ReactElement | null;
  ListHeaderComponent?: ComponentType | ReactElement | null;
  ListFooterComponent?: ComponentType | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppList<T>({
  ref,
  data,
  renderItem,
  keyExtractor,
  drawDistance,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshing,
  onRefresh,
  progressViewOffset,
  onScroll,
  scrollEventThrottle,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  testID,
}: AppListProps<T>) {
  return (
    <FlashList
      ref={ref}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      drawDistance={drawDistance}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshing={refreshing}
      onRefresh={onRefresh}
      progressViewOffset={progressViewOffset}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
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
