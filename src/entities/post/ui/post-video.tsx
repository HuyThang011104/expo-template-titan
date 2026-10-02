/**
 * Post video block — binds a video `PostMedia` to the shared player.
 *
 * Stays dumb: no routing, no cache writes. The feed passes `isActive`
 * (viewability); detail screens leave it `true` for single-video autoplay.
 * Controls are dedicated `Pressable`s so taps never rely on bubbling
 * through a `Link`-wrapped card.
 */

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SharedVideoView } from "@/shared/ui/video/video-view";
import { Text } from "@/shared/ui/text";

export type PostVideoProps = {
  postId: string;
  mediaUrl: string;
  isActive?: boolean;
  testID?: string;
};

export function PostVideo({ postId, mediaUrl, isActive = true, testID }: PostVideoProps) {
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
    <View testID={testID ?? `post-video-${postId}`}>
      <SharedVideoView uri={mediaUrl} shouldPlay={shouldPlay} muted={muted} />
      <View style={styles.controls}>
        <Pressable
          testID={`video-toggle-${postId}`}
          accessibilityRole="button"
          accessibilityLabel={shouldPlay ? "Pause video" : "Play video"}
          hitSlop={8}
          onPress={() => {
            setUserPaused((prev) => !prev);
          }}
          style={styles.toggle}
        >
          <Text variant="small" color="textSecondary" style={styles.toggleLabel}>
            {shouldPlay ? "❚❚" : "▶"}
          </Text>
        </Pressable>
        <Pressable
          testID={`video-mute-${postId}`}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute" : "Mute"}
          hitSlop={8}
          onPress={() => {
            setMuted((prev) => !prev);
          }}
          style={styles.toggle}
        >
          <Text variant="small" color="textSecondary" style={styles.toggleLabel}>
            {muted ? "🔇" : "🔊"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  toggle: {
    padding: 8,
  },
  toggleLabel: {
    fontWeight: "700",
  },
});
