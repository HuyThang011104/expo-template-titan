# Titan — Expo/React Navtive boilerplate

![EAS Workflows: ci.yml](https://img.shields.io/badge/EAS%20Workflows-ci.yml-blue)
![Expo SDK 57](https://img.shields.io/badge/Expo%20SDK-57-000020)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

Scaffold a fresh app in one line (no prompts, no logins), or clone this repo as a contributor:

```bash
pnpm create expo-titan@latest MyApp
cd MyApp && pnpm start
```

Other package managers work too:

```bash
npm create expo-titan@latest MyApp
npx create-expo-titan@latest MyApp
yarn create expo-titan MyApp
bunx create-expo-titan@latest MyApp
```

## Overview

Most React Native/Expo projects are slowed down by having to rebuild the same foundational pieces from scratch.

But having a solid enough foundation to survive in a production environment is much more challenging than we might think. It is not simply about implementing **data caching**, building wrappers for **API calls**, setting up **routing**, or integrating popular libraries such as `Tailwind`, `React Query`, `Axios`, `Zod`, `Zustand`, and so on. These are already fundamental building blocks of most frontend projects, from web to mobile.

This template does not stop there. It aims to provide a truly **production-ready** mobile app template, where the real-world challenges of the mobile environment are considered from the very beginning: **offline handling**, a local database with `SQLite`, native modules written in `Kotlin`/`Swift`, the real application lifecycle such as **foreground**, **background**, and **cold start**, **push notifications**, **import restrictions**, and many other concerns.

This template separates all of these foundational concerns into a unified starting point, so teams do not have to spend time rebuilding the same things over and over again. Everything only needs to be set up once. Standards are enforced through tooling, and development time can be spent entirely on what truly matters: **the product logic**.

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm start      # web / Expo Go + mock, no EAS login needed
pnpm start:dev  # Dev Client (needs one build)
```

Cloned the repo directly? `pnpm setup` does the same non-interactively
(node/pnpm check, `.env` copy, frozen install) — safe to run twice.

On a clean machine this boots to sign-in → mock login → mock feed. No EAS
account, no real DSN, no backend.

# Project Structure

All product code lives in `src/` and is split into four folders with one-way dependencies.

```
src/
├── app/                      # ONLY routes + _layout. Thin.
├── features/
├── entities/
├── shared/
└── app-providers.tsx         # the single provider tree
```

```
app (routes)
  → features/*
    → entities/*        (Post, User, Conversation)
      → shared/*        (ui, api-client, theme, i18n, storage)
```

- `src/app` may import features, entities, and shared.
- A feature may import entities and shared. A feature never imports another feature.
- An entity may import shared. An entity never imports features.
- `shared` never imports features or entities.

## Dev Client build

```bash
# Android (APK internal, profile development):
pnpm eas:android:dev

# iOS (need Apple Developer Program + UDID, profile development-device):
pnpm eas:ios:dev
```

Then install the APK (Android) / build on device (iOS) and run `pnpm start:dev`. Daily JS changes only need
`pnpm start:dev` — rebuild native only when native libs, config, or SDK change.
iOS simulator only runs on macOS (`eas build --platform ios --profile development`).

## Requirements

- Node 22.13+
- [pnpm](https://pnpm.io) — the repo's only package manager (no npm/yarn)
- EAS CLI (`pnpm add -g eas-cli`) — only for cloud builds, not for `pnpm start`
