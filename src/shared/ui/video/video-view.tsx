/**
 * Dumb video player primitive.
 *
 * Wraps `expo-video` (SDK 57 docs: `useVideoPlayer` + `VideoView` + `useEvent`
 * from `expo`). Knows nothing about Post — F2/F3/detail reuse this.
 * One `useVideoPlayer` per mount; never share instances across `VideoView`s.
 */

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";

import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type SharedVideoViewProps = {
  uri: string;
  shouldPlay: boolean;
  muted?: boolean;
  posterUrl?: string | null;
  /** Feed cards render full-bleed with no radius. */
  rounded?: boolean;
  testID?: string;
};

export function SharedVideoView({
  uri,
  shouldPlay,
  muted = true,
  posterUrl,
  rounded = true,
  testID,
}: SharedVideoViewProps) {
  const theme = useTheme();
  const [firstFrame, setFirstFrame] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    // `player` is a native mutable handle (docs-sanctioned: `player.play()`,
    // `player.muted = …`). It is not React state.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldPlay]);

  const { status } = useEvent(player, "statusChange", { status: player.status });

  if (status === "error") {
    return (
      <View
        testID={testID}
        style={[
          styles.frame,
          {
            backgroundColor: theme.color.backgroundElement,
            borderRadius: rounded ? theme.radius.md : 0,
          },
        ]}
        accessibilityLabel="Video unavailable"
      >
        <Text variant="small" color="textSecondary">
          Video unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.frame,
        {
          backgroundColor: theme.color.backgroundElement,
          borderRadius: rounded ? theme.radius.md : 0,
        },
      ]}
    >
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        surfaceType="textureView"
        onFirstFrameRender={() => {
          setFirstFrame(true);
        }}
      />
      {!firstFrame ? (
        <View style={styles.overlay} pointerEvents="none">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.video}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <View style={styles.spinner}>
            <ActivityIndicator color={theme.color.primary} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    position: "absolute",
  },
});
