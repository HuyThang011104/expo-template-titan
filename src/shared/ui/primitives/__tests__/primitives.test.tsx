import { render, screen } from "@testing-library/react-native";
import { useReducedMotion, withRepeat } from "react-native-reanimated";

import { ThemeProvider } from "../../theme/theme-provider";
import { Box } from "../box";
import { Divider } from "../divider";
import { Skeleton } from "../skeleton";
import { Spinner } from "../spinner";
import { Row, Stack } from "../stack";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: { View },
    useSharedValue: jest.fn((value: number) => ({ value })),
    useAnimatedStyle: jest.fn((factory: () => unknown) => factory()),
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
  };
});

const useReducedMotionMock = useReducedMotion as jest.Mock;
const withRepeatMock = withRepeat as jest.Mock;

function renderWithTheme(ui: React.ReactElement, name: "light" | "dark" = "light") {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName={name}>{children}</ThemeProvider>
    ),
  });
}

describe("primitives", () => {
  it("maps Box spacing, color, and radius props to tokens", async () => {
    await renderWithTheme(
      <Box testID="box" padding={4} gap={2} background="surfaceMuted" radius="lg" />,
    );

    expect(screen.getByTestId("box")).toHaveStyle({
      padding: 16,
      gap: 8,
      backgroundColor: "#F0F1F4",
      borderRadius: 16,
    });
  });

  it("renders Stack and Row with the requested direction", async () => {
    await renderWithTheme(
      <Stack testID="stack" gap={2}>
        <Row testID="row" />
      </Stack>,
    );

    expect(screen.getByTestId("stack")).toHaveStyle({ flexDirection: "column", gap: 8 });
    expect(screen.getByTestId("row")).toHaveStyle({ flexDirection: "row" });
  });

  it("renders a divider on the border token", async () => {
    await renderWithTheme(<Divider testID="divider" />);

    expect(screen.getByTestId("divider", { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: "#E3E5EA",
    });
  });

  it("renders a spinner in the resolved semantic color", async () => {
    await renderWithTheme(<Spinner testID="spinner" color="primary" />, "dark");

    expect(screen.getByTestId("spinner").props.color).toBe("#6AA6FF");
  });

  it("pulses the skeleton when motion is allowed", async () => {
    useReducedMotionMock.mockReturnValue(false);
    withRepeatMock.mockClear();

    await renderWithTheme(<Skeleton testID="skeleton" />);

    expect(withRepeatMock).toHaveBeenCalled();
    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: "#E3E5EA",
    });
  });

  it("does not pulse the skeleton when reduce motion is on", async () => {
    useReducedMotionMock.mockReturnValue(true);
    withRepeatMock.mockClear();

    await renderWithTheme(<Skeleton testID="skeleton-static" />);

    expect(withRepeatMock).not.toHaveBeenCalled();
  });
});
