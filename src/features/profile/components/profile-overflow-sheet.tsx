/**
 * Profile overflow menus (PF4.1).
 *
 * - `ProfileOverflowMenu` (me): `headerRight` `more` → Sheet with Follow
 *   requests (badge N), Settings, Sign out (danger). The sign-out testID
 *   stays on the sheet item, so Maestro must open the menu first.
 * - `UserOverflowMenu` (other viewers): report / block / share. Block uses
 *   the entity safety hooks with optimistic rollback.
 */

import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { useBlockUser, useFollowRequests, useUnblockUser } from "@/entities/user";
import { useSession } from "@/shared/auth";
import { buildUserDeepLink, resolveAppScheme } from "@/shared/navigation";
import { hrefs } from "@/shared/navigation/hrefs";
import { Icon, type IconName, IconButton, Sheet, Text, useTheme } from "@/shared/ui";

type SheetActionProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: "default" | "danger";
  testID: string;
};

function SheetAction({ label, onPress, icon, tone = "default", testID }: SheetActionProps) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}
    >
      <View style={styles.iconSlot}>
        {icon ? (
          <Icon
            name={icon}
            size="md"
            color={tone === "danger" ? "danger" : "textSecondary"}
            decorative
          />
        ) : null}
      </View>
      <Text variant="body" color={tone === "danger" ? "danger" : undefined}>
        {label}
      </Text>
      <View style={styles.spacer} />
      {tone === "danger" ? null : (
        <Icon name="chevronRight" size="sm" color="textTertiary" decorative />
      )}
      <View style={[styles.hairline, { backgroundColor: theme.color.border }]} />
    </Pressable>
  );
}

export function ProfileOverflowMenu() {
  const [open, setOpen] = useState(false);
  const requests = useFollowRequests();
  const { signOut } = useSession();
  const requestCount = requests.userIds.length;

  const close = (): void => {
    setOpen(false);
  };

  return (
    <>
      <IconButton
        icon="more"
        accessibilityLabel="Profile options"
        testID="profile-overflow-button"
        onPress={() => {
          setOpen(true);
        }}
      />
      <Sheet visible={open} onClose={close} title="Profile" testID="profile-overflow-sheet">
        <SheetAction
          label={requestCount > 0 ? `Follow requests (${requestCount})` : "Follow requests"}
          icon="profile"
          testID="profile-requests-button"
          onPress={() => {
            close();
            router.push(hrefs.followRequests());
          }}
        />
        <SheetAction
          label="Settings"
          icon="settings"
          testID="profile-settings-button"
          onPress={() => {
            close();
            router.push(hrefs.settings());
          }}
        />
        <SheetAction
          label="Sign out"
          tone="danger"
          testID="profile-sign-out-button"
          onPress={() => {
            close();
            signOut();
          }}
        />
      </Sheet>
    </>
  );
}

export type UserOverflowMenuProps = {
  userId: string;
  handle: string;
  isBlocked: boolean;
};

export function UserOverflowMenu({ userId, handle, isBlocked }: UserOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const block = useBlockUser(userId);
  const unblock = useUnblockUser(userId);

  const close = (): void => {
    setOpen(false);
  };

  const confirmBlock = (): void => {
    close();
    Alert.alert(
      `Block @${handle}?`,
      "They won't be able to see your posts or follow you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            block.reset();
            block.mutate();
          },
        },
      ],
    );
  };

  return (
    <>
      <IconButton
        icon="more"
        accessibilityLabel="User options"
        testID="user-overflow-button"
        onPress={() => {
          setOpen(true);
        }}
      />
      <Sheet visible={open} onClose={close} title={`@${handle}`} testID="user-overflow-sheet">
        <SheetAction
          label="Share profile"
          icon="share"
          testID="user-share-button"
          onPress={() => {
            close();
            void Share.share({
              message: buildUserDeepLink(handle, resolveAppScheme()),
            });
          }}
        />
        <SheetAction
          label="Report"
          icon="flag"
          testID="user-report-button"
          onPress={() => {
            close();
            router.push(hrefs.report("user", userId));
          }}
        />
        <SheetAction
          label={isBlocked ? `Unblock @${handle}` : `Block @${handle}`}
          icon="lock"
          tone="danger"
          testID="user-block-button"
          onPress={() => {
            if (isBlocked) {
              close();
              unblock.reset();
              unblock.mutate();
              return;
            }
            confirmBlock();
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    gap: 12,
  },
  iconSlot: {
    width: 24,
    alignItems: "center",
  },
  spacer: {
    flex: 1,
  },
  hairline: {
    position: "absolute",
    left: 36,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
