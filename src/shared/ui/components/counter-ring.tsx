/**
 * Composer character ring without SVG.
 *
 * Spec: docs/feel-spec.md §5.3. Two clipped half arcs rotate to reveal the
 * progress; the remaining character count sits in the middle. Hidden below
 * `max * warnFrom` so the composer can reserve space for it.
 */

import { StyleSheet, View } from "react-native";

import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

const SIZE = 28;
const STROKE = 2;
const HALF = SIZE / 2;

export type CounterRingProps = {
  value: number;
  max: number;
  /** Fraction of `max` at which the ring becomes visible. */
  warnFrom?: number;
  accessibilityLabel?: string;
  testID?: string;
};

export function CounterRing({
  value,
  max,
  warnFrom = 0.9,
  accessibilityLabel,
  testID,
}: CounterRingProps) {
  const theme = useTheme();

  if (value < max * warnFrom) return null;

  const progress = Math.max(0, Math.min(value / max, 1));
  const remaining = max - value;
  const color =
    value > max ? theme.color.danger : value === max ? theme.color.warning : theme.color.primary;

  const rightAngle = 180 - Math.min(progress, 0.5) * 360;
  const leftAngle = 180 - Math.max(Math.min(progress - 0.5, 0.5), 0) * 360;

  const ringBase = {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF,
    borderWidth: STROKE,
    borderColor: "transparent",
  };

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${remaining} characters remaining`}
      accessibilityValue={{ min: 0, max, now: value }}
      style={styles.container}
    >
      <View
        style={[
          styles.track,
          {
            borderColor: theme.color.border,
            borderRadius: HALF,
            borderWidth: STROKE,
          },
        ]}
      />

      <View style={[styles.clip, { left: HALF, width: HALF, height: SIZE }]}>
        <View
          testID={testID ? `${testID}-right` : undefined}
          style={[
            ringBase,
            styles.rightArc,
            {
              left: -HALF,
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${rightAngle}deg` }],
            },
          ]}
        />
      </View>

      <View style={[styles.clip, { left: 0, width: HALF, height: SIZE }]}>
        <View
          testID={testID ? `${testID}-left` : undefined}
          style={[
            ringBase,
            {
              borderTopColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${leftAngle}deg` }],
            },
          ]}
        />
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text variant="caption" color="textPrimary" style={styles.count}>
          {remaining}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  clip: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  rightArc: {
    position: "absolute",
    top: 0,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});
