/**
 * Inset-grouped section for Settings (PF9.1).
 *
 * `overline` label above a `Card` that owns the grouped rows; screens connect
 * rows with `Divider` inside the card.
 */

import type { ReactNode } from "react";
import { View } from "react-native";

import { Card, Text, useTheme } from "@/shared/ui";

export type SettingsGroupProps = {
  label: string;
  children: ReactNode;
  testID?: string;
};

export function SettingsGroup({ label, children, testID }: SettingsGroupProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <Text variant="overline" color="textSecondary">
        {label}
      </Text>
      <Card padding={0}>{children}</Card>
    </View>
  );
}
