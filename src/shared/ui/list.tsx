/**
 * FlashList wrapper. Virtualized feeds use this, never raw `FlashList` —
 * one place to pin draw distance, refresh, and end-reached behavior.
 * (FlashList v2 measures rows itself; there is no `estimatedItemSize`.)
 *
 * `AppAnimatedList` is the same list wrapped with Reanimated so a worklet
 * `onScroll` runs on the UI thread. Use it when a shared header/title must
 * track the native scroll frame-for-frame (e.g. the profile overlay).
 */

import { FlashList, type FlashListProps, type FlashListRef } from "@shopify/flash-list";
import type { ComponentType, ReactElement, Ref } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

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
  /** Hide the native scrollbar (e.g. under a shared overlay header). */
  showsVerticalScrollIndicator?: boolean;
  ListEmptyComponent?: ComponentType | ReactElement | null;
  ListHeaderComponent?: ComponentType | ReactElement | null;
  ListFooterComponent?: ComponentType | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as ComponentType<Record<string, unknown>>,
) as unknown as typeof FlashList;

type AppListBaseProps<T> = AppListProps<T> & {
  List: typeof FlashList;
};

function AppListBase<T>({ List, ...props }: AppListBaseProps<T>) {
  const {
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
    showsVerticalScrollIndicator,
    ListEmptyComponent,
    ListHeaderComponent,
    ListFooterComponent,
    contentContainerStyle,
    testID,
  } = props;

  return (
    <List
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
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      testID={testID}
    />
  );
}

export function AppList<T>(props: AppListProps<T>) {
  return <AppListBase {...props} List={FlashList} />;
}

export function AppAnimatedList<T>(props: AppListProps<T>) {
  return <AppListBase {...props} List={AnimatedFlashList} />;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
