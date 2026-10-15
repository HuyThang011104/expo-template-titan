/**
 * Chat composer (F4). Controlled input + send button.
 * Draft persistence lives in `useChatDraft`; this only renders.
 */

import { StyleSheet, View } from "react-native";

import { Button, Input } from "@/shared/ui";

export type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  isSending: boolean;
  /** G2.3: locks the composer when the peer's messageAudience blocks us. */
  sendDisabled?: boolean;
};

export function ChatComposer({ value, onChange, onSend, isSending, sendDisabled = false }: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !isSending && !sendDisabled;
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Input
          testID="chat-input"
          value={value}
          onChangeText={onChange}
          placeholder="Write a message..."
          multiline
          editable={!isSending}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
        />
      </View>
      <Button
        title={isSending ? "Sending..." : "Send"}
        testID="chat-send-button"
        disabled={!canSend}
        onPress={onSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flex: {
    flex: 1,
  },
});
