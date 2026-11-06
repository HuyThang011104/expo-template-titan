import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "../../theme/theme-provider";
import { ComposerInput } from "../composer-input";

function renderInput(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

function contentSize(height: number) {
  return { nativeEvent: { contentSize: { height, width: 300 } } };
}

describe("ComposerInput", () => {
  it("renders borderless body text at the minimum lines", async () => {
    await renderInput(
      <ComposerInput value="" onChangeText={jest.fn()} placeholder="What's happening?" testID="composer" />,
    );

    const input = screen.getByTestId("composer");
    const style = StyleSheet.flatten(input.props.style);

    expect(input.props.multiline).toBe(true);
    expect(input.props.scrollEnabled).toBe(false);
    expect(style.fontSize).toBe(16);
    expect(style.lineHeight).toBe(24);
    expect(style.height).toBe(48);
    expect(style.minHeight).toBe(48);
    expect(style.maxHeight).toBe(288);
    expect(style.borderWidth).toBeUndefined();
    expect(style.backgroundColor).toBeUndefined();
    expect(input.props.placeholderTextColor).toBe("#7A808C");
  });

  it("grows with content and scrolls once past maxLines", async () => {
    await renderInput(
      <ComposerInput value="a" onChangeText={jest.fn()} minLines={1} maxLines={3} testID="composer" />,
    );

    const input = screen.getByTestId("composer");
    expect(StyleSheet.flatten(input.props.style).height).toBe(24);

    fireEvent(input, "contentSizeChange", contentSize(52));
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByTestId("composer").props.style).height).toBe(52),
    );

    fireEvent(input, "contentSizeChange", contentSize(200));
    await waitFor(() => {
      const grown = screen.getByTestId("composer");
      expect(StyleSheet.flatten(grown.props.style).height).toBe(72);
      expect(grown.props.scrollEnabled).toBe(true);
    });
  });

  it("forwards controlled value and change handler", async () => {
    const onChangeText = jest.fn();
    await renderInput(
      <ComposerInput value="hello" onChangeText={onChangeText} testID="composer" />,
    );

    fireEvent.changeText(screen.getByTestId("composer"), "hello world");
    expect(onChangeText).toHaveBeenCalledWith("hello world");
  });
});
