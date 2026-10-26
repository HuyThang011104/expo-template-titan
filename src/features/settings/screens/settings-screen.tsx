/**
 * Settings hub (G2.3 menu + G2.4 account). Stack screen, not a modal.
 *
 * Thin menu: notifications + privacy + account (store-review required).
 * Route is viewer-scoped (own settings only); no user id param, no crash.
 */

import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { hrefs } from "@/shared/navigation/hrefs";
import { Screen, Text } from "@/shared/ui";

import { logSettingsOpen } from "../analytics";

function SettingsRow({
  title,
  description,
  testID,
  onPress,
}: {
  title: string;
  description: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.texts}>
        <Text variant="body" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {description}
        </Text>
      </View>
      <Text variant="body" color="textSecondary">
        ›
      </Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  useEffect(() => {
    logSettingsOpen();
  }, []);

  return (
    <Screen edges={["left", "right", "bottom"]} testID="settings-screen">
      <View style={styles.root}>
        <SettingsRow
          title="Thông báo"
          description="Bật/tắt từng loại thông báo"
          testID="settings-row-notifications"
          onPress={() => {
            router.push(hrefs.notifSettings());
          }}
        />
        <SettingsRow
          title="Quyền riêng tư"
          description="Ai được nhắn tin, xem bài, tag bạn"
          testID="settings-row-privacy"
          onPress={() => {
            router.push(hrefs.privacySettings());
          }}
        />
        <SettingsRow
          title="Tài khoản"
          description="Mật khẩu, phiên đăng nhập, ngôn ngữ, giao diện, dữ liệu"
          testID="settings-row-account"
          onPress={() => {
            router.push(hrefs.accountSettings());
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: "700",
  },
});
