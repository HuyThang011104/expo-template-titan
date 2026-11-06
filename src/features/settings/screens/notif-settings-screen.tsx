/**
 * Notification settings screen (G2.3, stack screen).
 *
 * - Reads the canonical `useNotifPrefs` (GET /notif-prefs, all-on default).
 * - Each toggle flips optimistically with rollback; success invalidates the
 *   inbox so a killed kind (e.g. like) disappears at once while other kinds
 *   (e.g. follow) stay.
 * - Transport failures surface inline with per-row retry affordance (the
 *   switch itself reverts via rollback, tapping again retries).
 */

import { Fragment, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useNotifPrefs,
  useUpdateNotifPref,
  type NotifPrefKey,
} from "@/entities/notification";
import { Divider, ErrorState, LoadingState, Screen, Text } from "@/shared/ui";

import { logNotifSettingsOpen } from "../analytics";
import { PrefToggleRow } from "../components/pref-toggle-row";
import { SettingsGroup } from "../components/settings-group";

const ROWS: { key: NotifPrefKey; title: string; description: string }[] = [
  {
    key: "like",
    title: "Likes on my posts",
    description: "Notify me when someone likes one of my posts",
  },
  {
    key: "follow",
    title: "New followers",
    description: "When someone starts following you",
  },
  {
    key: "comment",
    title: "New comments",
    description: "When someone comments on your activity",
  },
  {
    key: "mention",
    title: "Mentions",
    description: "When someone @mentions you",
  },
  {
    key: "message",
    title: "New messages",
    description: "When someone sends you a message",
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
      <Screen testID="notif-settings-screen">
        <LoadingState label="Loading notification settings" testID="notif-settings-loading" />
      </Screen>
    );
  }

  if (prefs.isError || !prefs.data) {
    return (
      <Screen testID="notif-settings-screen">
        <ErrorState
          title="Couldn't load notification settings"
          message="Check your connection and try again."
          testID="notif-settings-error-state"
          retryTestID="notif-settings-retry-button"
          onRetry={() => {
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
        <SettingsGroup label="Activity" testID="notif-settings-group">
          {ROWS.map((row, index) => (
            <Fragment key={row.key}>
              {index > 0 ? <Divider inset={4} /> : null}
              <PrefToggleRow
                title={row.title}
                description={row.description}
                value={values[row.key]}
                pending={pendingKey === row.key}
                testID={`notif-pref-${row.key}`}
                onToggle={(next) => {
                  toggle(row.key, next);
                }}
              />
            </Fragment>
          ))}
        </SettingsGroup>
        {error ? (
          <Text variant="caption" color="danger" testID="notif-settings-error">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
});
