import { act, renderHook, waitFor } from "@testing-library/react-native";

import { deleteSecureItem, getSecureItem, setSecureItem } from "../../storage/secure";
import { useStorageState } from "../use-storage-state";

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(),
  setSecureItem: jest.fn(),
  deleteSecureItem: jest.fn(),
}));

const mockedGet = getSecureItem as jest.Mock;
const mockedSet = setSecureItem as jest.Mock;
const mockedDelete = deleteSecureItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue(null);
  mockedSet.mockResolvedValue(undefined);
  mockedDelete.mockResolvedValue(undefined);
});

describe("useStorageState", () => {
  it("starts loading then hydrates the stored value", async () => {
    let resolveGet!: (value: string | null) => void;
    mockedGet.mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveGet = resolve;
        }),
    );
    const { result } = await renderHook(() => useStorageState("session"));

    expect(result.current[0]).toEqual([true, null]);

    await act(async () => {
      resolveGet("saved-token");
    });
    await waitFor(() => {
      expect(result.current[0]).toEqual([false, "saved-token"]);
    });
    expect(mockedGet).toHaveBeenCalledWith("session");
  });

  it("persists a string value and updates state optimistically", async () => {
    const { result } = await renderHook(() => useStorageState("session"));

    await waitFor(() => {
      expect(result.current[0][0]).toBe(false);
    });

    await act(async () => {
      result.current[1]("dev-token");
    });

    expect(result.current[0]).toEqual([false, "dev-token"]);
    expect(mockedSet).toHaveBeenCalledWith("session", "dev-token");
  });

  it("deletes the key when set to null", async () => {
    mockedGet.mockResolvedValue("saved-token");
    const { result } = await renderHook(() => useStorageState("session"));

    await waitFor(() => {
      expect(result.current[0]).toEqual([false, "saved-token"]);
    });

    await act(async () => {
      result.current[1](null);
    });

    expect(result.current[0]).toEqual([false, null]);
    expect(mockedDelete).toHaveBeenCalledWith("session");
  });

  it("falls back to null without crashing when read fails", async () => {
    mockedGet.mockRejectedValue(new Error("unavailable"));
    const { result } = await renderHook(() => useStorageState("session"));

    await waitFor(() => {
      expect(result.current[0]).toEqual([false, null]);
    });
  });

  it("keeps optimistic state when write fails", async () => {
    mockedSet.mockRejectedValue(new Error("denied"));
    const { result } = await renderHook(() => useStorageState("session"));

    await waitFor(() => {
      expect(result.current[0][0]).toBe(false);
    });

    await act(async () => {
      result.current[1]("dev-token");
    });

    expect(result.current[0]).toEqual([false, "dev-token"]);
    expect(mockedSet).toHaveBeenCalledWith("session", "dev-token");
  });
});
