import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import { Text } from "../../text";
import { ThemeProvider } from "../../theme/theme-provider";
import { Badge } from "../badge";
import { Card } from "../card";
import { EmptyState } from "../empty-state";
import { ErrorState } from "../error-state";
import { ListItem } from "../list-item";
import { LoadingState } from "../loading-state";
import { Tabs } from "../tabs";

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    useSharedValue: jest.fn((value: number) => ({ value })),
    useAnimatedStyle: jest.fn((factory: () => unknown) => factory()),
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
  };
});

function renderWithTheme(ui: ReactElement, name: "light" | "dark" = "light") {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider initialName={name}>{children}</ThemeProvider>
    ),
  });
}

const tabItems = [
  { key: "posts", label: "Posts", testID: "tab-posts" },
  { key: "saved", label: "Saved", testID: "tab-saved" },
];

describe("Badge", () => {
  it("caps counts above 99", async () => {
    await renderWithTheme(<Badge count={150} testID="badge" />);

    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByTestId("badge")).toHaveStyle({ backgroundColor: "#2A72DB" });
    expect(screen.getByTestId("badge").props.accessibilityLabel).toBe("99+");
  });

  it("renders a neutral dot without a count", async () => {
    await renderWithTheme(<Badge variant="dot" tone="neutral" testID="dot" />);

    expect(
      screen.getByTestId("dot", { includeHiddenElements: true }),
    ).toHaveStyle({
      width: 8,
      height: 8,
      backgroundColor: "#F0F1F4",
    });
    expect(screen.queryByText("0")).toBeNull();
  });
});

describe("Card", () => {
  it("uses the surface, border, radius, and padding tokens", async () => {
    await renderWithTheme(
      <Card testID="card">
        <Text>Body</Text>
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#E3E5EA",
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    });
  });

  it("uses surfaceElevated in dark mode", async () => {
    await renderWithTheme(
      <Card testID="card">
        <Text>Body</Text>
      </Card>,
      "dark",
    );

    expect(screen.getByTestId("card")).toHaveStyle({ backgroundColor: "#1A1D23" });
  });

  it("becomes a pressable card when onPress is provided", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Card onPress={onPress} testID="card" accessibilityLabel="Open card">
        <Text>Open</Text>
      </Card>,
    );

    const card = screen.getByTestId("card");
    expect(card.props.accessibilityRole).toBe("button");
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });
});

describe("ListItem", () => {
  it("renders leading, title, subtitle, and trailing at 56pt", async () => {
    await renderWithTheme(
      <ListItem
        title="Ada Lovelace"
        subtitle="Engineer"
        leading={<Text>L</Text>}
        trailing={<Text>Value</Text>}
        testID="row"
      />,
    );

    expect(screen.getByText("L")).toBeTruthy();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Engineer")).toBeTruthy();
    expect(screen.getByText("Value")).toBeTruthy();
    expect(screen.getByTestId("row")).toHaveStyle({
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 8,
    });
  });

  it("presses with a combined accessibility label", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <ListItem title="Ada" subtitle="Engineer" onPress={onPress} testID="row" />,
    );

    const row = screen.getByTestId("row");
    expect(row.props.accessibilityLabel).toBe("Ada, Engineer");
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });
});

describe("Tabs", () => {
  it("marks the selected underline tab and switches", async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <Tabs items={tabItems} value="posts" onChange={onChange} testID="tabs" />,
    );

    expect(screen.getByTestId("tabs").props.accessibilityRole).toBe("tablist");
    expect(screen.getByTestId("tab-posts").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId("tab-posts")).toHaveStyle({
      borderBottomColor: "#2A72DB",
    });

    fireEvent.press(screen.getByTestId("tab-saved"));
    expect(onChange).toHaveBeenCalledWith("saved");
  });

  it("uses the segmented surface for the selected tab", async () => {
    await renderWithTheme(
      <Tabs
        items={tabItems}
        value="saved"
        onChange={jest.fn()}
        variant="segmented"
        testID="tabs"
      />,
    );

    expect(screen.getByTestId("tabs")).toHaveStyle({ backgroundColor: "#F0F1F4" });
    expect(screen.getByTestId("tab-saved")).toHaveStyle({ backgroundColor: "#FFFFFF" });
    expect(screen.getByTestId("tab-posts")).not.toHaveStyle({
      backgroundColor: "#FFFFFF",
    });
  });
});

describe("EmptyState", () => {
  it("renders an icon, copy, and action", async () => {
    const onAction = jest.fn();
    await renderWithTheme(
      <EmptyState
        title="No posts yet"
        description="Follow people to fill your feed."
        actionLabel="Find people"
        onAction={onAction}
        testID="empty"
      />,
    );

    expect(screen.getByText("No posts yet").props.accessibilityLabel).toBe("No posts yet");
    expect(screen.getByText("Follow people to fill your feed.")).toBeTruthy();
    expect(screen.getByTestId("symbol-view").parent).toHaveStyle({
      width: 48,
      height: 48,
      backgroundColor: "#F0F1F4",
    });

    fireEvent.press(screen.getByText("Find people"));
    expect(onAction).toHaveBeenCalled();
  });
});

describe("ErrorState", () => {
  it("renders the alert icon and retries", async () => {
    const onRetry = jest.fn();
    await renderWithTheme(<ErrorState onRetry={onRetry} testID="error" />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Please try again.")).toBeTruthy();
    expect(screen.getByTestId("symbol-view").props.tintColor).toBe("#DC2626");

    fireEvent.press(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("accepts custom copy", async () => {
    await renderWithTheme(
      <ErrorState
        title="Offline"
        message="Check your connection."
        retryLabel="Try again"
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText("Offline")).toBeTruthy();
    expect(screen.getByText("Check your connection.")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});

describe("LoadingState", () => {
  it("shows a spinner without loading copy", async () => {
    await renderWithTheme(<LoadingState testID="loading" />);

    expect(screen.getByTestId("loading").props.accessibilityLabel).toBe("Loading");
    expect(
      screen.getByTestId("loading").queryAll((node) => node.type === "ActivityIndicator"),
    ).toHaveLength(1);
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("renders skeleton rows when requested", async () => {
    await renderWithTheme(
      <LoadingState
        variant="skeleton"
        rows={2}
        testID="loading"
        accessibilityLabel="Loading feed"
      />,
    );

    expect(screen.getByTestId("loading").props.accessibilityLabel).toBe("Loading feed");
    expect(
      screen.getByTestId("loading-skeleton-0", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("loading-skeleton-1", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.queryByTestId("loading-skeleton-2", { includeHiddenElements: true }),
    ).toBeNull();
  });
});
