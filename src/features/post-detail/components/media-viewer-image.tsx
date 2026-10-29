/**
 * Zoomable image for the full-screen media viewer.
 *
 * Spec: docs/feel-spec.md §4.10 (PF8.2). Gesture-handler drives pinch, pan and
 * double-tap; Reanimated keeps the transform off the JS thread. Reduce motion
 * snaps instead of animating while still allowing static zoom.
 */

import { Image } from "expo-image";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/shared/ui";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const RESET_THRESHOLD = 0.01;

export type MediaViewerImageProps = {
  uri: string;
  testID?: string;
};

function clampWorklet(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function MediaViewerImage({ uri, testID }: MediaViewerImageProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : motion.fast;

  const scale = useSharedValue(MIN_SCALE);
  const savedScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clampWorklet(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE + RESET_THRESHOLD) {
        scale.value = withTiming(MIN_SCALE, { duration });
        translateX.value = withTiming(0, { duration });
        translateY.value = withTiming(0, { duration });
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      const maxX = (width * (scale.value - 1)) / 2;
      const maxY = (height * (scale.value - 1)) / 2;
      translateX.value = clampWorklet(translateX.value, -maxX, maxX);
      translateY.value = clampWorklet(translateY.value, -maxY, maxY);
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE + RESET_THRESHOLD) return;
      const maxX = (width * (scale.value - 1)) / 2;
      const maxY = (height * (scale.value - 1)) / 2;
      translateX.value = clampWorklet(
        savedTranslateX.value + event.translationX,
        -maxX,
        maxX,
      );
      translateY.value = clampWorklet(
        savedTranslateY.value + event.translationY,
        -maxY,
        maxY,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (!success) return;
      const next = scale.value > MIN_SCALE + RESET_THRESHOLD ? MIN_SCALE : DOUBLE_TAP_SCALE;
      scale.value = withTiming(next, { duration });
      translateX.value = withTiming(0, { duration });
      translateY.value = withTiming(0, { duration });
      savedScale.value = next;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const gesture = Gesture.Simultaneous(doubleTap, pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]} testID={testID}>
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
          accessibilityLabel="Full-screen media"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
