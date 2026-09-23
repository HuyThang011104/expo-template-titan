/**
 * Image primitive over `expo-image`. Feed/post/chat flows use this, never raw `expo-image`.
 * Blurhash placeholder while loading; `fallbackUri` swaps in on error, once.
 */

import { useState } from "react";
import { Image, type ImageContentFit } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

export type AppImageProps = {
  uri: string;
  /** Shown when `uri` fails. Skipped when empty. */
  fallbackUri?: string;
  contentFit?: ImageContentFit;
  /** Blurhash string rendered while loading. */
  placeholder?: string;
  style?: StyleProp<ImageStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

export function AppImage({
  uri,
  fallbackUri,
  contentFit = "cover",
  placeholder,
  style,
  testID,
  accessibilityLabel,
}: AppImageProps) {
  const [failed, setFailed] = useState(false);
  const source = failed && fallbackUri ? fallbackUri : uri;

  return (
    <Image
      source={source}
      contentFit={contentFit}
      placeholder={placeholder}
      cachePolicy="memory-disk"
      transition={200}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(true)}
    />
  );
}
