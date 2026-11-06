/**
 * Online dot (G3.2). Green when the peer is online, muted when offline or
 * unknown. Pure presence read — no fetching here beyond `usePresence`.
 */

import { StyleSheet, View } from "react-native";

import { usePresence } from "@/entities/conversation";
import { useTheme } from "@/shared/ui";

export type PresenceDotProps = {
  userId: string;
  size?: number;
};

export function PresenceDot({ userId, size = 12 }: PresenceDotProps) {
  const theme = useTheme();
  const query = usePresence(userId);
  const online = query.data?.online === true;
  return (
    <View
      testID={`presence-${userId}`}
      accessibilityLabel={online ? "Online" : "Offline"}
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: theme.color.surface,
          backgroundColor: online ? theme.color.success : theme.color.textTertiary,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
  },
});
