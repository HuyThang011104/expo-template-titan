// Resolve the template directory the scaffolder copies from.
//
// Three modes, in order:
// 1. Explicit override: CREATE_EXPO_TITAN_TEMPLATE_DIR (CI/tests, local dev).
// 2. Monorepo checkout: <repo>/packages/create-expo-titan/src -> <repo>
//    (contributors running bin.js from source; works offline, keeps tests green).
// 3. Published package: download the GitHub tarball for the CLI's own version
//    (create-expo-titan@vX.Y.Z, then vX.Y.Z), falling back to main.
//    Result is cached under os.tmpdir() so repeated scaffolds stay fast.
//
// The npm package stays tiny (bin + src only); the ~2MB template is fetched
// on demand instead of being bundled into every release.
const fs = require("fs");
const os = require("os");
const path = require("path");

const OWNER = "HuyThang011104";
const REPO = "expo-template-titan";

function cliVersion() {
  try {
    return require("../package.json").version;
  } catch {
    return null;
  }
}

function isTemplateRoot(dir) {
  try {
    return (
      fs.existsSync(path.join(dir, "app.config.ts")) && fs.existsSync(path.join(dir, "package.json"))
    );
  } catch {
    return false;
  }
}

// Monorepo layout: packages/create-expo-titan/src/template.js -> repo root.
function localTemplateRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

function isMonorepoCheckout(dir) {
  return (
    isTemplateRoot(dir) &&
    fs.existsSync(path.join(dir, "packages", "create-expo-titan", "package.json"))
  );
}

function cacheDirFor(ref) {
  const safe =
    String(ref)
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .slice(0, 80) || "main";
  return path.join(os.tmpdir(), `create-expo-titan-${safe}`);
}

function tarballUrl(ref) {
  if (ref === "main" || ref === "master") {
    return `https://codeload.github.com/${OWNER}/${REPO}/tar.gz/refs/heads/${ref}`;
  }
  return `https://codeload.github.com/${OWNER}/${REPO}/tar.gz/refs/tags/${ref}`;
}

async function downloadToFile(url, destFile) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch is unavailable (node >= 18 required to download the template)");
  }
  const res = await fetch(url, { headers: { "User-Agent": "create-expo-titan" } });
  if (!res.ok) {
    const err = new Error(`template download failed (HTTP ${res.status}): ${url}`);
    err.status = res.status;
    throw err;
  }
  fs.writeFileSync(destFile, Buffer.from(await res.arrayBuffer()));
}

// codeload tarballs extract to a single top-level dir (<repo>-<sha>).
// Return that dir when it looks like the template, else the dest itself.
function findExtractedRoot(destDir) {
  if (isTemplateRoot(destDir)) return destDir;
  let entries = [];
  try {
    entries = fs.readdirSync(destDir, { withFileTypes: true });
  } catch {
    return destDir;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const full = path.join(destDir, e.name);
    if (isTemplateRoot(full)) return full;
  }
  return destDir;
}

async function fetchRef(ref) {
  const destDir = cacheDirFor(ref);
  if (isTemplateRoot(findExtractedRoot(destDir))) return findExtractedRoot(destDir);

  const tmpFile = path.join(
    os.tmpdir(),
    `create-expo-titan-${Date.now()}-${Math.floor(Math.random() * 1e6)}.tar.gz`,
  );
  try {
    await downloadToFile(tarballUrl(ref), tmpFile);
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });
    // Lazily required: local/monorepo mode (and its tests) never touches it.
    const tar = require("tar");
    await tar.x({ file: tmpFile, cwd: destDir });
  } finally {
    try {
      fs.rmSync(tmpFile, { force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  const root = findExtractedRoot(destDir);
  if (!isTemplateRoot(root)) {
    throw new Error(`downloaded archive for "${ref}" does not contain the template`);
  }
  return root;
}

function candidateRefs(explicitRef, version) {
  const refs = [];
  if (explicitRef) refs.push(explicitRef);
  if (version) {
    refs.push(`create-expo-titan@v${version}`);
    refs.push(`v${version}`);
  }
  refs.push("main");
  return [...new Set(refs)];
}

async function resolveTemplate(opts = {}) {
  const env = opts.env || process.env;
  const override = opts.dir || env.CREATE_EXPO_TITAN_TEMPLATE_DIR;
  if (override && isTemplateRoot(override)) return override;

  const local = localTemplateRoot();
  if (isMonorepoCheckout(local)) return local;

  const explicitRef = opts.ref || env.CREATE_EXPO_TITAN_REF;
  const refs = candidateRefs(explicitRef, cliVersion());
  // When the user pins a ref explicitly, a miss is a hard error (no silent fallback).
  const strict = Boolean(explicitRef);
  let lastErr = null;
  for (const ref of refs) {
    try {
      return await fetchRef(ref);
    } catch (err) {
      lastErr = err;
      if (strict) break;
      // 404 on a version tag just means "not released under this tag yet" -> try next.
      if (err && (err.status === 404 || err.status === 422)) continue;
      // Network-level failures should fall through to main only when the
      // failing ref was a version guess, never when user pinned it.
      if (!explicitRef) continue;
      break;
    }
  }
  throw new Error(
    `could not resolve the template (tried ${refs.join(", ")}). ` +
      `Check your network or set CREATE_EXPO_TITAN_TEMPLATE_DIR. Cause: ${lastErr ? lastErr.message : "unknown"}`,
  );
}

module.exports = {
  OWNER,
  REPO,
  resolveTemplate,
  isTemplateRoot,
  localTemplateRoot,
  candidateRefs,
};
