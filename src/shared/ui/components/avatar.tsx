import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type AvatarSize = 24 | 32 | 40 | 48 | 64 | 96;

export type AvatarProps = {
  /** Runtime data can be incomplete while restoring an old persisted cache. */
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  testID?: string;
};

/**
 * Round avatar. `expo-image` with `contentFit="cover"`; null `avatarUrl`
 * falls back to the `displayName` initial on `surfaceMuted`. Never fetches.
 */
export function Avatar({ displayName, avatarUrl, size = 40, testID }: AvatarProps) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: theme.radius.full };
  const safeDisplayName = typeof displayName === "string" ? displayName : "";
  const accessibleName = safeDisplayName.trim() || "User";

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={shape}
        contentFit="cover"
        transition={theme.motion.fast}
        accessibilityLabel={accessibleName}
        testID={testID}
      />
    );
  }

  const initial = (safeDisplayName.trim().slice(0, 1) || "?").toUpperCase();
  return (
    <View
      style={[shape, styles.fallback, { backgroundColor: theme.color.surfaceMuted }]}
      accessibilityRole="image"
      accessibilityLabel={accessibleName}
      testID={testID}
    >
      <Text variant={initialVariant(size)} color="textSecondary" style={styles.initial}>
        {initial}
      </Text>
    </View>
  );
}

function initialVariant(size: AvatarSize) {
  if (size <= 24) return "overline" as const;
  if (size <= 48) return "label" as const;
  if (size <= 64) return "h3" as const;
  return "h1" as const;
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
