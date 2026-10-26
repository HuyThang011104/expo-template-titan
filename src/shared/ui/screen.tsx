import type { ReactNode } from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "./theme/use-theme";

export type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Whether the screen sits under a native header. Defaults to `true`, which
   * drops the top safe-area edge so the header owns it. Headerless screens
   * (auth, not-found, media viewer) must pass `false`.
   */
  header?: boolean;
  /** Explicit override; prefer `header` so the default stays centralized. */
  edges?: Edge[];
  scroll?: boolean;
  testID?: string;
};

const HEADER_EDGES: Edge[] = ["left", "right", "bottom"];
const FULL_EDGES: Edge[] = ["top", "left", "right", "bottom"];

/**
 * Token-based screen shell on `theme.color.background`, safe-area aware.
 * No fetching, no header UI: `header` only selects the default safe-area edges.
 */
export function Screen({
  children,
  style,
  header = true,
  edges,
  scroll = false,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const background = { backgroundColor: theme.color.background };
  const resolvedEdges = edges ?? (header ? HEADER_EDGES : FULL_EDGES);

  if (scroll) {
    return (
      <SafeAreaView
        edges={resolvedEdges}
        style={[styles.flex, background, style]}
        testID={testID}
      >
        <ScrollView contentContainerStyle={styles.grow}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={resolvedEdges}
      style={[styles.flex, background, style]}
      testID={testID}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
});
