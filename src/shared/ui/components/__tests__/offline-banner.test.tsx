/**
 * Offline banner contract (spec §8.2): shown from NetInfo, never blocks content.
 */

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../theme/theme-provider";
import { OfflineBanner } from "../offline-banner";

let mockNetInfoState = { isConnected: true, isInternetReachable: true };

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockNetInfoState,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

async function renderBanner(name: "light" | "dark" = "light") {
  await render(<OfflineBanner />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider initialName={name}>{children}</ThemeProvider>
    ),
  });
}

describe("OfflineBanner", () => {
  beforeEach(() => {
    mockNetInfoState = { isConnected: true, isInternetReachable: true };
  });

  it("renders nothing while online", async () => {
    await renderBanner();
    expect(screen.queryByTestId("offline-banner")).toBeNull();
  });

  it("alerts when disconnected", async () => {
    mockNetInfoState = { isConnected: false, isInternetReachable: false };
    await renderBanner();
    expect(screen.getByTestId("offline-banner")).toBeTruthy();
    expect(screen.getByLabelText("You are offline. Showing saved content.")).toBeTruthy();
  });

  it("alerts when reachability fails even if the interface is connected", async () => {
    mockNetInfoState = { isConnected: true, isInternetReachable: false };
    await renderBanner("dark");
    expect(screen.getByTestId("offline-banner")).toBeTruthy();
  });
});
