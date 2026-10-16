/**
 * Typing indicator (G3.2). Reads the canonical presence for `userId` and
 * renders `Đang nhập...` while the TTL is fresh, else null.
 */

import { StyleSheet } from "react-native";

import { useTypingIn } from "@/entities/conversation";
import { Text } from "@/shared/ui";

export type TypingIndicatorProps = {
  conversationId: string;
  userId: string;
};

export function TypingIndicator({ conversationId, userId }: TypingIndicatorProps) {
  const isTyping = useTypingIn(conversationId, userId);
  if (!isTyping) return null;
  return (
    <Text
      variant="caption"
      color="textSecondary"
      testID={`typing-indicator-${conversationId}`}
      style={styles.typing}
    >
      Đang nhập...
    </Text>
  );
}

const styles = StyleSheet.create({
  typing: {
    fontStyle: "italic",
  },
});
