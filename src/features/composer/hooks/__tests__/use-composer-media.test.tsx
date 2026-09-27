/**
 * Tests for F1.2 `useComposerMedia` (session picks, images-only, capped at 4).
 *
 * The native picker is stubbed; denial resolves `[]` silently per the kernel.
 */

import { act, renderHook } from "@testing-library/react-native";

import { useComposerMedia } from "../use-composer-media";

jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
}));

const mockLaunchImageLibraryAsync = jest.fn();
const mockGetMediaLibraryPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  launchCameraAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockGetMediaLibraryPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
}));

function imageAsset(uri: string) {
  return { uri, width: 100, height: 100, mimeType: "image/jpeg" };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [imageAsset("file:///a.jpg")],
  });
});

describe("useComposerMedia", () => {
  it("appends library images with allowsMultiple + quality 0.8", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    let next: { uri: string }[] = [];
    await act(async () => {
      next = await result.current.pickMore();
    });
    expect(next).toHaveLength(1);
    expect(result.current.count).toBe(1);
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, quality: 0.8 }),
    );
    const options = mockLaunchImageLibraryAsync.mock.calls[0]?.[0] as { mediaTypes?: unknown };
    expect(options.mediaTypes).toEqual(["images"]);
  });

  it("drops videos and caps at 4", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        imageAsset("file:///1.jpg"),
        imageAsset("file:///2.jpg"),
        { uri: "file:///v.mp4", width: 0, height: 0, mimeType: "video/mp4" },
        imageAsset("file:///3.jpg"),
        imageAsset("file:///4.jpg"),
        imageAsset("file:///5.jpg"),
      ],
    });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickMore();
    });
    expect(result.current.count).toBe(4);
    expect(result.current.canAddMore).toBe(false);
    expect(result.current.items.some((asset) => asset.kind === "video")).toBe(false);
  });

  it("denial resolves silently with no items", async () => {
    mockGetMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickMore();
    });
    expect(result.current.count).toBe(0);
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("removeAt drops one thumb and reports the new list", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [imageAsset("file:///a.jpg"), imageAsset("file:///b.jpg")],
    });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickMore();
    });
    let next: { uri: string }[] = [];
    await act(async () => {
      next = result.current.removeAt(0);
    });
    expect(next.map((asset) => asset.uri)).toEqual(["file:///b.jpg"]);
    expect(result.current.count).toBe(1);
  });
});
