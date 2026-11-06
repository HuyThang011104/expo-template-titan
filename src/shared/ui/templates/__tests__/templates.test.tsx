/**
 * Page template contracts (spec §8.1): states live in the template so
 * screens only supply content.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { Text } from "react-native";

import { ThemeProvider } from "../../theme/theme-provider";
import { DetailPage } from "../detail-page";
import { ListPage } from "../list-page";

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

async function renderPage(ui: ReactElement) {
  await render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

describe("DetailPage", () => {
  it("renders the loading state", async () => {
    await renderPage(
      <DetailPage testID="detail" isPending loadingLabel="Loading detail">
        <Text>body</Text>
      </DetailPage>,
    );

    expect(screen.getByTestId("detail-loading")).toBeTruthy();
    expect(screen.queryByText("body")).toBeNull();
  });

  it("renders the error state with a retry", async () => {
    const onRetry = jest.fn();
    await renderPage(
      <DetailPage testID="detail" isError onRetry={onRetry}>
        <Text>body</Text>
      </DetailPage>,
    );

    expect(screen.getByTestId("detail-error")).toBeTruthy();
    fireEvent.press(screen.getByTestId("detail-retry-button"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("keeps the body and pinned footer", async () => {
    await renderPage(
      <DetailPage testID="detail" footer={<Text>footer</Text>}>
        <Text>body</Text>
      </DetailPage>,
    );

    expect(screen.getByText("body")).toBeTruthy();
    expect(screen.getByText("footer")).toBeTruthy();
  });
});

describe("ListPage", () => {
  it("renders the loading state", async () => {
    await renderPage(
      <ListPage
        testID="list"
        data={[]}
        renderItem={() => null}
        isPending
        empty={{ title: "Nothing here" }}
      />,
    );

    expect(screen.getByTestId("list-loading")).toBeTruthy();
  });

  it("renders the error state", async () => {
    await renderPage(
      <ListPage
        testID="list"
        data={[]}
        renderItem={() => null}
        isError
        empty={{ title: "Nothing here" }}
      />,
    );

    expect(screen.getByTestId("list-error")).toBeTruthy();
  });
});
