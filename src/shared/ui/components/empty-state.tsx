import type { StyleProp, ViewStyle } from "react-native";

import type { IconName } from "../icons";
import { Button } from "./button";
import { StateLayout } from "./state-layout";

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
  accessibilityLabel,
  style,
  testID,
}: EmptyStateProps) {
  return (
    <StateLayout
      icon={icon}
      iconColor="textSecondary"
      iconBackground="surfaceMuted"
      title={title}
      description={description}
      accessibilityLabel={accessibilityLabel}
      action={
        actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} />
        ) : undefined
      }
      style={style}
      testID={testID}
    />
  );
}
