/**
 * Full-screen media viewer (F16, PD6/PD10).
 *
 * Route: `(modals)/media-viewer` with `{ postId, index }`. Reads the canonical
 * post cache first and falls back to `usePost` only when it is missing — no
 * extra fetch per row. Images zoom/pan via `MediaViewerImage`; videos use
 * `expo-video` native controls. The modal route sets `gestureEnabled: false`
 * so pinch/pan never fight the native dismiss gesture.
 */

import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSharedValue } from "react-native-reanimated";

import { getPostData, usePost } from "@/entities/post";
import { colors, IconButton, Screen, Text } from "@/shared/ui";

import { MediaViewerImage } from "../components/media-viewer-image";

function handleDismiss(): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/");
}

export function MediaViewerScreen() {
  const { postId, index } = useLocalSearchParams<{ postId?: string; index?: string }>();
  const qc = useQueryClient();
  const cached = postId ? getPostData(qc, postId) : undefined;
  const postQuery = usePost(postId ?? "");
  const post = cached ?? postQuery.data;
  const dismissProgress = useSharedValue(0);

  const mediaIndex = Number(index ?? 0);
  const media =
    Number.isInteger(mediaIndex) && mediaIndex >= 0 ? post?.media[mediaIndex] : undefined;

  return (
    <Screen header={false} style={styles.root} testID="media-viewer-screen">
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.content}>
        {!postId || !post ? (
          postQuery.isPending && postId ? (
            <ActivityIndicator color={colors.dark.textPrimary} />
          ) : (
            <Text variant="body" style={styles.message}>
              {postId ? "This media is unavailable." : "Missing media."}
            </Text>
          )
        ) : !media ? (
          <Text variant="body" style={styles.message}>
            This media is unavailable.
          </Text>
        ) : media.kind === "video" ? (
          <MediaViewerVideo uri={media.url} />
        ) : (
          <MediaViewerImage
            key={`${postId}-${mediaIndex}`}
            uri={media.url}
            onDismiss={handleDismiss}
            onDismissProgress={dismissProgress}
            testID={`media-viewer-image-${postId}-${mediaIndex}`}
          />
        )}
      </View>
      <View style={styles.close} pointerEvents="box-none">
        <IconButton
          icon="close"
          variant="secondary"
          accessibilityLabel="Close media viewer"
          testID="media-viewer-close"
          onPress={handleDismiss}
        />
      </View>
    </Screen>
  );
}

function MediaViewerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    player.play();
    return () => {
      player.pause();
    };
  }, [player]);

  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: colors.dark.textPrimary,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  close: {
    position: "absolute",
    top: 8,
    right: 16,
  },
});
