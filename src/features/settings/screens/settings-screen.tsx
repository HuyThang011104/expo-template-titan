/**
 * Settings hub (G2.3 menu + G2.4 account). Stack screen, not a modal.
 *
 * Thin menu: notifications + privacy + account (store-review required).
 * Route is viewer-scoped (own settings only); no user id param, no crash.
 */

import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { hrefs } from "@/shared/navigation/hrefs";
import { Divider, Icon, ListItem, Screen } from "@/shared/ui";

import { logSettingsOpen } from "../analytics";
import { SettingsGroup } from "../components/settings-group";

export function SettingsScreen() {
  useEffect(() => {
    logSettingsOpen();
  }, []);

  return (
    <Screen testID="settings-screen">
      <View style={styles.root}>
        <SettingsGroup label="Preferences" testID="settings-group">
          <ListItem
            title="Notifications"
            subtitle="Choose which activity notifies you"
            trailing={<Icon name="chevronRight" color="textTertiary" />}
            testID="settings-row-notifications"
            onPress={() => {
              router.push(hrefs.notifSettings());
            }}
          />
          <Divider inset={4} />
          <ListItem
            title="Privacy"
            subtitle="Who can message, see your posts and tag you"
            trailing={<Icon name="chevronRight" color="textTertiary" />}
            testID="settings-row-privacy"
            onPress={() => {
              router.push(hrefs.privacySettings());
            }}
          />
          <Divider inset={4} />
          <ListItem
            title="Account"
            subtitle="Password, sessions, language, theme, data"
            trailing={<Icon name="chevronRight" color="textTertiary" />}
            testID="settings-row-account"
            onPress={() => {
              router.push(hrefs.accountSettings());
            }}
          />
        </SettingsGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
});
