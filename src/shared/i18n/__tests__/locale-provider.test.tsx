/**
 * Tests for the G2.4 locale override (kv-persisted, device default).
 */

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { deleteKvItem } from "../../storage/kv";
import { LocaleProvider, useLocale } from "../locale-provider";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

beforeEach(() => {
  deleteKvItem("locale.override");
});

describe("LocaleProvider", () => {
  it("starts with no override and switches vi/en with persist", async () => {
    const { result } = await renderHook(() => useLocale(), { wrapper });
    expect(result.current.override).toBeNull();

    await act(async () => {
      result.current.setOverride("vi");
    });
    expect(result.current.override).toBe("vi");
    expect(result.current.locale).toBe("vi");

    await act(async () => {
      result.current.setOverride("en");
    });
    expect(result.current.locale).toBe("en");
  });
});
