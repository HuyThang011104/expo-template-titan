# Changelog

## Unreleased — rename Social → Titan

Project identity renamed `social` → `titan`; social demo code untouched:

- App name `Social` → `Titan`, slug `social` → `titan`
- Bundle prefix `com.example.social` → `com.example.titan`
- Scheme base `social` → `titan` (`titan-dev`, `titan-preview`)
- Staging host `social.example` → `titan.example`
- Plugin `with-social-permissions` → `with-titan-permissions`
- Scaffolder `create-expo-social` → `create-expo-titan`
- EAS project `@huythang/social` → `@huythang/titan` (run `eas init` on your own project)

`schedules/*` history still references the old identity at build time.

## boilerplate-v1 — 2026-09-15

First open-source cut of the Expo SDK 57 template + social example.
`create-expo-social@1.0.0` published from this tag (pending `npm publish`).

Known limitations at release time:

- iOS device builds need the Apple Developer Program ($99/year) + UDID registration.
- Universal deep links need a real domain (staging default is `social.example`).
- 19 pre-existing unit-test failures on the clean tree (baseline, unrelated to O-CLI–O6).

Kernel already in place:

- Expo Router navigation with typed routes (`src/app`)
- Layered modules with enforced boundaries (`app → features → entities → shared`)
- Auth session + secure storage (SecureStore native, `localStorage` web fallback)
- React Query client, API client with mock handlers (40 posts / 8 users)
- Push registration (Expo push, post-login only, web-safe skip)
- Observability (Sentry, graceful-no-DSN), deep links + universal links
- Config plugins (`with-social-permissions`), CNG native dirs (gitignored)
- Dev Client runtime + EAS profiles (development / preview / production)
- Scaffolder `create-expo-social` (`--yes` zero-prompt defaults)
