/**
 * Edit profile screen (G2.1, `formSheet`).
 *
 * - Prefills from `useMe` (GET /users/me).
 * - Edits displayName/bio/avatar/cover/link → PATCH → canonical overwrite,
 *   so header + search + comment + inbox update together.
 * - Avatar/cover pickers validate format/size inline and keep the old image
 *   on failure; URL pasting must be a valid URL.
 * - Only reachable from own profile (screens gate the entry button);
 *   unknown profile shows a fallback, never a crash.
 */

import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useMe, useUpdateProfile } from "@/entities/user";
import { pickFromLibrary } from "@/shared/media/picker";
import { Button, Input, Screen, Text } from "@/shared/ui";

import {
  validateProfileForm,
  validateProfileImage,
  type ProfileFormErrors,
} from "../validation";

export function handleEditProfileDismiss(): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/");
}

export function EditProfileScreen() {
  const me = useMe();

  if (me.isPending) {
    return (
      <Screen style={styles.center} testID="edit-profile-screen">
        <Text variant="body">Loading profile…</Text>
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen style={styles.center} testID="edit-profile-screen">
        <Text variant="title">Profile</Text>
        <Text variant="body">Couldn&apos;t load your profile.</Text>
        <Button
          title="Retry"
          testID="edit-profile-retry-button"
          onPress={() => {
            void me.refetch();
          }}
        />
        <Button
          title="Dismiss"
          variant="secondary"
          testID="edit-profile-dismiss-button"
          onPress={handleEditProfileDismiss}
        />
      </Screen>
    );
  }

  return <EditProfileBody initial={me.data} />;
}

function EditProfileBody({
  initial,
}: {
  initial: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    link: string | null;
  };
}) {
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverUrl);
  const [link, setLink] = useState(initial.link ?? "");
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picking, setPicking] = useState<"avatar" | "cover" | null>(null);

  // `EditProfileBody` mounts only after `useMe` succeeds, so `initial`
  // is stable for this edit session (mirrors `EditPostBody`).
  const values = { displayName, bio, avatarUrl, coverUrl, link };
  const trimmedName = displayName.trim();
  const canSave =
    trimmedName.length > 0 &&
    trimmedName.length <= 50 &&
    bio.trim().length <= 160 &&
    !update.isPending &&
    picking === null;

  async function pickImage(kind: "avatar" | "cover"): Promise<void> {
    setPicking(kind);
    setSubmitError(null);
    try {
      const picked = await pickFromLibrary("images", { allowsMultiple: false, quality: 0.8 });
      const first = picked[0];
      if (!first) return;
      const invalid = validateProfileImage(first);
      if (invalid) {
        // Keep the old image; surface inline, never blank the field.
        setErrors((prev) => ({
          ...prev,
          [kind === "avatar" ? "avatarUrl" : "coverUrl"]: invalid,
        }));
        return;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[kind === "avatar" ? "avatarUrl" : "coverUrl"];
        return next;
      });
      if (kind === "avatar") setAvatarUrl(first.uri);
      else setCoverUrl(first.uri);
    } finally {
      setPicking(null);
    }
  }

  const save = (): void => {
    setSubmitError(null);
    const fieldErrors = validateProfileForm(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    update.mutate(values, {
      onSuccess: () => {
        handleEditProfileDismiss();
      },
      onError: () => {
        setSubmitError("Couldn't save your profile. Tap Save to retry.");
      },
    });
  };

  return (
    <Screen testID="edit-profile-screen">
      <View style={styles.root}>
        <Input
          label="Tên"
          value={displayName}
          onChangeText={(next) => {
            setDisplayName(next);
            if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }));
            if (update.isError) update.reset();
          }}
          placeholder="Tên hiển thị"
          maxLength={50}
          editable={!update.isPending}
          testID="edit-profile-name-input"
          error={errors.displayName}
        />
        <Input
          label="Bio"
          value={bio}
          onChangeText={(next) => {
            setBio(next);
            if (errors.bio) setErrors((p) => ({ ...p, bio: undefined }));
            if (update.isError) update.reset();
          }}
          placeholder="Giới thiệu ngắn (tối đa 160 ký tự)"
          multiline
          maxLength={160}
          editable={!update.isPending}
          testID="edit-profile-bio-input"
          error={errors.bio}
        />
        <Input
          label="Link"
          value={link}
          onChangeText={(next) => {
            setLink(next);
            if (errors.link) setErrors((p) => ({ ...p, link: undefined }));
            if (update.isError) update.reset();
          }}
          placeholder="https://…"
          autoCapitalize="none"
          editable={!update.isPending}
          testID="edit-profile-link-input"
          error={errors.link}
        />
        <View style={styles.imageRow}>
          <View style={styles.imageFlex}>
            <Input
              label="Avatar URL"
              value={avatarUrl ?? ""}
              onChangeText={(next) => {
                setAvatarUrl(next.trim().length > 0 ? next : null);
                if (errors.avatarUrl) setErrors((p) => ({ ...p, avatarUrl: undefined }));
              }}
              placeholder="https://…"
              autoCapitalize="none"
              editable={!update.isPending}
              testID="edit-profile-avatar-input"
              error={errors.avatarUrl}
            />
          </View>
          <Button
            title={picking === "avatar" ? "…" : "Chọn"}
            variant="secondary"
            size="sm"
            testID="edit-profile-avatar-pick-button"
            disabled={update.isPending || picking !== null}
            onPress={() => {
              void pickImage("avatar");
            }}
          />
        </View>
        <View style={styles.imageRow}>
          <View style={styles.imageFlex}>
            <Input
              label="Cover URL"
              value={coverUrl ?? ""}
              onChangeText={(next) => {
                setCoverUrl(next.trim().length > 0 ? next : null);
                if (errors.coverUrl) setErrors((p) => ({ ...p, coverUrl: undefined }));
              }}
              placeholder="https://…"
              autoCapitalize="none"
              editable={!update.isPending}
              testID="edit-profile-cover-input"
              error={errors.coverUrl}
            />
          </View>
          <Button
            title={picking === "cover" ? "…" : "Chọn"}
            variant="secondary"
            size="sm"
            testID="edit-profile-cover-pick-button"
            disabled={update.isPending || picking !== null}
            onPress={() => {
              void pickImage("cover");
            }}
          />
        </View>
        {submitError ? (
          <Text variant="caption" testID="edit-profile-error">
            {submitError}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          <Button
            title="Cancel"
            variant="secondary"
            size="sm"
            testID="edit-profile-cancel-button"
            disabled={update.isPending}
            onPress={handleEditProfileDismiss}
          />
          <Button
            title={update.isPending ? "Saving…" : "Save"}
            variant="primary"
            size="sm"
            testID="edit-profile-save-button"
            disabled={!canSave}
            loading={update.isPending}
            onPress={save}
          />
        </View>
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
    gap: 12,
    padding: 16,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  imageFlex: {
    flex: 1,
    gap: 4,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
