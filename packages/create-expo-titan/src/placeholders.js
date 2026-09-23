// Single source of truth for every string the scaffolder renames.
//
// CLI flow: copy template -> apply these replacements in text files ->
// write .env from .env.example. Nothing else is patched.
const path = require("path");

const TEMPLATE_DEFAULTS = {
  appName: "Titan",
  slug: "titan",
  bundleIdPrefix: "com.example.titan",
  schemeBase: "titan",
  host: "titan.example",
  packageName: "expo-sdk-57-template",
};

const DEFAULTS = {
  bundleSuffixes: { development: ".dev", preview: ".preview", production: "" },
  schemeSuffixes: { development: "-dev", preview: "-preview", production: "" },
};

function bundleIdFor(prefix, variant) {
  return `${prefix}${DEFAULTS.bundleSuffixes[variant] ?? ""}`;
}

function schemeFor(base, variant) {
  return `${base}${DEFAULTS.schemeSuffixes[variant] ?? ""}`;
}

function toSlug(appName) {
  return (
    appName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "app"
  );
}

// Patch targets: files the scaffolder rewrites after copying the template.
// Only files that embed an identity string; binary or generated dirs are
// excluded from the copy entirely.
const TEXT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".gradle",
  ".plist",
  ".pbxproj",
  ".entitlements",
  ".strings",
]);

// Directories never copied from the template into the scaffolded app.
// Plan list (.git node_modules .expo dist web-build android ios .env) plus
// scaffolder-local sources (packages, schedules, documentation) that must not
// leak into the new app. .eas workflows and editor/husky config ARE copied —
// they are part of the template's quality gates.
const EXCLUDED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".expo",
  "dist",
  "web-build",
  "android",
  "ios",
  "packages",
  "schedules",
  "documentation",
]);

// Files never copied (local-only state, never part of the scaffolded app).
const EXCLUDED_FILES = new Set([".env", ".env.local", ".env.development.local", ".env.production.local"]);

function shouldCopyFile(relPath) {
  const parts = relPath.split(path.sep);
  if (parts.some((p) => EXCLUDED_DIRS.has(p))) return false;
  if (EXCLUDED_FILES.has(parts[parts.length - 1])) return false;
  return true;
}

function isTextFile(filePath) {
  if (path.basename(filePath) === "eas.json") return true;
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

// Build the ordered replacement list. Longer (variant-qualified) strings
// first so "com.example.titan.dev" is renamed before the bare prefix.
// Variant-qualified ids and the host are repo-wide on purpose: e2e
// intentionally mirrors the runtime config, so a custom --bundle-id/--scheme
// must not leave stale values behind. (documentation/ is excluded from the
// copy entirely, so docs never need renaming.) Bare words ("titan" the scheme,
// "titan" the slug) are prose everywhere, so they are anchored to their
// config lines in app.config.ts and renamed only there.
function buildReplacements({ appName, slug, bundleIdPrefix, schemeBase, host }) {
  const replacements = [];
  if (schemeBase !== TEMPLATE_DEFAULTS.schemeBase) {
    replacements.push({
      from: `production: "${schemeFor(TEMPLATE_DEFAULTS.schemeBase, "production")}",`,
      to: `production: "${schemeFor(schemeBase, "production")}",`,
      files: ["app.config.ts"],
    });
    for (const variant of ["development", "preview"]) {
      replacements.push({
        from: schemeFor(TEMPLATE_DEFAULTS.schemeBase, variant),
        to: schemeFor(schemeBase, variant),
      });
    }
  }
  // Bundle ids after the scheme: variant-qualified first, so
  // "com.example.titan.dev" is renamed before the bare prefix.
  for (const variant of ["development", "preview", "production"]) {
    replacements.push({
      from: bundleIdFor(TEMPLATE_DEFAULTS.bundleIdPrefix, variant),
      to: bundleIdFor(bundleIdPrefix, variant),
    });
  }
  replacements.push({ from: TEMPLATE_DEFAULTS.host, to: host });
  replacements.push({ from: `slug: "${TEMPLATE_DEFAULTS.slug}"`, to: `slug: "${slug}"`, files: ["app.config.ts"] });
  replacements.push({
    from: TEMPLATE_DEFAULTS.packageName,
    to: slug,
    files: ["package.json"],
  });
  replacements.push({
    from: `"name": "${TEMPLATE_DEFAULTS.packageName}"`,
    to: `"name": "${slug}"`,
    files: ["package.json"],
  });
  replacements.push({
    from: `name: variant === "production" ? "${TEMPLATE_DEFAULTS.appName}" : \`Titan (\${variant})\``,
    to: `name: variant === "production" ? "${appName}" : \`${appName} (\${variant})\``,
    files: ["app.config.ts"],
  });
  return replacements;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(content, from) {
  if (!from) return 0;
  return content.split(from).length - 1;
}

function applyReplacements(content, replacements, relPath) {
  let out = content;
  for (const r of replacements) {
    if (r.from === r.to) continue;
    if (r.files && !r.files.includes(path.basename(relPath))) continue;
    out = out.split(r.from).join(r.to);
  }
  return out;
}

module.exports = {
  TEMPLATE_DEFAULTS,
  DEFAULTS,
  TEXT_FILE_EXTENSIONS,
  EXCLUDED_DIRS,
  EXCLUDED_FILES,
  bundleIdFor,
  schemeFor,
  toSlug,
  shouldCopyFile,
  isTextFile,
  buildReplacements,
  escapeRegExp,
  countOccurrences,
  applyReplacements,
};
