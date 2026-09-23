/**
 * Video primitive over `expo-video`. Muted looping preview by default (feed);
 * pass `showControls` for detail/fullscreen playback. Never raw `VideoView` in features.
 */

import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { VideoView, useVideoPlayer, type VideoContentFit } from "expo-video";

export type AppVideoProps = {
  uri: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  contentFit?: VideoContentFit;
  showControls?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onReady?: () => void;
};

export function AppVideo({
  uri,
  autoPlay = false,
  loop = true,
  muted = true,
  contentFit = "cover",
  showControls = false,
  style,
  testID,
  onReady,
}: AppVideoProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
  });

  useEffect(() => {
    if (autoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, autoPlay]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={showControls}
      allowsPictureInPicture={false}
      onFirstFrameRender={onReady}
      testID={testID}
    />
  );
}
