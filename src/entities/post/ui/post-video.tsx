/**
 * Post video block — binds a video `PostMedia` to the shared player.
 *
 * Stays dumb: no routing, no cache writes. The feed passes `isActive`
 * (viewability); detail screens leave it `true` for single-video autoplay.
 *
 * Spec: docs/feel-spec.md §4.1 (F6). Controls are an overlay on the frame
 * (PF2.2): dedicated `PressableScale` buttons with the token icons
 * `play`/`pause`/`volume`/`volumeOff` and a 44pt hit area — no glyph text.
 */

import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Icon, PressableScale, useTheme } from "@/shared/ui";
import { SharedVideoView } from "@/shared/ui/video/video-view";

export type PostVideoProps = {
  postId: string;
  mediaUrl: string;
  isActive?: boolean;
  /** Feed cards render full-bleed with no radius. */
  rounded?: boolean;
  testID?: string;
};

export function PostVideo({
  postId,
  mediaUrl,
  isActive = true,
  rounded = true,
  testID,
}: PostVideoProps) {
  const theme = useTheme();
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [prevActive, setPrevActive] = useState(isActive);

  // Render-phase reset (no effect): re-entering view resumes autoplay.
  if (prevActive !== isActive) {
    setPrevActive(isActive);
    if (isActive) {
      setUserPaused(false);
    }
  }

  const shouldPlay = isActive && !userPaused;

  return (
    <View testID={testID ?? `post-video-${postId}`} style={styles.wrap}>
      <SharedVideoView uri={mediaUrl} shouldPlay={shouldPlay} muted={muted} rounded={rounded} />
      <View style={styles.overlay} pointerEvents="box-none">
        <PressableScale
          testID={`video-toggle-${postId}`}
          accessibilityRole="button"
          accessibilityLabel={shouldPlay ? "Pause video" : "Play video"}
          onPress={() => {
            setUserPaused((prev) => !prev);
          }}
          style={styles.touch}
        >
          <View style={[styles.pill, { backgroundColor: theme.color.primary }]}>
            <Icon name={shouldPlay ? "pause" : "play"} size="md" color="onPrimary" decorative />
          </View>
        </PressableScale>
        <PressableScale
          testID={`video-mute-${postId}`}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute" : "Mute"}
          onPress={() => {
            setMuted((prev) => !prev);
          }}
          style={styles.touch}
        >
          <View style={[styles.pill, { backgroundColor: theme.color.primary }]}>
            <Icon name={muted ? "volumeOff" : "volume"} size="md" color="onPrimary" decorative />
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 4,
  },
  touch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
