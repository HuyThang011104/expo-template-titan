#!/usr/bin/env node

// Non-interactive project setup (O4). Idempotent: safe to run twice.
// 1. check `node >= 22.13` and `pnpm` exists
// 2. copy `.env.example` -> `.env` when missing (never overwrite)
// 3. `pnpm install --frozen-lockfile` (unless --no-install)
// 4. print next steps
// Never prompts. Never touches app.config.ts. Never calls eas login/prebuild.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MIN_NODE = [22, 13];

function fail(msg) {
  process.stderr.write(`setup: ${msg}\n`);
  process.exit(1);
}

function checkNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1])) return;
  fail(`node >= 22.13 required (found ${process.versions.node})`);
}

function checkPnpm() {
  // Single command string: safe here (no interpolation) and lets Windows
  // resolve the `pnpm` shim without shell arg-splitting (DEP0190).
  const v = spawnSync("pnpm --version", { encoding: "utf8", shell: true });
  if (v.status !== 0 || !String(v.stdout).trim()) {
    fail("pnpm not found — install it from https://pnpm.io");
  }
}

function ensureEnv(root) {
  const example = path.join(root, ".env.example");
  const target = path.join(root, ".env");
  if (fs.existsSync(target)) {
    process.stdout.write("setup: .env already exists, keeping it\n");
    return;
  }
  if (!fs.existsSync(example)) fail(".env.example not found");
  fs.copyFileSync(example, target);
  process.stdout.write("setup: copied .env.example -> .env\n");
}

function install(root) {
  // Single command string (see checkPnpm): no interpolation, no DEP0190.
  const r = spawnSync("pnpm install --frozen-lockfile", {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if ((r.status ?? 1) !== 0) fail("pnpm install --frozen-lockfile failed");
}

function main() {
  const root = process.cwd();
  const noInstall = process.argv.includes("--no-install");
  checkNode();
  checkPnpm();
  ensureEnv(root);
  if (noInstall) {
    process.stdout.write("setup: skipping install (--no-install)\n");
  } else {
    install(root);
  }
  process.stdout.write("setup: done. Next steps:\n  pnpm start      # web / Expo Go + mock\n  pnpm start:dev  # Dev Client\n");
}

main();
