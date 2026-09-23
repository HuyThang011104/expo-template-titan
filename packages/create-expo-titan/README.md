# create-expo-titan

Scaffold an Expo SDK 57 Titan app from this boilerplate. Zero-prompt with `--yes`.

```bash
pnpm dlx create-expo-titan@latest MyApp --yes
cd MyApp && pnpm start
```

Without `--yes` only two questions are asked (app name, install or not).
Bundle ID and scheme are never prompted; override them explicitly when forking:

```bash
create-expo-titan MyApp --yes --bundle-id com.acme.myapp --scheme myapp --slug myapp
```

| Flag | Effect |
| ---- | ------ |
| `--yes, -y` | Use all defaults, no prompts |
| `--bundle-id <prefix>` | Bundle prefix (default `com.example.titan`) |
| `--scheme <base>` | Deep-link scheme base (default `titan`) |
| `--slug <slug>` | Expo slug (default: derived from directory) |
| `--no-install` | Skip dependency install (CI) |
| `--no-git` | Skip `git init` |

`src/placeholders.js` is the only place that defines renamed strings.
