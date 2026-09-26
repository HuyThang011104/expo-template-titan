import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useComposerCreatePost } from "../mutations/use-create-post";
import { logComposerOpen, logComposerPost } from "../analytics";
import { useComposerDraft } from "../hooks/use-composer-draft";
import { COMPOSER_MAX_LENGTH, validateComposerBody } from "../validation";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useTheme } from "@/shared/ui/theme/use-theme";

/**
 * Composer screen (F1.1 text-only).
 *
 * - Thin screen: text + counter + Post/Dismiss, no feed imports, no direct cache writes.
 * - Draft persists under `composer:draft` (debounced 500ms); success clears it.
 * - Entity prepends the new post to feed page 0 — no full refetch.
 * - Offline (`NETWORK/TIMEOUT`) → outbox `post.create`, badge "Queued — will
 *   send when online" (drain wiring lands in F1.3).
 */
export function ComposerScreen() {
  const theme = useTheme();
  const { body, setBody, loaded } = useComposerDraft();
  const { submit, isPending } = useComposerCreatePost();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    logComposerOpen();
  }, []);

  const trimmed = body.trim();
  const overLimit = trimmed.length > COMPOSER_MAX_LENGTH;
  const canPost = loaded && trimmed.length > 0 && !overLimit && !isPending;

  async function handlePost(): Promise<void> {
    setError(null);
    setQueued(false);
    const validation = validateComposerBody(body);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    logComposerPost();
    try {
      const result = await submit(validation.value);
      if (result.status === "queued") {
        setQueued(true);
        return;
      }
      handleDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đăng được. Thử lại.");
    }
  }

  return (
    <Screen style={styles.root} testID="composer-screen">
      <View style={styles.header}>
        <Button
          title="Dismiss"
          variant="secondary"
          size="sm"
          testID="composer-dismiss-button"
          onPress={handleDismiss}
        />
        <Button
          title={isPending ? "Posting…" : "Post"}
          variant="primary"
          size="sm"
          testID="composer-post-button"
          disabled={!canPost}
          loading={isPending}
          onPress={() => {
            void handlePost();
          }}
        />
      </View>

      <Text variant="title">New post</Text>

      <Input
        value={body}
        onChangeText={(next) => {
          setBody(next);
          if (error) setError(null);
        }}
        placeholder="What's happening?"
        multiline
        maxLength={COMPOSER_MAX_LENGTH}
        editable={!isPending}
        testID="composer-input"
      />

      <View style={styles.footer}>
        <Text
          variant="caption"
          style={{ color: overLimit ? theme.color.danger : theme.color.textSecondary }}
          testID="composer-counter"
        >
          {`${trimmed.length}/${COMPOSER_MAX_LENGTH}`}
        </Text>
      </View>

      {error ? (
        <Text variant="caption" style={{ color: theme.color.danger }} testID="composer-error">
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
  root: {
    gap: 12,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
