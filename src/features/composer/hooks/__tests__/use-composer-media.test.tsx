/**
 * Tests for `useComposerMedia` (session picks: one video XOR up to 4 photos).
 *
 * The native picker is stubbed; denial resolves `[]` silently per the kernel.
 */

import { act, renderHook } from "@testing-library/react-native";

import { useComposerMedia } from "../use-composer-media";

const mockGetRecordingPermissionsAsync = jest.fn();
const mockRequestRecordingPermissionsAsync = jest.fn();

jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: (...args: unknown[]) =>
    mockGetRecordingPermissionsAsync(...args),
  requestRecordingPermissionsAsync: (...args: unknown[]) =>
    mockRequestRecordingPermissionsAsync(...args),
}));

const mockLaunchImageLibraryAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockGetMediaLibraryPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockGetCameraPermissionsAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  getCameraPermissionsAsync: (...args: unknown[]) => mockGetCameraPermissionsAsync(...args),
  requestCameraPermissionsAsync: (...args: unknown[]) => mockRequestCameraPermissionsAsync(...args),
  getMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockGetMediaLibraryPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
}));

function imageAsset(uri: string) {
  return { uri, width: 100, height: 100, mimeType: "image/jpeg" };
}

function videoAsset(uri: string, duration = 1500, fileSize = 1024) {
  return { uri, width: 1280, height: 720, mimeType: "video/mp4", duration, fileSize };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockGetCameraPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockGetRecordingPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRequestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [imageAsset("file:///a.jpg")],
  });
  mockLaunchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [videoAsset("file:///cam.mp4")],
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
    expect(result.current.mode).toBe("images");
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
        videoAsset("file:///v.mp4"),
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

  it("picks one video and locks the photo actions", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset("file:///v.mp4")],
    });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickVideo();
    });

    expect(result.current.count).toBe(1);
    expect(result.current.mode).toBe("video");
    expect(result.current.canAddImages).toBe(false);
    expect(result.current.canAddVideo).toBe(false);
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: false }),
    );
    const options = mockLaunchImageLibraryAsync.mock.calls[0]?.[0] as { mediaTypes?: unknown };
    expect(options.mediaTypes).toEqual(["videos"]);
  });

  it("rejects a video longer than 90 seconds", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset("file:///long.mp4", 91_000)],
    });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickVideo();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe("Video must be 90 seconds or shorter.");
  });

  it("rejects a video larger than 100MB", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset("file:///big.mp4", 1500, 100 * 1024 * 1024 + 1)],
    });
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickVideo();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe("Video must be 100MB or smaller.");
  });

  it("refuses video once photos are picked", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.pickMore();
    });
    await act(async () => {
      await result.current.pickVideo();
    });

    expect(result.current.count).toBe(1);
    expect(result.current.mode).toBe("images");
    expect(result.current.error).toBe("Choose either one video or up to 4 photos, not both.");
  });

  it("records a video with the OS camera capped at 90s", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      await result.current.recordVideo();
    });

    expect(mockLaunchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ["videos"], videoMaxDuration: 90 }),
    );
    expect(result.current.count).toBe(1);
    expect(result.current.mode).toBe("video");
  });

  it("addAsset appends a captured image and reports the new list", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    let next: { uri: string }[] = [];
    await act(async () => {
      next = result.current.addAsset({
        uri: "file:///cam.jpg",
        width: 100,
        height: 100,
        kind: "image",
        mimeType: "image/jpeg",
      });
    });
    expect(next.map((asset) => asset.uri)).toEqual(["file:///cam.jpg"]);
    expect(result.current.items).toHaveLength(1);
  });

  it("addAsset ignores null and videos", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      result.current.addAsset(null);
      result.current.addAsset({
        uri: "file:///v.mp4",
        width: 0,
        height: 0,
        kind: "video",
        mimeType: "video/mp4",
      });
    });
    expect(result.current.count).toBe(0);
  });

  it("addAsset respects the cap of 4", async () => {
    const { result } = await renderHook(() => useComposerMedia());
    await act(async () => {
      for (let i = 0; i < 5; i += 1) {
        result.current.addAsset({
          uri: `file:///cam-${i}.jpg`,
          width: 100,
          height: 100,
          kind: "image",
          mimeType: "image/jpeg",
        });
      }
    });
    expect(result.current.count).toBe(4);
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
