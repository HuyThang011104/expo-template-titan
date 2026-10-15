/**
 * Notification settings screen (G2.3, `formSheet`).
 *
 * - Reads the canonical `useNotifPrefs` (GET /notif-prefs, all-on default).
 * - Each toggle flips optimistically with rollback; success invalidates the
 *   inbox so a killed kind (e.g. like) disappears at once while other kinds
 *   (e.g. follow) stay.
 * - Transport failures surface inline with per-row retry affordance (the
 *   switch itself reverts via rollback, tapping again retries).
 */

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useNotifPrefs,
  useUpdateNotifPref,
  type NotifPrefKey,
} from "@/entities/notification";
import { Button, Screen, Text } from "@/shared/ui";

import { logNotifSettingsOpen } from "../analytics";
import { PrefToggleRow } from "../components/pref-toggle-row";

const ROWS: { key: NotifPrefKey; title: string; description: string }[] = [
  {
    key: "like",
    title: "Ai like bài tôi",
    description: "Nhận thông báo khi ai đó thích bài của bạn",
  },
  {
    key: "follow",
    title: "Lượt follow mới",
    description: "Khi có người bắt đầu theo dõi bạn",
  },
  {
    key: "comment",
    title: "Bình luận mới",
    description: "Khi có bình luận mới cho bạn",
  },
  {
    key: "mention",
    title: "Nhắc đến tôi",
    description: "Khi ai đó @nhắc đến bạn",
  },
  {
    key: "message",
    title: "Tin nhắn mới",
    description: "Khi có tin nhắn mới cho bạn",
  },
];

export function NotifSettingsScreen() {
  const prefs = useNotifPrefs();
  const update = useUpdateNotifPref();
  const [pendingKey, setPendingKey] = useState<NotifPrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logNotifSettingsOpen();
  }, []);

  if (prefs.isPending) {
    return (
      <Screen style={styles.center} testID="notif-settings-screen">
        <Text variant="body">Loading notification settings…</Text>
      </Screen>
    );
  }

  if (prefs.isError || !prefs.data) {
    return (
      <Screen style={styles.center} testID="notif-settings-screen">
        <Text variant="title">Thông báo</Text>
        <Text variant="body">Couldn&apos;t load your notification settings.</Text>
        <Button
          title="Retry"
          testID="notif-settings-retry-button"
          onPress={() => {
            void prefs.refetch();
          }}
        />
      </Screen>
    );
  }

  const values = prefs.data;

  const toggle = (key: NotifPrefKey, next: boolean): void => {
    setError(null);
    setPendingKey(key);
    update.mutate(
      { key, enabled: next },
      {
        onSettled: () => {
          setPendingKey(null);
        },
        onError: () => {
          setError("Couldn't save your settings. Toggle again to retry.");
        },
      },
    );
  };

  return (
    <Screen testID="notif-settings-screen">
      <View style={styles.root}>
        {ROWS.map((row) => (
          <PrefToggleRow
            key={row.key}
            title={row.title}
            description={row.description}
            value={values[row.key]}
            pending={pendingKey === row.key}
            testID={`notif-pref-${row.key}`}
            onToggle={(next) => {
              toggle(row.key, next);
            }}
          />
        ))}
        {error ? (
          <Text variant="caption" testID="notif-settings-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  root: {
    paddingVertical: 8,
  },
  error: {
    paddingHorizontal: 16,
  },
});
