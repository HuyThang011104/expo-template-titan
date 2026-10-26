import type { StyleProp, ViewStyle } from "react-native";

import { Button } from "./button";
import { StateLayout } from "./state-layout";

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
  retryLabel = "Retry",
  accessibilityLabel,
  style,
  testID,
}: ErrorStateProps) {
  return (
    <StateLayout
      icon="alert"
      iconColor="danger"
      iconBackground="dangerSoft"
      title={title}
      description={message}
      accessibilityLabel={accessibilityLabel}
      action={<Button title={retryLabel} onPress={onRetry} />}
      style={style}
      testID={testID}
    />
  );
}
