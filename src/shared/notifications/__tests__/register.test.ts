import * as Notifications from "expo-notifications";

import { isPushSupportedPlatform, needsAndroidChannel, registerForPushNotifications, saveDeviceToken } from "../register";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

const constantsState: { projectId: string | null } = { projectId: "test-project-id" };

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return constantsState.projectId
        ? { extra: { eas: { projectId: constantsState.projectId } } }
        : {};
    },
  },
}));

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const mockedNotifications = Notifications as unknown as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  constantsState.projectId = "test-project-id";
  // `EXPO_OS` is inlined at compile time, so tests cannot mutate it at runtime.
  // Jest runs as iOS here; web/Android branches go through the pure helpers below.
  mockedNotifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  mockedNotifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
  mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[test]" });
});

describe("registerForPushNotifications", () => {
  it("saves the token to POST /devices when permission is already granted", async () => {
    const seen: { url: string; body: unknown }[] = [];
    const fetchImpl = jest.fn(
      async (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> => {
        const [input, init] = args;
        seen.push({ url: String(input), body: JSON.parse(String(init?.body)) as unknown });
        return jsonResponse({ ok: true }, 200);
      },
    );

    const token = await registerForPushNotifications({ fetchImpl });

    expect(token).toBe("ExponentPushToken[test]");
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(seen[0]?.url).toBe("http://localhost:8080/devices");
    expect(seen[0]?.body).toMatchObject({ expoPushToken: "ExponentPushToken[test]" });
  });

  it("requests permission when not yet granted", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    const fetchImpl = jest.fn(async () => jsonResponse({ ok: true }, 200));

    const token = await registerForPushNotifications({ fetchImpl });

    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(token).toBe("ExponentPushToken[test]");
  });

  it("returns null when permission is denied and never fetches a token", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({ granted: false });
    const fetchImpl = jest.fn(async () => jsonResponse({ ok: true }, 200));

    await expect(registerForPushNotifications({ fetchImpl })).resolves.toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null when the EAS projectId is missing", async () => {
    constantsState.projectId = null;
    const fetchImpl = jest.fn(async () => jsonResponse({ ok: true }, 200));

    await expect(registerForPushNotifications({ fetchImpl })).resolves.toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("still returns the token when POST /devices fails transiently", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ message: "down" }, 500));

    await expect(registerForPushNotifications({ fetchImpl })).resolves.toBe(
      "ExponentPushToken[test]",
    );
  });

  it("skips the Android channel on the jest platform (iOS)", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ ok: true }, 200));

    await registerForPushNotifications({ fetchImpl });

    expect(mockedNotifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe("platform gates", () => {
  it("push is unsupported on web only", () => {
    expect(isPushSupportedPlatform("web")).toBe(false);
    expect(isPushSupportedPlatform("ios")).toBe(true);
    expect(isPushSupportedPlatform("android")).toBe(true);
    expect(isPushSupportedPlatform(undefined)).toBe(true);
  });

  it("Android channel is created on Android only", () => {
    expect(needsAndroidChannel("android")).toBe(true);
    expect(needsAndroidChannel("ios")).toBe(false);
    expect(needsAndroidChannel("web")).toBe(false);
    expect(needsAndroidChannel(undefined)).toBe(false);
  });
});

describe("saveDeviceToken", () => {
  it("POSTs the token payload", async () => {
    const seen: unknown[] = [];
    const fetchImpl = jest.fn(async (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> => {
      seen.push(JSON.parse(String(args[1]?.body)) as unknown);
      return jsonResponse({ ok: true }, 200);
    });

    await saveDeviceToken("ExponentPushToken[x]", { fetchImpl });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ expoPushToken: "ExponentPushToken[x]" });
  });
});
