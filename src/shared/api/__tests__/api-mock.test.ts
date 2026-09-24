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
    let client: typeof import("../client").client | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      client = require("../client").client as typeof import("../client").client;
    });
    if (!client) throw new Error("expected client to load");
    const data = await client.get<{
      items: { post: { id: string } }[];
    }>("/feed/home", { auth: false });
    expect(data.items[0]?.post.id).toBe("feed-p-1");
  });

  it("does not touch the mock backend when disabled", async () => {
    delete process.env.EXPO_PUBLIC_API_MOCK;
    let env: typeof import("../../config/env").env | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      env = require("../../config/env").env as typeof import("../../config/env").env;
    });
    if (!env) throw new Error("expected env to load");
    expect(env.apiMock).toBe(false);
  });
});
