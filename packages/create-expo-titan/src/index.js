const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  TEMPLATE_DEFAULTS,
  toSlug,
  shouldCopyFile,
  isTextFile,
  buildReplacements,
  applyReplacements,
} = require("./placeholders");

const VALID_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function fail(msg) {
    process.stderr.write(`create-expo-titan: ${msg}\n`);
  process.exit(1);
}

function requiredValue(argv, i, flag) {
  const v = argv[i];
  if (v === undefined || v.startsWith("-")) fail(`${flag} expects a value (see --help)`);
  return v;
}

function parseArgs(argv) {
  const opts = {
    dir: null,
    yes: false,
    install: true,
    git: true,
    bundleIdPrefix: TEMPLATE_DEFAULTS.bundleIdPrefix,
    schemeBase: TEMPLATE_DEFAULTS.schemeBase,
    slug: null,
    host: TEMPLATE_DEFAULTS.host,
    help: false,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") opts.yes = true; // deprecated no-op, kept so old commands keep working
    else if (a === "--no-install") opts.install = false;
    else if (a === "--no-git") opts.git = false;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--bundle-id") opts.bundleIdPrefix = requiredValue(argv, (i += 1), a);
    else if (a.startsWith("--bundle-id=")) opts.bundleIdPrefix = a.slice("--bundle-id=".length);
    else if (a === "--scheme") opts.schemeBase = requiredValue(argv, (i += 1), a);
    else if (a.startsWith("--scheme=")) opts.schemeBase = a.slice("--scheme=".length);
    else if (a === "--slug") opts.slug = requiredValue(argv, (i += 1), a);
    else if (a.startsWith("--slug=")) opts.slug = a.slice("--slug=".length);
    else if (a.startsWith("--")) fail(`unknown flag ${a} (see --help)`);
    else if (a.startsWith("-") && a.length > 1) fail(`unknown flag ${a} (see --help)`);
    else rest.push(a);
  }
  if (rest.length > 1) fail(`expected one directory argument, got ${rest.length}`);
  if (rest.length === 1) opts.dir = rest[0];
  return opts;
}

function printHelp() {
  process.stdout.write(
    `Usage: create-expo-titan <directory> [--bundle-id <prefix>] [--scheme <base>] [--slug <slug>] [--no-install] [--no-git]

  <directory>   Folder (and app name) for the new project.
  --bundle-id   Opt-in bundle prefix (default: com.example.titan).
  --scheme      Opt-in deep-link scheme base (default: titan).
  --slug        Opt-in Expo slug (default: derived from directory).
  --no-install  Skip dependency install (CI).
  --no-git      Skip git init.
`,
  );
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const rel = entry.name;
    const from = path.join(src, rel);
    const to = path.join(dest, rel);
    const relFromRoot = path.relative(templateRoot(), from);
    if (!shouldCopyFile(relFromRoot)) continue;
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function templateRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else if (entry.isFile()) out.push(path.relative(base, full));
  }
  return out;
}

function validateAppName(raw) {
  const name = (raw ?? "").trim();
  if (!name) fail("missing <directory> (usage: create-expo-titan MyApp)");
  if (name.length > 100) fail(`invalid directory "${name}" (max 100 chars)`);
  const base = path.basename(path.resolve(name));
  if (!VALID_NAME.test(base)) {
    fail(`invalid directory "${name}" (use letters, numbers, dot, dash, underscore)`);
  }
  return { name, base };
}

async function run(argv, env = {}) {
  const opts = parseArgs(argv);
  if (opts.help) {
    printHelp();
    return { ok: true, help: true };
  }
  const { name, base } = validateAppName(opts.dir);

  // Zero-prompt by design: no questions are asked. Defaults apply unless
  // overridden explicitly (--bundle-id/--scheme/--slug/--no-install/--no-git).
  // --yes/-y is accepted as a no-op for backward compatibility.
  const appName = base;
  const install = opts.install;
  const initGit = opts.git;

  const dest = path.resolve(name);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    fail(`directory "${name}" already exists and is not empty`);
  }

  const slug = opts.slug || toSlug(appName);
  const schemeBase = opts.schemeBase;
  const replacements = buildReplacements({
    appName,
    slug,
    bundleIdPrefix: opts.bundleIdPrefix,
    schemeBase,
    host: opts.host,
  });

  copyDir(templateRoot(), dest);

  for (const rel of listFiles(dest)) {
    const full = path.join(dest, rel);
    if (!isTextFile(full)) continue;
    let content;
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const next = applyReplacements(content, replacements, rel);
    if (next !== content) fs.writeFileSync(full, next);
  }

  // Fresh .env from the example; never overwrite an existing one.
  const envExample = path.join(dest, ".env.example");
  const envFile = path.join(dest, ".env");
  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
  }

  const runShell = (cmd) => {
    // Single command string (no interpolation): avoids DEP0190 and lets
    // Windows resolve shims like `git`/`pnpm`.
    const r = spawnSync(cmd, { cwd: dest, stdio: "inherit", shell: true });
    return r.status ?? 1;
  };

  if (initGit && !fs.existsSync(path.join(dest, ".git"))) {
    if (env.SKIP_GIT !== "1") {
      const status = runShell("git init -q");
      if (status !== 0) fail("git init failed (re-run with --no-git)");
    }
  }
  if (install && env.SKIP_INSTALL !== "1") {
    const status = runShell(`node "${path.join(dest, "scripts", "setup.js")}"`);
    if (status !== 0) fail("setup failed (re-run with --no-install)");
  }

  process.stdout.write(`\nCreated ${appName} in ${dest}\nNext steps:\n  cd ${name}\n  pnpm start\n`);
  return { ok: true, dest, appName, slug };
}

module.exports = { parseArgs, validateAppName, run };
