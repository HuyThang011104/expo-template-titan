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
| `--no-install` | Skip dependency install (CI) |
| `--no-git` | Skip `git init` |

`src/placeholders.js` is the only place that defines renamed strings.
