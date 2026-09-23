/**
 * Tests for the `EXPO_PUBLIC_API_MOCK` runtime switch. The mock backend
 * serves E2E builds; this pins the wiring, not the fixtures themselves.
 */

jest.mock("../../storage/secure", () => ({
  getSecureItem: jest.fn(),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

describe("mock backend switch", () => {
  const OLD_ENV = process.env.EXPO_PUBLIC_API_MOCK;

  afterEach(() => {
    if (OLD_ENV === undefined) {
      delete process.env.EXPO_PUBLIC_API_MOCK;
    } else {
      process.env.EXPO_PUBLIC_API_MOCK = OLD_ENV;
    }
    jest.resetModules();
  });

  it("serves the deterministic mock feed when enabled", async () => {
    process.env.EXPO_PUBLIC_API_MOCK = "true";
    let client: { get: <T>(path: string, options?: object) => Promise<T> } | null = null;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      client = require("../client").client;
    });
    const data = await (client as NonNullable<typeof client>).get<{
      items: { post: { id: string } }[];
    }>("/feed/home", { auth: false });
    expect(data.items[0]?.post.id).toBe("feed-p-1");
  });

  it("does not touch the mock backend when disabled", async () => {
    delete process.env.EXPO_PUBLIC_API_MOCK;
    let env: { apiMock: boolean } | null = null;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      env = require("../../config/env").env;
    });
    expect((env as NonNullable<typeof env>).apiMock).toBe(false);
  });
});
