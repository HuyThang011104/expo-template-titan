/**
 * Tests for `shared/media` pure units. Native pickers are not exercised here.
 */

import { getSecureItem } from "../../storage/secure";
import { normalizeAsset } from "../picker";
import { uploadMedia } from "../upload";

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

// Native pickers/audio have no Jest implementation — stub the surface `picker.ts` touches.
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
}));

const mockedGet = getSecureItem as jest.Mock;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected promise to reject");
}

beforeEach(() => {
  jest.resetAllMocks();
  mockedGet.mockResolvedValue(null);
});

describe("normalizeAsset", () => {
  it("drops assets without a uri", () => {
    expect(normalizeAsset({})).toBeNull();
  });

  it("classifies video by mime type", () => {
    expect(
      normalizeAsset({ uri: "file:///a.mp4", width: 0, height: 0, mimeType: "video/mp4" })?.kind,
    ).toBe("video");
    expect(
      normalizeAsset({ uri: "file:///a.jpg", width: 10, height: 10, mimeType: "image/jpeg" })?.kind,
    ).toBe("image");
  });
});

describe("uploadMedia", () => {
  const asset = {
    uri: "file:///a.jpg",
    width: 100,
    height: 100,
    kind: "image" as const,
    mimeType: "image/jpeg",
  };

  it("returns the uploaded media on success", async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ mediaId: "m1", url: "https://cdn/x.jpg", kind: "image" }, 200),
    );
    await expect(uploadMedia(asset, { fetchImpl })).resolves.toEqual({
      mediaId: "m1",
      url: "https://cdn/x.jpg",
      kind: "image",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on network failure, then surfaces the error", async () => {
    const fetchImpl = jest.fn(async (): Promise<Response> => {
      throw new Error("down");
    });
    const error = await catchError(uploadMedia(asset, { fetchImpl }));
    expect(error).toBeInstanceOf(Error);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("never retries validation errors", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ message: "too large" }, 413));
    const error = await catchError(uploadMedia(asset, { fetchImpl }));
    expect(error).toBeInstanceOf(Error);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
