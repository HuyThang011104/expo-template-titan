#!/usr/bin/env node
/**
 * Fail when the vendored OpenAPI snapshot no longer matches the checksum
 * recorded in `openapi/contract.json`. This keeps generated clients tied to
 * the exact backend contract that was reviewed.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const specPath = path.resolve(process.cwd(), "openapi/openapi.json");
const metaPath = path.resolve(process.cwd(), "openapi/contract.json");

for (const file of [specPath, metaPath]) {
  if (!existsSync(file)) {
    console.error(`[contract:verify] Missing ${file}`);
    process.exit(1);
  }
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const spec = readFileSync(specPath);

try {
  JSON.parse(spec.toString("utf8"));
} catch {
  console.error("[contract:verify] openapi/openapi.json is not valid JSON.");
  process.exit(1);
}

const sha256 = createHash("sha256").update(spec).digest("hex");

if (sha256 !== meta.sha256) {
  console.error(
    "[contract:verify] openapi/openapi.json does not match contract.json.",
  );
  console.error(`expected ${meta.sha256}`);
  console.error(`actual   ${sha256}`);
  console.error("[contract:verify] Run `pnpm contract:sync` from a backend checkout.");
  process.exit(1);
}

console.log(`[contract:verify] OK ${sha256}`);
