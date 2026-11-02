#!/usr/bin/env node
/**
 * Copy the backend OpenAPI contract into `openapi/` and record its
 * provenance. Generated clients are ignored by git and always rebuilt from
 * this pinned snapshot, so the contract must be updated explicitly.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceSpec = process.env.CONTRACT_SPEC_PATH
  ? path.resolve(process.env.CONTRACT_SPEC_PATH)
  : path.resolve(repoRoot, "../backend-university/openapi/openapi.json");
const targetDir = path.resolve(repoRoot, "openapi");
const targetSpec = path.join(targetDir, "openapi.json");
const targetMeta = path.join(targetDir, "contract.json");

if (!existsSync(sourceSpec)) {
  console.error(`[contract:sync] Source spec not found: ${sourceSpec}`);
  console.error(
    "[contract:sync] Set CONTRACT_SPEC_PATH to the backend openapi.json path.",
  );
  process.exit(1);
}

JSON.parse(readFileSync(sourceSpec, "utf8"));

mkdirSync(targetDir, { recursive: true });
copyFileSync(sourceSpec, targetSpec);

const sha256 = createHash("sha256")
  .update(readFileSync(targetSpec))
  .digest("hex");
const backendRoot = path.dirname(path.dirname(sourceSpec));

function git(args) {
  try {
    return execFileSync("git", ["-C", backendRoot, ...args], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

const meta = {
  sourceRepo:
    process.env.CONTRACT_SOURCE_REPO ?? "HuyThang011104/backend-university",
  sourceRef:
    process.env.CONTRACT_SOURCE_REF ?? git(["rev-parse", "--abbrev-ref", "HEAD"]),
  sourceCommit: git(["rev-parse", "HEAD"]),
  specPath: "openapi/openapi.json",
  sha256,
};

writeFileSync(targetMeta, `${JSON.stringify(meta, null, 2)}\n`);

console.log(`[contract:sync] ${sourceSpec} -> ${targetSpec}`);
console.log(`[contract:sync] sha256 ${sha256}`);
