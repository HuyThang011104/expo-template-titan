/**
 * Report reason radio list (F6).
 *
 * Single-select; the screen owns the selected value.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Text, useTheme } from "@/shared/ui";

import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "../model";

export type ReportReasonListProps = {
  selected: ReportReason | null;
  onSelect: (reason: ReportReason) => void;
};

export function ReportReasonList({ selected, onSelect }: ReportReasonListProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      {REPORT_REASONS.map((reason) => {
        const active = selected === reason;
        return (
          <Pressable
            key={reason}
            testID={`report-reason-${reason}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={REPORT_REASON_LABELS[reason]}
            onPress={() => {
              onSelect(reason);
            }}
            style={[
              styles.row,
              {
                borderColor: active ? theme.color.primary : theme.color.backgroundSelected,
                backgroundColor: active
                  ? theme.color.backgroundElement
                  : theme.color.background,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <View
              style={[
                styles.radio,
                {
                  borderColor: active ? theme.color.primary : theme.color.textSecondary,
                },
              ]}
            >
              {active ? (
                <View style={[styles.radioDot, { backgroundColor: theme.color.primary }]} />
              ) : null}
            </View>
            <Text variant="body">{REPORT_REASON_LABELS[reason]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
