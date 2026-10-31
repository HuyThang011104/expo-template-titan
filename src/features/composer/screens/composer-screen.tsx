import { router, Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { logComposerOpen, logComposerPost } from "../analytics";
import { ComposerDetailsStep } from "../components/composer-details-step";
import { ComposerMediaStep } from "../components/composer-media-step";
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
import { Button, IconButton, LoadingState, Screen, useTheme } from "@/shared/ui";

export type ComposerStep = "media" | "details";

type ComposerDraftState = ReturnType<typeof useComposerDraft>;

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
 * Composer screen (F1.4 polish, staged flow).
 *
 * - Two steps in one route: `media` (pick images first) then `details`
 *   (caption + preview). A draft with content resumes on `details`.
 * - Chrome lives in the native header: `Dismiss` on media, `Next`; `Back`
 *   and `Post` on details (F1/F2, PF3.1).
 * - Media step: library + camera, up to 4 photos, preview strip, plus a
 *   text-only shortcut so text posts stay one tap away.
 * - Details: text 1–280 chars, media preview/remove, counter ring.
 * - Pick → upload each via `uploadMedia` → `POST /posts` → prepend feed page 0
 *   → clear draft → dismiss.
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
  const draft = useComposerDraft();

  useEffect(() => {
    logComposerOpen();
  }, []);

  if (!draft.loaded) {
    return (
      <Screen testID="composer-screen">
        <LoadingState label="Loading draft" testID="composer-draft-loading" />
      </Screen>
    );
  }

  return <ComposerSteps draft={draft} />;
}

/**
 * Mounted only after the draft has loaded, so the first step can be derived
 * from stored content without a state-sync effect (draft content → Details).
 */
function ComposerSteps({ draft }: { draft: ComposerDraftState }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const me = useMe();
  const { body, setBody, localUris, setLocalUris, clear } = draft;
  const media = useComposerMedia();
  const { submitWithMedia, isPending, isUploading } = useComposerCreatePost();
  const [step, setStep] = useState<ComposerStep>(() =>
    draft.body.trim().length > 0 || draft.localUris.length > 0 ? "details" : "media",
  );
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  // Android hardware back steps Details → Media; a second back dismisses.
  useEffect(() => {
    if (step !== "details" || Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep("media");
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const trimmed = body.trim();
  const overLimit = trimmed.length > COMPOSER_MAX_LENGTH;
  const busy = isPending || isUploading;
  const canPost = trimmed.length > 0 && !overLimit && !busy;
  const hasMedia = media.items.length > 0;
  const showRepickNote = localUris.length > 0 && media.items.length === 0;
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

  const isMediaStep = step === "media";
  const headerOptions = isMediaStep
    ? {
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
            title="Next"
            variant="primary"
            size="sm"
            testID="composer-next-button"
            disabled={!hasMedia}
            style={{ borderRadius: theme.radius.full }}
            onPress={() => {
              setStep("details");
            }}
          />
        ),
      }
    : {
        headerLeft: () => (
          <IconButton
            icon="back"
            size="sm"
            accessibilityLabel="Back to media"
            testID="composer-back-button"
            onPress={() => {
              setStep("media");
            }}
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
      };

  const mediaUris = media.items.map((asset) => asset.uri);

  return (
    <Screen testID="composer-screen">
      <Stack.Screen options={headerOptions} />
      <ComposerKeyboardAvoidingView>
        {isMediaStep ? (
          <ComposerMediaStep
            uris={mediaUris}
            maxMedia={COMPOSER_MAX_MEDIA}
            canAddMore={media.canAddMore}
            onAdd={() => {
              void handleAddPhoto();
            }}
            onTakePhoto={() => {
              void handleTakePhoto();
            }}
            onRemove={handleRemovePhoto}
            onTextOnly={() => {
              setStep("details");
            }}
          />
        ) : (
          <ComposerDetailsStep
            displayName={me.data?.displayName ?? "You"}
            avatarUrl={me.data?.avatarUrl ?? null}
            body={body}
            onChangeBody={(next) => {
              setBody(next);
              if (error) setError(null);
            }}
            uris={mediaUris}
            onRemoveMedia={handleRemovePhoto}
            hasMedia={hasMedia}
            onChangeMedia={() => {
              setStep("media");
            }}
            maxLength={COMPOSER_MAX_LENGTH}
            trimmedLength={trimmed.length}
            busy={busy}
            isUploading={isUploading}
            showRepickNote={showRepickNote}
            error={error}
            queued={queued}
          />
        )}
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
});
