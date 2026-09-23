import { StyleSheet, View } from "react-native";

import { ExternalLink, Screen, Text } from "@/shared/ui";

import { AnimatedIcon } from "../components/animated-icon";
import { Collapsible } from "../components/collapsible";
import { HintRow } from "../components/hint-row";
import { WebBadge } from "../components/web-badge";

/**
 * Dev-only screen rendering the Expo template reference demos.
 * Visual QA for theming + the web CSS-module case (`animated-icon`).
 * Not linked from any tab — open via deep link when logged in.
 */
export function ShowcaseScreen() {
  return (
    <Screen scroll>
      <View style={styles.section}>
        <Text variant="title">Showcase</Text>
        <Text variant="body">Template reference demos — dev only, no product logic.</Text>
      </View>
      <View style={styles.section}>
        <AnimatedIcon />
      </View>
      <View style={styles.section}>
        <HintRow />
      </View>
      <View style={styles.section}>
        <Collapsible title="Template collapsible">
          <Text variant="body">Reanimated + symbols smoke test.</Text>
        </Collapsible>
      </View>
      <View style={styles.section}>
        <WebBadge />
      </View>
      <View style={styles.section}>
        <ExternalLink href="https://docs.expo.dev/">
          <Text variant="body">Expo docs</Text>
        </ExternalLink>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: "center",
    paddingVertical: 12,
  },
});
