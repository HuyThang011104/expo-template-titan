/**
 * Bottom sheet over RN `Modal` — zero extra deps.
 * `formSheet` on iOS; transparent slide-up elsewhere.
 * For gesture-driven sheets (drag to dismiss), graduate to `@gorhom/bottom-sheet`.
 */

import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "./text";
import { useTheme } from "./theme/use-theme";
import type { ReactNode } from "react";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
};

export function Sheet({ visible, onClose, title, children, testID }: SheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.color.background,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.space.md,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {title ? (
            <View style={styles.titleRow}>
              <Text variant="subtitle">{title}</Text>
            </View>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    maxHeight: "90%",
  },
  titleRow: {
    marginBottom: 12,
  },
});
