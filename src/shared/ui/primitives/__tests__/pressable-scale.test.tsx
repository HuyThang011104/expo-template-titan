import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { PressableScale } from "../pressable-scale";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    useSharedValue: jest.fn((value: number) => ({ value })),
    useAnimatedStyle: jest.fn((factory: () => unknown) => factory()),
    useReducedMotion: jest.fn(() => false),
    withSpring: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
    Easing: { bezier: jest.fn(() => 0) },
  };
});

const useReducedMotionMock = useReducedMotion as jest.Mock;

afterEach(() => {
  useReducedMotionMock.mockReturnValue(false);
});

describe("PressableScale", () => {
  it("scales and fades while motion is allowed", async () => {
    await render(<PressableScale testID="press" scaleTo={0.9} pressedOpacity={0.7} />);

    const style = StyleSheet.flatten(screen.getByTestId("press").props.style);
    expect(style.transform).toEqual([{ scale: 1 }]);
    expect(style.opacity).toBe(1);
  });

  it("keeps opacity only when reduce motion is on", async () => {
    useReducedMotionMock.mockReturnValue(true);

    await render(<PressableScale testID="press" />);

    const style = StyleSheet.flatten(screen.getByTestId("press").props.style);
    expect(style.transform).toBeUndefined();
    expect(style.opacity).toBe(1);
  });

  it("fires onPress", async () => {
    const onPress = jest.fn();
    await render(<PressableScale testID="press" onPress={onPress} />);

    fireEvent.press(screen.getByTestId("press"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("blocks onPress while disabled", async () => {
    const onPress = jest.fn();
    await render(<PressableScale testID="press" onPress={onPress} disabled />);

    fireEvent.press(screen.getByTestId("press"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
