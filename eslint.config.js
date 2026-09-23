// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require("eslint-config-expo/flat");
const boundaries = require("eslint-plugin-boundaries");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...expoConfig,
  {
    plugins: { boundaries },
    settings: {
      // Reuses the expo config's TS import resolver so boundaries understands `@/*`.
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        // Each `src/features/<name>` folder is ONE element (no trailing `/**`).
        // A trailing `/**` would make every file its own element and break the public-API rule.
        { type: "feature", pattern: "src/features/*", capture: ["feature"] },
        { type: "entity", pattern: "src/entities/*", capture: ["entity"] },
        { type: "shared", pattern: "src/shared/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          message:
            "{{from.element.types.[0]}} is not allowed to depend on {{to.element.types.[0]}}",
          // Order matters: later matching policies win.
          policies: [
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { type: ["feature", "entity", "shared"] } } },
            },
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { type: ["entity", "shared"] } } },
            },
            {
              from: { element: { type: "entity" } },
              allow: { to: { element: { type: "shared" } } },
            },
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // Forbid deep imports: outsiders use the feature/entity public API (index.ts).
            // Same-element internal imports are ignored by default.
            {
              disallow: {
                to: [
                  { element: { type: "feature", fileInternalPath: "!index.ts" } },
                  { element: { type: "entity", fileInternalPath: "!index.ts" } },
                ],
              },
              message:
                "Import '{{dependency.source}}' directly — use the public API of '{{to.element.types.[0]}}' (index.ts)",
            },
            // Forbid feature-to-feature imports, even via the public index.
            {
              from: { element: { type: "feature" } },
              disallow: { to: { element: { type: "feature" } } },
              message:
                "Feature '{{from.element.captured.feature}}' must not import feature '{{to.element.captured.feature}}'",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "documentation/**", "packages/create-expo-titan/**"],
  },
];
