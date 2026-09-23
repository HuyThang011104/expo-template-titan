import type { ReactNode } from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "./theme/use-theme";

export type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scroll?: boolean;
  testID?: string;
};

/**
 * Token-based screen shell on `theme.color.background`, safe-area aware.
 * No fetching, no header logic.
 */
export function Screen({ children, style, edges, scroll = false, testID }: ScreenProps) {
  const theme = useTheme();
  const background = { backgroundColor: theme.color.background };

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={[styles.flex, background, style]} testID={testID}>
        <ScrollView contentContainerStyle={styles.grow}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, background, style]} testID={testID}>
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
