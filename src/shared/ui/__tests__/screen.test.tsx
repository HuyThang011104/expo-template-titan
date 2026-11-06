/**
 * Screen safe-area contract (spec §7.7): native-header screens skip the top
 * edge; headerless screens own the full inset.
 */

import { render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Text } from "react-native";

import { Screen } from "../screen";
import { ThemeProvider } from "../theme/theme-provider";

jest.mock("react-native-safe-area-context", () => {
  const ActualView = jest.requireActual("react-native").View;
  return {
    SafeAreaView: ({
      edges,
      children,
      ...props
    }: {
      edges?: string[];
      children?: React.ReactNode;
    } & Record<string, unknown>) => (
      <ActualView {...props} accessibilityLabel={edges?.join(",")}>
        {children}
      </ActualView>
    ),
  };
});

async function renderScreen(ui: ReactElement) {
  await render(ui, {
    wrapper: ({ children }) => <ThemeProvider initialName="light">{children}</ThemeProvider>,
  });
}

describe("Screen", () => {
  it("drops the top edge under a native header by default", async () => {
    await renderScreen(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId("screen").props.accessibilityLabel).toBe(
      "left,right,bottom",
    );
  });

  it("uses all edges when the screen is headerless", async () => {
    await renderScreen(
      <Screen header={false} testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId("screen").props.accessibilityLabel).toBe(
      "top,left,right,bottom",
    );
  });

  it("keeps an explicit edges override", async () => {
    await renderScreen(
      <Screen header={false} edges={["top"]} testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId("screen").props.accessibilityLabel).toBe("top");
  });
});
