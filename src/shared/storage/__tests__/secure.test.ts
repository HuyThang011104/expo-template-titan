import * as SecureStore from "expo-secure-store";

import { deleteSecureItem, getSecureItem, setSecureItem } from "../secure";

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  let available = true;
  return {
    __setAvailable: (value: boolean): void => {
      available = value;
    },
    __clear: (): void => {
      store.clear();
    },
    isAvailableAsync: jest.fn(async (): Promise<boolean> => available),
    getItemAsync: jest.fn(async (key: string): Promise<string | null> => {
      return store.has(key) ? (store.get(key) as string) : null;
    }),
    setItemAsync: jest.fn(async (key: string, value: string): Promise<void> => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string): Promise<void> => {
      store.delete(key);
    }),
  };
});

const mockedStore = SecureStore as unknown as {
  __setAvailable: (value: boolean) => void;
  __clear: () => void;
};

const ORIGINAL_EXPO_OS = process.env.EXPO_OS;

function useNative(): void {
  delete process.env.EXPO_OS;
}

function useWeb(): void {
  process.env.EXPO_OS = "web";
}

function stubWebStorage(): void {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

beforeEach(() => {
  mockedStore.__setAvailable(true);
  mockedStore.__clear();
  useNative();
});

afterEach(() => {
  process.env.EXPO_OS = ORIGINAL_EXPO_OS;
});

describe("secure storage (native)", () => {
  it("round-trips set → get → delete", async () => {
    await setSecureItem("session", "dev-token");
    await expect(getSecureItem("session")).resolves.toBe("dev-token");
    await deleteSecureItem("session");
    await expect(getSecureItem("session")).resolves.toBeNull();
  });

  it("rejects invalid keys", async () => {
    await expect(setSecureItem("has space", "x")).rejects.toThrow(/Invalid key/);
    await expect(getSecureItem("slash/key")).rejects.toThrow(/Invalid key/);
    await expect(deleteSecureItem("")).rejects.toThrow(/Invalid key/);
  });

  it("throws clearly when SecureStore is unavailable", async () => {
    mockedStore.__setAvailable(false);
    await expect(getSecureItem("session")).rejects.toThrow(/not available/);
  });
});

describe("secure storage (web fallback)", () => {
  it("round-trips via localStorage", async () => {
    useWeb();
    stubWebStorage();
    await setSecureItem("session", "dev-token");
    await expect(getSecureItem("session")).resolves.toBe("dev-token");
    await deleteSecureItem("session");
    await expect(getSecureItem("session")).resolves.toBeNull();
  });
});
