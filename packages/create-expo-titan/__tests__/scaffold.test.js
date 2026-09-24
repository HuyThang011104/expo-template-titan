const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const cli = path.resolve(__dirname, "..", "bin.js");
const placeholders = require("../src/placeholders");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-expo-titan-"));

function scaffold(args, env = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function readJSON(dest, rel) {
  return JSON.parse(fs.readFileSync(path.join(dest, rel), "utf8"));
}

function read(dest, rel) {
  return fs.readFileSync(path.join(dest, rel), "utf8");
}

function grepCount(dest, pattern) {
  const { isTextFile } = placeholders;
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && isTextFile(full)) {
        const c = fs.readFileSync(full, "utf8");
        if (c.includes(pattern)) hits.push(path.relative(dest, full));
      }
    }
  };
  walk(dest);
  return hits;
}

describe("create-expo-titan", () => {
  test("scaffolds with defaults, no prompts (name+slug renamed, ids stay hardcoded)", () => {
    const dest = path.join(tmpRoot, "MyApp");
    scaffold([dest, "--no-install", "--no-git"]);

    expect(readJSON(dest, "package.json").name).toBe("myapp");
    expect(read(dest, ".env")).toBe(read(dest, ".env.example"));

    const config = read(dest, "app.config.ts");
    expect(config).toContain('name: variant === "production" ? "MyApp" : `MyApp (${variant})`');
    expect(config).toContain('slug: "myapp"');

    // Zero-prompt defaults: bundle prefix, schemes,
    // and host are untouched.
    expect(config).toContain('"com.example.titan.dev"');
    expect(config).toContain('"titan-dev"');
    expect(config).toContain('"titan-preview"');
    expect(read(dest, "e2e/flows/auth-and-feed.yaml")).toContain("appId: com.example.titan.dev");

    // Scaffolder-local and generated dirs never leak into the new app.
    // (.eas workflows ARE copied — they are part of the template gates.)
    for (const p of ["packages", "schedules", "documentation", "node_modules", ".expo", ".git"]) {
      expect(fs.existsSync(path.join(dest, p))).toBe(false);
    }
    // Nested paths under excluded dirs are filtered too (not just top level).
    expect(placeholders.shouldCopyFile(["documentation", "docs", "intro.md"].join(path.sep))).toBe(false);
    expect(fs.existsSync(path.join(dest, ".eas", "workflows", "ci.yml"))).toBe(true);
    // Workspace trust (allowBuilds) must travel with the lockfile.
    expect(read(dest, "pnpm-workspace.yaml")).toContain("allowBuilds");
  });

  test("custom --scheme leaves no stale titan-dev behind", () => {
    const dest = path.join(tmpRoot, "CustomScheme");
    scaffold([dest, "--no-install", "--no-git", "--scheme", "myapp"]);

    const config = read(dest, "app.config.ts");
    expect(config).toContain('"myapp-dev"');
    expect(config).toContain('"myapp-preview"');
    expect(config).toContain('production: "myapp",');
    expect(grepCount(dest, "titan-dev")).toEqual([]);
    expect(grepCount(dest, "titan-preview")).toEqual([]);
  });

  test("custom --bundle-id renames repo-wide (e2e included, documentation excluded)", () => {
    const dest = path.join(tmpRoot, "AcmeApp");
    scaffold([dest, "--no-install", "--no-git", "--bundle-id", "com.acme.foo"]);

    expect(read(dest, "app.config.ts")).toContain('"com.acme.foo.dev"');
    expect(read(dest, "e2e/flows/auth-and-feed.yaml")).toContain("appId: com.acme.foo.dev");
    expect(grepCount(dest, "com.example.titan")).toEqual([]);
    expect(fs.existsSync(path.join(dest, "documentation"))).toBe(false);
  });

  test("existing non-empty directory fails cleanly instead of overwriting", () => {
    const dest = path.join(tmpRoot, "Taken");
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "keep.txt"), "keep");
    expect(() => scaffold([dest, "--no-install", "--no-git"])).toThrow(/already exists/);
    expect(read(dest, "keep.txt")).toBe("keep");
  });

  test("--yes is accepted as a deprecated no-op", () => {
    const dest = path.join(tmpRoot, "LegacyYes");
    scaffold([dest, "--yes", "--no-install", "--no-git"]);
    expect(readJSON(dest, "package.json").name).toBe("legacyyes");
  });

  test("scaffolded app carries a working setup script", () => {
    const dest = path.join(tmpRoot, "MyApp");
    const setup = path.join(dest, "scripts", "setup.js");
    expect(fs.existsSync(setup)).toBe(true);
    expect(read(dest, "package.json")).toContain('"setup": "node ./scripts/setup.js"');
  });
});
