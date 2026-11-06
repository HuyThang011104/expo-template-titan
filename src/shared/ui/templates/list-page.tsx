import type { StyleProp, ViewStyle } from "react-native";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  type EmptyStateProps,
} from "../components";
import { AppList, type AppListProps } from "../list";
import { Screen } from "../screen";

export type ListPageProps<T> = {
  /** Screen testID; list/state children derive their own suffix. */
  testID: string;
  data: T[];
  renderItem: AppListProps<T>["renderItem"];
  keyExtractor?: AppListProps<T>["keyExtractor"];
  header?: AppListProps<T>["ListHeaderComponent"];
  isPending?: boolean;
  loadingLabel?: string;
  isError?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  empty: Pick<EmptyStateProps, "icon" | "title" | "description" | "actionLabel" | "onAction">;
  onRefresh?: () => void;
  isRefetching?: boolean;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Native-header list page (spec §8.1): ListPage owns the five list states so
 * every screen answers loading/empty/error consistently. The screen supplies
 * canonically-backed ids and row rendering only.
 */
export function ListPage<T>({
  testID,
  data,
  renderItem,
  keyExtractor,
  header,
  isPending = false,
  loadingLabel = "Loading",
  isError = false,
  errorTitle = "Couldn't load this list",
  errorMessage = "Check your connection and try again.",
  onRetry,
  empty,
  onRefresh,
  isRefetching = false,
  onEndReached,
  isFetchingNextPage = false,
  contentContainerStyle,
}: ListPageProps<T>) {
  if (isPending) {
    return (
      <Screen testID={testID}>
        <LoadingState label={loadingLabel} testID={`${testID}-loading`} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen testID={testID}>
        <ErrorState
          title={errorTitle}
          message={errorMessage}
          testID={`${testID}-error`}
          retryTestID={`${testID}-retry-button`}
          onRetry={() => {
            onRetry?.();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID={testID}>
      <AppList
        testID={`${testID}-list`}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={onEndReached}
        onRefresh={onRefresh}
        refreshing={isRefetching}
        ListHeaderComponent={header}
        contentContainerStyle={contentContainerStyle}
        ListEmptyComponent={
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            actionLabel={empty.actionLabel}
            onAction={empty.onAction}
            testID={`${testID}-empty`}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? <LoadingState label="Loading more" /> : null
        }
      />
    </Screen>
  );
}
