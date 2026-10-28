import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { hapticLight, hapticSuccess, hapticWarning } from "../haptics";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));

const impactAsync = Haptics.impactAsync as jest.Mock;
const notificationAsync = Haptics.notificationAsync as jest.Mock;

const originalOS = Platform.OS;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

afterEach(() => {
  setPlatform(originalOS);
  jest.clearAllMocks();
});

describe("haptics", () => {
  it("maps each helper to the expected native feedback", async () => {
    await hapticLight();
    expect(impactAsync).toHaveBeenCalledWith("light");

    await hapticSuccess();
    expect(notificationAsync).toHaveBeenCalledWith("success");

    await hapticWarning();
    expect(notificationAsync).toHaveBeenCalledWith("warning");
  });

  it("is a no-op on web", async () => {
    setPlatform("web");

    await hapticLight();
    await hapticSuccess();
    await hapticWarning();

    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  it("swallows native failures", async () => {
    impactAsync.mockRejectedValueOnce(new Error("not supported"));
    notificationAsync.mockRejectedValueOnce(new Error("not supported"));

    await expect(hapticLight()).resolves.toBeUndefined();
    await expect(hapticSuccess()).resolves.toBeUndefined();
  });
});
