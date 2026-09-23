import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { getSecureItem } from "../../storage/secure";
import { SESSION_KEY, SessionProvider } from "../session-provider";
import { useSession } from "../use-session";

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const mockedGet = getSecureItem as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue(null);
});

describe("SessionProvider", () => {
  it("exposes the session storage key", () => {
    expect(SESSION_KEY).toBe("session");
  });

  it("hydrates with no session then signs in and out", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.session).toBeNull();

    await act(async () => {
      result.current.signIn();
    });
    expect(result.current.session).toBe("dev-token");

    await act(async () => {
      result.current.signOut();
    });
    expect(result.current.session).toBeNull();
  });

  it("throws when used outside the provider", async () => {
    await expect(renderHook(() => useSession())).rejects.toThrow(/SessionProvider/);
  });
});
