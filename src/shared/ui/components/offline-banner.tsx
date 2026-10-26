import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsOffline } from "../../network";
import { Icon } from "../icons";
import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

/**
 * App-scope connectivity banner. Rendered once by the provider tree so it
 * never unmounts with a screen and never blocks cached content.
 */
export function OfflineBanner({ testID = "offline-banner" }: { testID?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();

  if (!offline) return null;

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Showing saved content."
      style={[
        styles.root,
        {
          top: insets.top,
          backgroundColor: theme.color.warningSoft,
          borderBottomColor: theme.color.warning,
        },
      ]}
    >
      <Icon name="offline" size="sm" color="warning" decorative />
      <Text variant="caption" color="warning" style={styles.label}>
        You&apos;re offline. Showing saved content.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight: "600",
  },
});
