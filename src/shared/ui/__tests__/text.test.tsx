import { render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "../theme/theme-provider";
import { Text } from "../text";

function renderWithTheme(ui: React.ReactElement, name: "light" | "dark" = "light") {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName={name}>{children}</ThemeProvider>
    ),
  });
}

describe("Text", () => {
  it("keeps legacy variant metrics unchanged", async () => {
    await renderWithTheme(
      <>
        <Text testID="title" variant="title">
          Title
        </Text>
        <Text testID="subtitle" variant="subtitle">
          Subtitle
        </Text>
        <Text testID="body" variant="body">
          Body
        </Text>
        <Text testID="small" variant="small">
          Small
        </Text>
      </>,
    );

    expect(screen.getByTestId("title")).toHaveStyle({ fontSize: 48, lineHeight: 52 });
    expect(screen.getByTestId("subtitle")).toHaveStyle({ fontSize: 32, lineHeight: 44 });
    expect(screen.getByTestId("body")).toHaveStyle({ fontSize: 16, fontWeight: "500" });
    expect(screen.getByTestId("small")).toHaveStyle({ fontSize: 14, lineHeight: 20 });
  });

  it("renders the new type scale with semantic colors", async () => {
    await renderWithTheme(
      <>
        <Text testID="display" variant="display">
          Display
        </Text>
        <Text testID="h2" variant="h2">
          Heading
        </Text>
        <Text testID="overline" variant="overline">
          Overline
        </Text>
        <Text testID="link" variant="link">
          Link
        </Text>
      </>,
      "dark",
    );

    expect(screen.getByTestId("display")).toHaveStyle({ fontSize: 34, lineHeight: 40 });
    expect(screen.getByTestId("h2")).toHaveStyle({ fontSize: 22, fontWeight: "600" });
    expect(screen.getByTestId("overline")).toHaveStyle({ letterSpacing: 0.6 });
    expect(screen.getByTestId("display").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#F7F8FA" })]),
    );
    expect(screen.getByTestId("link").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#6AA6FF" })]),
    );
  });
});
