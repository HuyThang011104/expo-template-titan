import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { SessionContext, type SessionContextValue } from "../../../../shared/auth/session-provider";
import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ProfileOverflowMenu } from "../profile-overflow-sheet";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function makeWrapper(qc: QueryClient, session: SessionContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialName="light">
          <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe("ProfileOverflowMenu", () => {
  it("opens the sheet with requests badge and signs out from the item", async () => {
    const qc = createQueryClient();
    qc.setQueryData(queryKeys.followRequests(), {
      pages: [{ userIds: ["u-9"], nextCursor: null }],
      pageParams: [null],
    });
    const signOut = jest.fn();
    const session: SessionContextValue = {
      session: "dev-token",
      isLoading: false,
      signIn: () => {},
      signOut,
    };

    await render(<ProfileOverflowMenu />, { wrapper: makeWrapper(qc, session) });

    expect(screen.queryByTestId("profile-overflow-sheet")).toBeNull();

    fireEvent.press(screen.getByTestId("profile-overflow-button"));

    await waitFor(() => {
      expect(screen.getByTestId("profile-overflow-sheet")).toBeTruthy();
    });
    expect(screen.getByText("Follow requests (1)")).toBeTruthy();
    expect(screen.getByTestId("profile-settings-button")).toBeTruthy();

    fireEvent.press(screen.getByTestId("profile-sign-out-button"));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
