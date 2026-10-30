import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { ErrorState, LoadingState } from "../components";
import { Screen } from "../screen";

/**
 * Keyboard scope mirroring `KeyboardScope` in `app-providers.tsx`: the
 * controller library is native-only, so web renders children straight through.
 */
function DetailKeyboardAvoidingView({ children }: { children: ReactNode }) {
  if (process.env.EXPO_OS === "web") return <>{children}</>;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      automaticOffset
      style={styles.flex}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

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
 * same five questions. The body and footer share one keyboard-avoiding scope,
 * so a focused composer lifts above the keyboard instead of hiding behind it.
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
      <DetailKeyboardAvoidingView>
        <View style={styles.body}>{children}</View>
        {footer}
      </DetailKeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
