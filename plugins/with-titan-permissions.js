const {
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} = require("expo/config-plugins");

const ANDROID_PERMISSIONS = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.POST_NOTIFICATIONS",
];

const IOS_PERMISSION_MESSAGES = {
  NSCameraUsageDescription: "Titan uses the camera to take photos and record videos for posts.",
  NSMicrophoneUsageDescription: "Titan uses the microphone for video posts and voice notes.",
  NSPhotoLibraryUsageDescription: "Titan accesses your photo library so you can pick media for posts.",
  NSPhotoLibraryAddUsageDescription: "Titan saves media you capture to your photo library.",
};

const ASSOCIATED_DOMAIN = "applinks:titan.example";

function addUsesPermissions(manifest) {
  const existing = manifest.manifest["uses-permission"] ?? [];
  for (const permission of ANDROID_PERMISSIONS) {
    const alreadyDeclared = existing.some(
      (entry) => entry.$["android:name"] === permission,
    );
    if (!alreadyDeclared) {
      existing.push({ $: { "android:name": permission } });
    }
  }
  manifest.manifest["uses-permission"] = existing;
  return manifest;
}

const withTitanPermissions = (config) => {
  config = withInfoPlist(config, (plistConfig) => {
    plistConfig.modResults = { ...plistConfig.modResults, ...IOS_PERMISSION_MESSAGES };
    return plistConfig;
  });
  config = withAndroidManifest(config, (manifestConfig) => {
    manifestConfig.modResults = addUsesPermissions(manifestConfig.modResults);
    return manifestConfig;
  });
  // app.config.ts owns associatedDomains; this only dedupes as a safety net.
  const domains = [...(config.ios?.associatedDomains ?? [])];
  if (!domains.includes(ASSOCIATED_DOMAIN)) {
    domains.push(ASSOCIATED_DOMAIN);
  }
  config.ios = {
    ...config.ios,
    associatedDomains: domains,
  };
  return config;
};

module.exports = createRunOncePlugin(withTitanPermissions, "with-titan-permissions");
