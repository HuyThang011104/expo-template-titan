import Constants from "expo-constants";

const APP_VARIANTS = ["development", "preview", "production"] as const;

export type AppVariant = (typeof APP_VARIANTS)[number];

function isAppVariant(value: unknown): value is AppVariant {
  return typeof value === "string" && (APP_VARIANTS as readonly string[]).includes(value);
}

function readVariant(): AppVariant {
  const fromConfig = Constants.expoConfig?.extra?.appVariant;
  if (isAppVariant(fromConfig)) return fromConfig;
  const fromEnv = process.env.EXPO_PUBLIC_APP_VARIANT;
  if (isAppVariant(fromEnv)) return fromEnv;
  return "development";
}

export const appVariant = readVariant();

function readPublicApiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (value) return value;
  if (appVariant === "production") {
    throw new Error("[env] Missing EXPO_PUBLIC_API_URL. Add it to .env or EAS environment variables.");
  }
  return "http://localhost:8080";
}

function readSentryDsn(): string | undefined {
  const value = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function readWsUrl(): string | undefined {
  const value = process.env.EXPO_PUBLIC_WS_URL;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function readApiMock(): boolean {
  return process.env.EXPO_PUBLIC_API_MOCK === "true";
}

export const env = {
  appVariant,
  isProduction: appVariant === "production",
  apiUrl: readPublicApiUrl(),
  /** Realtime WS base. Empty derives from `apiUrl` (http -> ws) in `api/endpoints`. */
  wsUrl: readWsUrl(),
  /** `true` routes `client` to the in-app mock backend (E2E builds only). */
  apiMock: readApiMock(),
  /** Public Sentry DSN (inlined into the JS bundle). Empty/missing runs disabled. */
  sentryDsn: readSentryDsn(),
};
