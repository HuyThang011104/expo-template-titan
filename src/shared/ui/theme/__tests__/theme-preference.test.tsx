/**
 * Tests for the G2.4 theme preference (kv-persisted, system default).
 */

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { deleteKvItem, getKvItem } from "../../../storage/kv";
import { ThemePreferenceProvider, useThemePreference } from "../theme-preference";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

beforeEach(() => {
  deleteKvItem("theme.override");
});

describe("ThemePreferenceProvider", () => {
  it("defaults to system and persists explicit choices", async () => {
    const { result } = await renderHook(() => useThemePreference(), { wrapper });
    expect(result.current.preference).toBe("system");

    await act(async () => {
      result.current.setPreference("dark");
    });
    expect(result.current.preference).toBe("dark");
    expect(getKvItem("theme.override")).toBe("dark");

    await act(async () => {
      result.current.setPreference("system");
    });
    expect(getKvItem("theme.override")).toBeNull();
  });
});
