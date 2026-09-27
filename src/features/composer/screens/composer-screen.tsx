import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { logComposerOpen, logComposerPost } from "../analytics";
import { ComposerMediaStrip } from "../components/composer-media-strip";
import { useComposerDraft } from "../hooks/use-composer-draft";
import { useComposerMedia } from "../hooks/use-composer-media";
import { useComposerCreatePost } from "../mutations/use-create-post";
import {
  COMPOSER_MAX_LENGTH,
  COMPOSER_MAX_MEDIA,
  validateComposerBody,
} from "../validation";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useTheme } from "@/shared/ui/theme/use-theme";

/**
 * Keyboard scope mirroring `KeyboardScope` in `app-providers.tsx`: the
 * controller library is native-only, so web renders children straight through.
 */
function ComposerKeyboardAvoidingView({ children }: { children: ReactNode }) {
  if (process.env.EXPO_OS === "web") return <>{children}</>;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.avoid}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/**
 * Composer screen (F1.4 polish).
 *
 * - Text 1–280 chars + 0–4 images (`images` only, `allowsMultiple`, `quality 0.8`).
 * - Pick → preview strip → upload each via `uploadMedia` → `POST /posts` →
 *   prepend feed page 0 → clear draft → dismiss.
 * - Draft persists text + local uris; tmp files may vanish after kill — the
 *   screen warns that photos may need re-picking.
 * - Offline anywhere → outbox `post.create` with `localUris`, badge
 *   "Queued — will send when online" (drained by `startOutboxSync` at boot).
 * - No progress bar: RN `fetch` cannot report it — UI shows "Uploading…".
 * - Keyboard: library `KeyboardAvoidingView` on native (provider at root),
 *   plain children on web. Screen tracking is automatic (`ScreenTracking`
 *   on route change) plus `logComposerOpen` for the feature event.
 */
export function ComposerScreen() {
  const theme = useTheme();
  const { body, setBody, localUris, setLocalUris, loaded, clear } = useComposerDraft();
  const media = useComposerMedia();
  const { submitWithMedia, isPending, isUploading } = useComposerCreatePost();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    logComposerOpen();
  }, []);

  const trimmed = body.trim();
  const overLimit = trimmed.length > COMPOSER_MAX_LENGTH;
  const busy = isPending || isUploading;
  const canPost = loaded && trimmed.length > 0 && !overLimit && !busy;
  const showRepickNote = loaded && localUris.length > 0 && media.items.length === 0;

  async function handleAddPhoto(): Promise<void> {
    setError(null);
    const next = await media.pickMore();
    setLocalUris(next.map((asset) => asset.uri));
  }

  function handleRemovePhoto(index: number): void {
    const next = media.removeAt(index);
    setLocalUris(next.map((asset) => asset.uri));
    if (error) setError(null);
  }

  async function handlePost(): Promise<void> {
    setError(null);
    setQueued(false);
    if (media.items.length > COMPOSER_MAX_MEDIA) {
      setError(`Chỉ đính kèm tối đa ${COMPOSER_MAX_MEDIA} ảnh.`);
      return;
    }
    const textCheck = validateComposerBody(body);
    if (!textCheck.ok) {
      setError(textCheck.error);
      return;
    }
    logComposerPost();
    try {
      const result = await submitWithMedia(textCheck.value.body, media.items);
      if (result.status === "queued") {
        setQueued(true);
        return;
      }
      await clear();
      handleDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đăng được. Thử lại.");
    }
  }

  return (
    <Screen testID="composer-screen">
      <ComposerKeyboardAvoidingView>
        <View style={styles.root}>
          <View style={styles.header}>
            <Button
              title="Dismiss"
              variant="secondary"
              size="sm"
              testID="composer-dismiss-button"
              onPress={handleDismiss}
            />
            <Button
              title={isUploading ? "Uploading…" : isPending ? "Posting…" : "Post"}
              variant="primary"
              size="sm"
              testID="composer-post-button"
              disabled={!canPost}
              loading={busy}
              onPress={() => {
                void handlePost();
              }}
            />
          </View>

          <Text variant="title" accessibilityRole="header">
            New post
          </Text>

          <Input
            value={body}
            onChangeText={(next) => {
              setBody(next);
              if (error) setError(null);
            }}
            placeholder="What's happening?"
            multiline
            maxLength={COMPOSER_MAX_LENGTH}
            editable={!busy}
            autoFocus
            testID="composer-input"
            accessibilityLabel="Post body"
          />

          <ComposerMediaStrip
            uris={media.items.map((asset) => asset.uri)}
            onRemove={handleRemovePhoto}
            editable={!busy}
          />

          <View style={styles.mediaRow}>
            <Button
              title={media.items.length === 0 ? "+ Photo" : `+ Photo (${media.count}/${COMPOSER_MAX_MEDIA})`}
              variant="ghost"
              size="sm"
              testID="composer-media-add"
              disabled={!media.canAddMore || busy}
              onPress={() => {
                void handleAddPhoto();
              }}
            />
            <Text
              variant="caption"
              style={{ color: overLimit ? theme.color.danger : theme.color.textSecondary }}
              testID="composer-counter"
              accessibilityLabel={`${trimmed.length} of ${COMPOSER_MAX_LENGTH} characters`}
            >
              {`${trimmed.length}/${COMPOSER_MAX_LENGTH}`}
            </Text>
          </View>

          {isUploading ? (
            <Text
              variant="caption"
              style={{ color: theme.color.textSecondary }}
              testID="composer-uploading"
            >
              Uploading…
            </Text>
          ) : null}

          {showRepickNote ? (
            <Text
              variant="caption"
              style={{ color: theme.color.textSecondary }}
              testID="composer-repick-note"
            >
              Photos from last time may need re-picking (tmp files don&apos;t survive restart).
            </Text>
          ) : null}

          {error ? (
            <Text
              variant="caption"
              style={{ color: theme.color.danger }}
              testID="composer-error"
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}

          {queued ? (
            <Text
              variant="caption"
              style={{ color: theme.color.textSecondary }}
              testID="composer-queued-badge"
            >
              Queued — will send when online.
            </Text>
          ) : null}

          {!loaded ? (
            <Text variant="caption" style={{ color: theme.color.textSecondary }}>
              Loading draft…
            </Text>
          ) : null}
        </View>
      </ComposerKeyboardAvoidingView>
    </Screen>
  );
}

export function handleDismiss(): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/");
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
  },
  root: {
    gap: 12,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mediaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
