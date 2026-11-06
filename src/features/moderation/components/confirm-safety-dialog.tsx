/**
 * Block/mute confirm dialog content (F6).
 *
 * Dumb: the caller owns the action, pending state, and callbacks.
 * Rendered inline in the report sheet success path or safety menus.
 */

import { StyleSheet, View } from "react-native";

import { Button, Text } from "@/shared/ui";

import type { SafetyAction } from "../model";

export type ConfirmSafetyDialogProps = {
  action: SafetyAction;
  handle: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function titleFor(action: SafetyAction, handle: string): string {
  switch (action) {
    case "block":
      return `Block @${handle}?`;
    case "unblock":
      return `Unblock @${handle}?`;
    case "mute":
      return `Mute @${handle}?`;
    case "unmute":
      return `Unmute @${handle}?`;
  }
}

function bodyFor(action: SafetyAction): string {
  switch (action) {
    case "block":
      return "You won't see their posts anymore. They won't be notified.";
    case "unblock":
      return "Their posts will show up again.";
    case "mute":
      return "Their posts will be hidden. They won't be notified.";
    case "unmute":
      return "Their posts will show up again.";
  }
}

function confirmLabelFor(action: SafetyAction, pending: boolean): string {
  if (pending) return "Working…";
  switch (action) {
    case "block":
      return "Block";
    case "unblock":
      return "Unblock";
    case "mute":
      return "Mute";
    case "unmute":
      return "Unmute";
  }
}

export function ConfirmSafetyDialog({
  action,
  handle,
  pending,
  onConfirm,
  onCancel,
}: ConfirmSafetyDialogProps) {
  return (
    <View style={styles.root} testID={`safety-confirm-${action}`}>
      <Text variant="title">{titleFor(action, handle)}</Text>
      <Text variant="body" color="textSecondary">
        {bodyFor(action)}
      </Text>
      <View style={styles.buttons}>
        <Button
          title="Cancel"
          variant="secondary"
          size="sm"
          testID={`safety-confirm-${action}-cancel`}
          disabled={pending}
          onPress={onCancel}
        />
        <Button
          title={confirmLabelFor(action, pending)}
          variant="primary"
          size="sm"
          testID={`safety-confirm-${action}-button`}
          disabled={pending}
          loading={pending}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
    padding: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
