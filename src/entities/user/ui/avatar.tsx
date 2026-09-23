/**
 * Round avatar.
 *
 * - `expo-image` with `contentFit="cover"` and full radius.
 * - Null `avatarUrl` falls back to the `displayName` initial.
 */

import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

export type AvatarSize = 32 | 40 | 48;

export type AvatarProps = {
  displayName: string;
  avatarUrl: string | null;
  size?: AvatarSize;
  testID?: string;
};

export function Avatar({ displayName, avatarUrl, size = 40, testID }: AvatarProps) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: theme.radius.full };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={shape}
        contentFit="cover"
        transition={200}
        accessibilityLabel={displayName}
        testID={testID}
      />
    );
  }

  const initial = (displayName.trim().slice(0, 1) || "?").toUpperCase();
  return (
    <View
      style={[shape, styles.fallback, { backgroundColor: theme.color.backgroundElement }]}
      accessibilityRole="image"
      accessibilityLabel={displayName}
      testID={testID}
    >
      <Text variant="small" color="textSecondary" style={styles.initial}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "700",
  },
});
