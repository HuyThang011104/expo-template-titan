import type { ExpoConfig } from "expo/config";

const APP_VARIANTS = ["development", "preview", "production"] as const;
type AppVariant = (typeof APP_VARIANTS)[number];

const BUNDLE_IDS: Record<AppVariant, string> = {
  development: "com.example.titan.dev",
  preview: "com.example.titan.preview",
  production: "com.example.titan",
};

const SCHEMES: Record<AppVariant, string> = {
  development: "titan-dev",
  preview: "titan-preview",
  production: "titan",
};

function readVariant(): AppVariant {
  const raw = process.env.APP_VARIANT ?? "development";
  if ((APP_VARIANTS as readonly string[]).includes(raw)) {
    return raw as AppVariant;
  }
  throw new Error(`[app.config] Invalid APP_VARIANT "${raw}". Expected one of: ${APP_VARIANTS.join(", ")}`);
}

const variant = readVariant();

// Personal identity lives in env, never hardcoded: local runs work with
// both unset (owner unattached, updates disabled). Cloud builds get real
// values from `eas init` / EAS secrets.
const owner = process.env.EXPO_OWNER ?? undefined;
const easProjectId = process.env.EAS_PROJECT_ID ?? "REPLACE_AFTER_eas_init";

const config: ExpoConfig = {
  name: variant === "production" ? "Titan" : `Titan (${variant})`,
  slug: "titan",
  owner,
  scheme: SCHEMES[variant],
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: BUNDLE_IDS[variant],
    supportsTablet: false,
    // Staging universal link. This config owns associatedDomains; the plugin only dedupes.
    associatedDomains: ["applinks:titan.example"],
  },
  android: {
    package: BUNDLE_IDS[variant],
    predictiveBackGestureEnabled: false,
    // Staging App Links: `https://titan.example/p/{id}` rewrites to `/post/{id}`.
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "titan.example", pathPrefix: "/p/" },
          { scheme: "https", host: "titan.example", pathPrefix: "/post/" },
          { scheme: "https", host: "titan.example", pathPrefix: "/u/" },
          { scheme: "https", host: "titan.example", pathPrefix: "/user/" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-secure-store",
    "expo-notifications",
    "expo-dev-client",
    // Media + offline cache: required native modules (see `expo install` output).
    "expo-asset",
    "expo-video",
    "expo-audio",
    "expo-sqlite",
    // Sentry sourcemaps + native init. Org/project/token come from build env; missing token only skips upload.
    "@sentry/react-native/expo",
    "./plugins/with-titan-permissions",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appVariant: variant,
    eas: { projectId: easProjectId },
  },
  // EAS Update: `url` points at the Expo hosted service for this project.
  // Unset locally — the placeholder disables updates so `expo config` stays green.
  // `runtimeVersion: fingerprint` keeps JS updates on matching native binaries only.
  ...(easProjectId === "REPLACE_AFTER_eas_init"
    ? {}
    : { updates: { url: `https://u.expo.dev/${easProjectId}` } }),
  runtimeVersion: { policy: "fingerprint" },
};

export default config;
