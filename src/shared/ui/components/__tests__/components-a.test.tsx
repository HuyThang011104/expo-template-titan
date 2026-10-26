import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import { ThemeProvider } from "../../theme/theme-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Field } from "../field";
import { IconButton } from "../icon-button";
import { Input } from "../input";
import { TextArea } from "../text-area";

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) => <View testID="avatar-image" {...props} />,
  };
});

function renderWithTheme(ui: ReactElement, name: "light" | "dark" = "light") {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider initialName={name}>{children}</ThemeProvider>
    ),
  });
}

describe("Button", () => {
  it("renders a semantic variant and size", async () => {
    await renderWithTheme(
      <Button title="Publish" onPress={jest.fn()} variant="primary" size="lg" testID="publish" />,
    );

    expect(screen.getByText("Publish")).toBeTruthy();
    expect(screen.getByTestId("publish")).toHaveStyle({
      backgroundColor: "#2A72DB",
      minHeight: 52,
    });
  });

  it("keeps the label in the tree and blocks press while loading", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Button title="Save" onPress={onPress} loading testID="save" />,
    );

    const button = screen.getByTestId("save");
    expect(screen.getByText("Save")).toBeTruthy();
    expect(button.queryAll((node) => node.type === "ActivityIndicator")).toHaveLength(1);
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(button).toHaveStyle({ minHeight: 44 });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders an icon on either side", async () => {
    await renderWithTheme(
      <>
        <Button title="Like" onPress={jest.fn()} icon="heart" testID="like" />
        <Button
          title="Next"
          onPress={jest.fn()}
          icon="chevronRight"
          iconPosition="right"
          testID="next"
        />
      </>,
    );

    expect(screen.getAllByTestId("symbol-view")).toHaveLength(2);
  });
});

describe("IconButton", () => {
  it("exposes the required label and keeps a 44pt hit target", async () => {
    await renderWithTheme(
      <IconButton icon="close" accessibilityLabel="Close" size="sm" onPress={jest.fn()} />,
    );

    const button = screen.getByLabelText("Close");
    expect(button).toHaveStyle({ width: 36, height: 36 });
    expect(button.props.hitSlop).toBe(4);
  });
});

describe("Input", () => {
  it("renders label, helper, counter, and leading/trailing icons", async () => {
    await renderWithTheme(
      <Input
        value="ada"
        onChangeText={jest.fn()}
        label="Handle"
        helper="Lowercase only"
        counter
        maxLength={20}
        leadingIcon="search"
        trailingIcon="close"
        testID="handle"
      />,
    );

    expect(screen.getByText("Handle")).toBeTruthy();
    expect(screen.getByText("Lowercase only")).toBeTruthy();
    expect(screen.getByText("3/20")).toBeTruthy();
    expect(screen.getAllByTestId("symbol-view")).toHaveLength(2);
    expect(screen.getByTestId("handle").props.accessibilityLabel).toBe("Handle");
  });

  it("switches the border to borderStrong on focus", async () => {
    await renderWithTheme(<Input value="" onChangeText={jest.fn()} testID="focus" />);

    const input = screen.getByTestId("focus");
    expect(input.parent).toHaveStyle({ borderColor: "#E3E5EA" });

    fireEvent(input, "focus");
    await waitFor(() =>
      expect(screen.getByTestId("focus").parent).toHaveStyle({ borderColor: "#D0D3DA" }),
    );
  });

  it("shows the error border, alert icon, and danger message", async () => {
    await renderWithTheme(
      <Input
        value=""
        onChangeText={jest.fn()}
        label="Email"
        helper="We never share it"
        error="Email is required"
        testID="email"
      />,
    );

    expect(screen.getByText("Email is required")).toBeTruthy();
    expect(screen.queryByText("We never share it")).toBeNull();
    expect(screen.getByTestId("email").parent).toHaveStyle({ borderColor: "#DC2626" });
    expect(screen.getByTestId("symbol-view").props.tintColor).toBe("#DC2626");
  });
});

describe("Field", () => {
  it("renders label, helper, and counter", async () => {
    await renderWithTheme(
      <Field label="Bio" helper="Optional" counter="0/120">
        <Input value="" onChangeText={jest.fn()} />
      </Field>,
    );

    expect(screen.getByText("Bio")).toBeTruthy();
    expect(screen.getByText("Optional")).toBeTruthy();
    expect(screen.getByText("0/120")).toBeTruthy();
  });
});

describe("TextArea", () => {
  it("renders multiline with a 96pt minimum height", async () => {
    await renderWithTheme(<TextArea value="" onChangeText={jest.fn()} testID="bio" />);

    const input = screen.getByTestId("bio");
    expect(input.props.multiline).toBe(true);
    expect(input).toHaveStyle({ minHeight: 96 });
  });
});

describe("Avatar", () => {
  it("renders an image at the requested size", async () => {
    await renderWithTheme(
      <Avatar displayName="Ada" avatarUrl="https://example.com/ada.png" size={64} testID="ada" />,
    );

    expect(screen.getByTestId("ada")).toHaveStyle({ width: 64, height: 64 });
  });

  it("falls back to the initial on surfaceMuted without fetching", async () => {
    await renderWithTheme(<Avatar displayName="ada" avatarUrl={null} size={96} testID="fallback" />);

    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByTestId("fallback")).toHaveStyle({
      width: 96,
      height: 96,
      backgroundColor: "#F0F1F4",
    });
  });
});
