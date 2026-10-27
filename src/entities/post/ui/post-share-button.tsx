/**
 * Post share button (G1.4).
 *
 * Opens the system share sheet with a deep link (`<scheme>://post/<id>`)
 * that resolves to the detail screen when logged in (`Stack.Protected`
 * sends logged-out users to sign-in). RN `Share` needs no extra native
 * dependency; the sheet's own Copy action covers copying. Failures show
 * inline with retry — never a crash, never a throw.
 */

import { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";

import { buildPostDeepLink } from "@/shared/navigation";
import { Icon, Text } from "@/shared/ui";

export type ShareFn = (content: { message: string }) => Promise<unknown>;

export type PostShareButtonProps = {
  postId: string;
  testID?: string;
  /** Injected for tests; resolved from `expo-linking` by default. */
  schemeOverride?: string;
  /** Injected for tests; defaults to RN `Share.share`. */
  shareFn?: ShareFn;
};

function resolveScheme(): string {
  try {
    const base = Linking.createURL("");
    const scheme = base.split("://")[0];
    if (scheme) return scheme;
  } catch {
    // Fall through to the dev default below.
  }
  return "titan-dev";
}

export function PostShareButton({ postId, testID, schemeOverride, shareFn }: PostShareButtonProps) {
  const [failed, setFailed] = useState(false);
  const id = testID ?? `share-button-${postId}`;

  const share = async (): Promise<void> => {
    setFailed(false);
    const url = buildPostDeepLink(postId, schemeOverride ?? resolveScheme());
    try {
      await (shareFn ?? ((content) => Share.share(content)))({ message: url });
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable
        testID={id}
        accessibilityRole="button"
        accessibilityLabel="Share post"
        hitSlop={8}
        onPress={() => {
          void share();
        }}
        style={styles.touch}
      >
        <View style={styles.row}>
          <Icon name="share" size="sm" color="textSecondary" />
          <Text variant="label" color="textSecondary">
            Share
          </Text>
        </View>
      </Pressable>
      {failed ? (
        <Text variant="caption" color="textSecondary" testID={`share-error-${postId}`}>
          Couldn&apos;t share. Tap to retry.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-start",
  },
  touch: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
