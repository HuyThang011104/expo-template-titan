/**
 * Privacy settings screen (G2.3, stack screen).
 *
 * - Reads the viewer's `privacySettings` from the canonical `useMe`.
 * - Each option saves immediately (PATCH /users/me/privacy, partial); the
 *   canonical user overwrites everywhere and visible lists invalidate so a
 *   flip (e.g. public → followers) takes effect at once.
 * - `following` means people the viewer follows (checkable outgoing status).
 */

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useMe,
  useUpdatePrivacy,
  type MessageAudience,
  type PostVisibility,
  type TagAudience,
} from "@/entities/user";
import { ErrorState, LoadingState, Screen, Text } from "@/shared/ui";

import { logPrivacySettingsOpen } from "../analytics";
import { AudienceOptionGroup } from "../components/audience-option-group";

const AUDIENCE_OPTIONS: { value: MessageAudience; label: string; description: string }[] = [
  { value: "everyone", label: "Everyone", description: "Anyone is allowed" },
  { value: "following", label: "People I follow", description: "Only people you follow" },
  { value: "none", label: "Nobody", description: "Turned off completely" },
];

export function PrivacySettingsScreen() {
  const me = useMe();
  const update = useUpdatePrivacy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logPrivacySettingsOpen();
  }, []);

  if (me.isPending) {
    return (
      <Screen testID="privacy-settings-screen">
        <LoadingState label="Loading privacy settings" testID="privacy-settings-loading" />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen testID="privacy-settings-screen">
        <ErrorState
          title="Couldn't load privacy settings"
          message="Check your connection and try again."
          testID="privacy-settings-error-state"
          retryTestID="privacy-settings-retry-button"
          onRetry={() => {
            void me.refetch();
          }}
        />
      </Screen>
    );
  }

  const privacy = me.data.privacySettings;

  const save = (patch: Parameters<typeof update.mutate>[0]): void => {
    setError(null);
    setPending(true);
    update.mutate(patch, {
      onSettled: () => {
        setPending(false);
      },
      onError: () => {
        setError("Couldn't save your settings. Tap an option to retry.");
      },
    });
  };

  return (
    <Screen testID="privacy-settings-screen">
      <View style={styles.root}>
        <AudienceOptionGroup<MessageAudience>
          title="Who can message you"
          options={AUDIENCE_OPTIONS}
          selected={privacy.messageAudience}
          pending={pending || update.isPending}
          testID="privacy-message"
          onSelect={(messageAudience) => {
            save({ messageAudience });
          }}
        />
        <AudienceOptionGroup<PostVisibility>
          title="Who can see your posts"
          options={[
            { value: "public", label: "Everyone", description: "Public posts for all" },
            {
              value: "followers",
              label: "Followers",
              description: "Only followers can see your posts",
            },
          ]}
          selected={privacy.postVisibility}
          pending={pending || update.isPending}
          testID="privacy-posts"
          onSelect={(postVisibility) => {
            save({ postVisibility });
          }}
        />
        <AudienceOptionGroup<TagAudience>
          title="Who can tag you"
          options={AUDIENCE_OPTIONS}
          selected={privacy.tagAudience}
          pending={pending || update.isPending}
          testID="privacy-tag"
          onSelect={(tagAudience) => {
            save({ tagAudience });
          }}
        />
        {error ? (
          <Text variant="caption" color="danger" testID="privacy-settings-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 8,
    gap: 8,
  },
  error: {
    paddingHorizontal: 16,
  },
});
