import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ErrorState, LoadingState } from "../components";
import { Screen } from "../screen";

export type DetailPageProps = {
  testID: string;
  /** Scrollable or virtualized detail body. */
  children: ReactNode;
  /** Pinned below the body (composer, action bar). */
  footer?: ReactNode;
  isPending?: boolean;
  loadingLabel?: string;
  isError?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

/**
 * Native-header detail page (spec §8.1): body fills the screen, optional
 * footer stays pinned. States match ListPage so detail screens answer the
 * same five questions.
 */
export function DetailPage({
  testID,
  children,
  footer,
  isPending = false,
  loadingLabel = "Loading",
  isError = false,
  errorTitle = "Couldn't load this page",
  errorMessage = "Check your connection and try again.",
  onRetry,
}: DetailPageProps) {
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
      <View style={styles.body}>{children}</View>
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
});
