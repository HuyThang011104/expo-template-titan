import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "../../theme/theme-provider";
import { CounterRing } from "../counter-ring";

const WARN_FROM = 260 / 280;

function renderRing(props: React.ComponentProps<typeof CounterRing>) {
  return render(<CounterRing {...props} />, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

function arcColor(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style).borderTopColor;
}

describe("CounterRing", () => {
  it("stays hidden below the visible threshold", async () => {
    await renderRing({ value: 0, max: 280, warnFrom: WARN_FROM, testID: "ring" });
    expect(screen.queryByTestId("ring")).toBeNull();
  });

  it("stays hidden at 259 and appears at 260 with the remaining count", async () => {
    await renderRing({ value: 259, max: 280, warnFrom: WARN_FROM, testID: "ring" });
    expect(screen.queryByTestId("ring")).toBeNull();

    await renderRing({ value: 260, max: 280, warnFrom: WARN_FROM, testID: "ring" });
    expect(screen.getByText("20")).toBeTruthy();
    expect(arcColor("ring-right")).toBe("#2A72DB");
    expect(screen.getByTestId("ring").props.accessibilityLabel).toBe(
      "20 characters remaining",
    );
    expect(screen.getByTestId("ring").props.accessibilityValue).toEqual({
      min: 0,
      max: 280,
      now: 260,
    });
  });

  it("turns warning at max and danger above it", async () => {
    await renderRing({ value: 280, max: 280, warnFrom: WARN_FROM, testID: "ring" });
    expect(screen.getByText("0")).toBeTruthy();
    expect(arcColor("ring-right")).toBe("#B45309");

    await renderRing({ value: 285, max: 280, warnFrom: WARN_FROM, testID: "ring" });
    expect(screen.getByText("-5")).toBeTruthy();
    expect(arcColor("ring-left")).toBe("#DC2626");
  });
});
