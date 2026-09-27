# create-expo-titan

Scaffold an Expo SDK 57 Titan app from this boilerplate. Zero-prompt, no questions asked.

```bash
pnpm create expo-titan@latest MyApp
cd MyApp && pnpm start
```

Other package managers:

```bash
npm create expo-titan@latest MyApp
npx create-expo-titan@latest MyApp
yarn create expo-titan MyApp
bunx create-expo-titan@latest MyApp
```

Bundle ID and scheme are never prompted; override them explicitly when forking:

```bash
create-expo-titan MyApp --bundle-id com.acme.myapp --scheme myapp --slug myapp
```

| Flag | Effect |
| ---- | ------ |
| `--bundle-id <prefix>` | Bundle prefix (default `com.example.titan`) |
| `--scheme <base>` | Deep-link scheme base (default `titan`) |
| `--slug <slug>` | Expo slug (default: derived from directory) |
| `--ref <tag\|branch>` | Template git ref (default: CLI version tag, fallback `main`) |
| `--no-install` | Skip dependency install (CI) |
| `--no-git` | Skip `git init` |

`src/placeholders.js` is the only place that defines renamed strings.

## Template source

The npm package ships only the CLI (`bin.js` + `src/`). At runtime it
resolves the template in order:

1. `CREATE_EXPO_TITAN_TEMPLATE_DIR` — explicit local path (CI/tests).
2. Monorepo checkout — `packages/create-expo-titan/src` → repo root
   (contributors running from source; works offline).
3. GitHub tarball for the CLI's own version —
   `create-expo-titan@vX.Y.Z`, then `vX.Y.Z`, then `main` —
   cached under the OS tmp dir. Pin with `--ref` or `CREATE_EXPO_TITAN_REF`.

## Release

Bump `version` in `packages/create-expo-titan/package.json`, commit, then:

```bash
git tag create-expo-titan@vX.Y.Z
git push origin create-expo-titan@vX.Y.Z
```

`.github/workflows/publish-cli.yml` runs the CLI tests and publishes to npm
(requires repo secret `NPM_TOKEN`; tag must equal the package version).
