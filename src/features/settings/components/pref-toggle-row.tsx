/**
 * Notification pref toggle row (G2.3, PF9.1).
 *
 * ListItem anatomy with a native trailing `Switch`. The screen owns the
 * mutation; a pending toggle locks only its own row.
 */

import { Switch } from "react-native";

import { ListItem } from "@/shared/ui";

export type PrefToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  pending: boolean;
  testID: string;
  onToggle: (next: boolean) => void;
};

export function PrefToggleRow({
  title,
  description,
  value,
  pending,
  testID,
  onToggle,
}: PrefToggleRowProps) {
  return (
    <ListItem
      title={title}
      subtitle={description}
      testID={testID}
      trailing={
        <Switch
          testID={`${testID}-switch`}
          accessibilityLabel={title}
          value={value}
          disabled={pending}
          onValueChange={onToggle}
        />
      }
    />
  );
}
