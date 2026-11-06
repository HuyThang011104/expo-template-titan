import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Skeleton, Spinner } from "../primitives";
import { useTheme } from "../theme/use-theme";

export type LoadingStateVariant = "spinner" | "skeleton";

export type LoadingStateProps = {
  variant?: LoadingStateVariant;
  rows?: number;
  label?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function LoadingState({
  variant = "spinner",
  rows = 3,
  label = "Loading",
  accessibilityLabel,
  style,
  testID,
}: LoadingStateProps) {
  const theme = useTheme();
  const count = Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 1;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.container, style]}
    >
      {variant === "skeleton" ? (
        <View
          style={[styles.skeleton, { gap: theme.space[3] }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: count }, (_, index) => (
            <Skeleton
              key={index}
              width={index === count - 1 ? "60%" : "100%"}
              testID={testID ? `${testID}-skeleton-${index}` : undefined}
            />
          ))}
        </View>
      ) : (
        <Spinner size="md" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  skeleton: {
    width: "100%",
    maxWidth: 480,
  },
});
