#!/usr/bin/env node
/**
 * Token guard (spec §12.4).
 *
 * Fails when `src/features/**` or `src/entities/**` hardcode raw color values
 * (hex / rgb() / rgba()) or `fontSize` / `fontWeight` (strict since P3.1).
 *
 * Excluded: `__tests__` folders and fixture files. Allow-lists cover the
 * pre-existing offenders until their P3 screen migration removes them.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOTS = ["src/features", "src/entities"];
const EXCLUDED_DIRS = new Set(["__tests__", "node_modules"]);
const EXCLUDED_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /fixture/i];

/** Files allowed to keep raw colors (migrate + remove entries when done). */
const COLOR_ALLOWLIST = new Set([
  "src/features/showcase/components/animated-icon.tsx",
]);

/** Files allowed to keep raw fontSize/fontWeight until their P3 migration. */
const FONT_ALLOWLIST = new Set([]);

const STRICT_FONTS = true;

const COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\(\s*\d/,
];

const FONT_PATTERNS = [
  /\bfontSize\s*:/,
  /\bfontWeight\s*:/,
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      if (EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(entry))) continue;
      files.push(full.replaceAll(sep, "/"));
    }
  }
  return files;
}

function scan(file, patterns) {
  const hits = [];
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) {
      hits.push({ line: index + 1, content: line.trim() });
    }
  });
  return hits;
}

const colorFiles = [];
const fontFiles = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const isColorAllowed = COLOR_ALLOWLIST.has(file);
    const colorHits = isColorAllowed ? [] : scan(file, COLOR_PATTERNS);
    if (colorHits.length > 0) colorFiles.push({ file, hits: colorHits });
    const fontHits = FONT_ALLOWLIST.has(file) ? [] : scan(file, FONT_PATTERNS);
    if (fontHits.length > 0) fontFiles.push({ file, hits: fontHits });
  }
}

let failed = false;

if (colorFiles.length > 0) {
  failed = true;
  console.error("check:tokens — hardcoded colors found:");
  for (const { file, hits } of colorFiles) {
    for (const hit of hits) console.error(`  ${file}:${hit.line}  ${hit.content}`);
  }
}

const fontLabel = STRICT_FONTS ? "failures" : "warnings";
if (fontFiles.length > 0) {
  if (STRICT_FONTS) failed = true;
  console.error(`check:tokens — hardcoded fontSize/fontWeight (${fontLabel}):`);
  for (const { file, hits } of fontFiles) {
    for (const hit of hits) console.error(`  ${file}:${hit.line}  ${hit.content}`);
  }
}

if (!failed) {
  console.log("check:tokens — clean.");
}
process.exit(failed ? 1 : 0);
