/**
 * Action sheet adapter.
 *
 * Route-level forms continue to use Expo Router's native `formSheet`.
 * This component is for contextual actions and uses Expo UI's native-backed
 * community bottom sheet so Android/iOS share drag-to-dismiss and back behavior
 * without combining RN Modal `transparent` with `formSheet`.
 */

import BottomSheetComponent, { BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { StyleSheet, View } from "react-native";

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
  const handleDismiss = (): void => {
    // Action rows may close the sheet before the native dismissal callback
    // arrives. Only the native gesture/back path should call the owner then.
    if (visible) onClose();
  };

  return (
    <BottomSheetComponent
      index={visible ? 0 : -1}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: theme.color.background }}
    >
      {visible ? (
        <BottomSheetView style={{ padding: theme.space.md }}>
          <View testID={testID} style={styles.content}>
            {title ? (
              <View style={styles.titleRow}>
                <Text variant="subtitle">{title}</Text>
              </View>
            ) : null}
            {children}
          </View>
        </BottomSheetView>
      ) : null}
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
  },
  titleRow: {
    marginBottom: 12,
  },
});
