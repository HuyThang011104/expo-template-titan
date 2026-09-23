/**
 * Fallback UI for route `ErrorBoundary` exports. Route files stay thin:
 * they capture the error and render this. Detail message shows in dev only.
 */

import { StyleSheet, View } from "react-native";

import { Button } from "./button";
import { Screen } from "./screen";
import { Text } from "./text";

declare const __DEV__: boolean;

export type ErrorScreenProps = {
  error: Error;
  onRetry: () => void;
  testID?: string;
};

export function ErrorScreen({ error, onRetry, testID }: ErrorScreenProps) {
  const showDetail = typeof __DEV__ !== "undefined" && __DEV__;

  return (
    <Screen testID={testID}>
      <View style={styles.content}>
        <Text variant="title">Something went wrong</Text>
        <Text variant="body">The screen crashed. Your data is safe — try again.</Text>
        {showDetail ? (
          <Text variant="caption" testID={testID ? `${testID}-detail` : undefined}>
            {error.message}
          </Text>
        ) : null}
        <Button title="Try again" onPress={onRetry} testID={testID ? `${testID}-retry` : undefined} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
});
