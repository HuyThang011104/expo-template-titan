/**
 * Post body with tappable spans (G1.5).
 *
 * Dumb: renders `parseRichText` segments as nested `Text` (plain text never
 * gets a press handler, so it can't mis-tap; spans flow inline, so lines
 * never break). Mention/hashtag navigation is feature-owned via callbacks
 * (same pattern as `onSafetyPress`). Links ask for confirmation in a sheet
 * before opening the browser.
 */

import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
import * as Linking from "expo-linking";

import { Button, Sheet, Text } from "@/shared/ui";

import { parseRichText } from "../rich-text";

export type PostBodyProps = {
  postId: string;
  body: string;
  onMentionPress?: (handle: string) => void;
  onHashtagPress?: (tag: string) => void;
  testID?: string;
  /** Lines shown before the inline "more" affordance (feed = 8). */
  clampLines?: number;
  /** Injected for tests; defaults to `expo-linking` openURL. */
  openFn?: (url: string) => Promise<unknown>;
};

export function PostBody({
  postId,
  body,
  onMentionPress,
  onHashtagPress,
  testID,
  clampLines = 8,
  openFn,
}: PostBodyProps) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const segments = useMemo(() => parseRichText(body), [body]);

  function handleTextLayout(event: NativeSyntheticEvent<TextLayoutEventData>): void {
    if (expanded || overflowing) return;
    if (event.nativeEvent.lines.length >= clampLines) setOverflowing(true);
  }

  const openLink = async (url: string): Promise<void> => {
    setOpenFailed(false);
    try {
      await (openFn ?? ((target) => Linking.openURL(target)))(url);
      setPendingUrl(null);
    } catch {
      setOpenFailed(true);
    }
  };

  return (
    <View>
      <Text
        variant="body"
        testID={testID ?? `post-body-${postId}`}
        numberOfLines={expanded ? undefined : clampLines}
        onTextLayout={handleTextLayout}
      >
        {segments.map((segment, index) => {
          if (segment.kind === "mention") {
            return (
              <Text
                key={`m-${index}`}
                variant="link"
                testID={`mention-${segment.handle}-${postId}`}
                onPress={
                  onMentionPress
                    ? () => {
                        onMentionPress(segment.handle);
                      }
                    : undefined
                }
              >
                {segment.text}
              </Text>
            );
          }
          if (segment.kind === "hashtag") {
            return (
              <Text
                key={`h-${index}`}
                variant="link"
                testID={`hashtag-${segment.tag}-${postId}`}
                onPress={
                  onHashtagPress
                    ? () => {
                        onHashtagPress(segment.tag);
                      }
                    : undefined
                }
              >
                {segment.text}
              </Text>
            );
          }
          if (segment.kind === "link") {
            return (
              <Text
                key={`l-${index}`}
                variant="link"
                testID={`link-${index}-${postId}`}
                onPress={() => {
                  setOpenFailed(false);
                  setPendingUrl(segment.url);
                }}
              >
                {segment.text}
              </Text>
            );
          }
          return segment.text;
        })}
      </Text>
      {overflowing && !expanded ? (
        <Pressable
          testID={`post-body-more-${postId}`}
          accessibilityRole="button"
          accessibilityLabel="Show more"
          hitSlop={8}
          onPress={() => {
            setExpanded(true);
          }}
          style={styles.moreTouch}
        >
          <Text variant="link">more</Text>
        </Pressable>
      ) : null}
      <Sheet
        visible={pendingUrl !== null}
        onClose={() => {
          setPendingUrl(null);
          setOpenFailed(false);
        }}
        title="Open link?"
        testID={`link-confirm-${postId}`}
      >
        <View style={styles.confirm}>
          <Text variant="body" color="textSecondary" numberOfLines={3}>
            {pendingUrl ?? ""}
          </Text>
          <Text variant="caption" color="textSecondary">
            Links open in your browser, outside the app.
          </Text>
          {openFailed ? (
            <Text variant="caption" color="textSecondary" testID={`link-error-${postId}`}>
              Couldn&apos;t open the link. Try again.
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <Button
              title="Cancel"
              variant="secondary"
              size="sm"
              testID={`link-cancel-${postId}`}
              onPress={() => {
                setPendingUrl(null);
                setOpenFailed(false);
              }}
            />
            <Button
              title="Open"
              variant="primary"
              size="sm"
              testID={`link-open-${postId}`}
              onPress={() => {
                if (pendingUrl) void openLink(pendingUrl);
              }}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  moreTouch: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  confirm: {
    gap: 12,
    paddingBottom: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
