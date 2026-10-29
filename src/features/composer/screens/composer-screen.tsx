import { router, Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { parseRichText } from "@/entities/post";
import { canTagUser, getUserByHandleData, useMe } from "@/entities/user";
import { findBlockedMentionHandles } from "@/shared/lib/mention-gate";
import { takePhoto } from "@/shared/media/picker";
import {
  Avatar,
  Button,
  ComposerInput,
  CounterRing,
  IconButton,
  Screen,
  Text,
  useTheme,
} from "@/shared/ui";

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
 * - Chrome lives in the native header: `close` left, pill `Post` right (F1/F2).
 * - Pinned toolbar: library + camera icon buttons; `CounterRing` reserves a
 *   slot on the right and appears from 260/280 (F1/F2, PD1/PD2).
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
  const qc = useQueryClient();
  const me = useMe();
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
  const postLabel = isUploading ? "Uploading…" : isPending ? "Posting…" : "Post";

  async function handleAddPhoto(): Promise<void> {
    setError(null);
    const next = await media.pickMore();
    setLocalUris(next.map((asset) => asset.uri));
  }

  async function handleTakePhoto(): Promise<void> {
    setError(null);
    const next = media.addAsset(await takePhoto());
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
      setError(`Attach at most ${COMPOSER_MAX_MEDIA} photos.`);
      return;
    }
    const textCheck = validateComposerBody(body);
    if (!textCheck.ok) {
      setError(textCheck.error);
      return;
    }
    // G2.3: respect mentioned users' tagAudience before sending.
    const viewerId = me.data?.id ?? "";
    const handles = parseRichText(textCheck.value.body)
      .filter((segment) => segment.kind === "mention")
      .map((segment) => (segment.kind === "mention" ? segment.handle : ""));
    const blocked = findBlockedMentionHandles(
      handles,
      (handle) => getUserByHandleData(qc, handle)?.id,
      (targetId) => canTagUser(qc, targetId, viewerId),
    );
    if (blocked.length > 0) {
      setError(`@${blocked[0]} doesn't allow tags.`);
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
      setError(err instanceof Error ? err.message : "Couldn't post. Try again.");
    }
  }

  return (
    <Screen testID="composer-screen">
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton
              icon="close"
              size="sm"
              accessibilityLabel="Dismiss"
              testID="composer-dismiss-button"
              onPress={handleDismiss}
            />
          ),
          headerRight: () => (
            <Button
              title={postLabel}
              variant="primary"
              size="sm"
              testID="composer-post-button"
              disabled={!canPost}
              loading={busy}
              style={{ borderRadius: theme.radius.full }}
              onPress={() => {
                void handlePost();
              }}
            />
          ),
        }}
      />
      <ComposerKeyboardAvoidingView>
        <View style={styles.root}>
          <View style={styles.content}>
            <View style={styles.bodyRow}>
              <Avatar
                displayName={me.data?.displayName ?? "You"}
                avatarUrl={me.data?.avatarUrl ?? null}
                size={40}
                testID="composer-avatar"
              />
              <ComposerInput
                value={body}
                onChangeText={(next) => {
                  setBody(next);
                  if (error) setError(null);
                }}
                placeholder="What's happening?"
                maxLength={COMPOSER_MAX_LENGTH}
                editable={!busy}
                autoFocus
                testID="composer-input"
                accessibilityLabel="Post body"
                style={styles.input}
              />
            </View>

            <ComposerMediaStrip
              uris={media.items.map((asset) => asset.uri)}
              onRemove={handleRemovePhoto}
              editable={!busy}
            />

            {isUploading ? (
              <Text variant="caption" color="textSecondary" testID="composer-uploading">
                Uploading…
              </Text>
            ) : null}

            {showRepickNote ? (
              <Text variant="caption" color="textSecondary" testID="composer-repick-note">
                Photos from last time may need re-picking (tmp files don&apos;t survive restart).
              </Text>
            ) : null}

            {error ? (
              <Text
                variant="caption"
                color="danger"
                testID="composer-error"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            {queued ? (
              <Text variant="caption" color="textSecondary" testID="composer-queued-badge">
                Queued — will send when online.
              </Text>
            ) : null}

            {!loaded ? (
              <Text variant="caption" color="textSecondary">
                Loading draft…
              </Text>
            ) : null}
          </View>

          <View
            testID="composer-toolbar"
            style={[
              styles.toolbar,
              {
                backgroundColor: theme.color.surface,
                borderTopColor: theme.color.border,
              },
            ]}
          >
            <IconButton
              icon="image"
              accessibilityLabel="Add photo"
              testID="composer-media-add"
              disabled={!media.canAddMore || busy}
              onPress={() => {
                void handleAddPhoto();
              }}
            />
            <IconButton
              icon="camera"
              accessibilityLabel="Take photo"
              testID="composer-camera"
              disabled={!media.canAddMore || busy}
              onPress={() => {
                void handleTakePhoto();
              }}
            />
            <View style={styles.toolbarSpacer} />
            <View style={styles.counterSlot}>
              <CounterRing
                value={trimmed.length}
                max={COMPOSER_MAX_LENGTH}
                warnFrom={260 / 280}
                testID="composer-counter"
                accessibilityLabel={`${COMPOSER_MAX_LENGTH - trimmed.length} characters remaining`}
              />
            </View>
          </View>
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
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  input: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarSpacer: {
    flex: 1,
  },
  counterSlot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
