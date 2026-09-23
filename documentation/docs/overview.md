---
id: overview
title: Overview
sidebar_position: 1
slug: /introduction/overview
description: A production-grade Expo boilerplate with enforced module boundaries, a normalized data layer, and native code generated from config.
---

# Overview

Most React Native/Expo projects are slowed down by having to rebuild the same foundational pieces from scratch.

But having a solid enough foundation to survive in a production environment is much more challenging than we might think. It is not simply about implementing **data caching**, building wrappers for **API calls**, setting up **routing**, or integrating popular libraries such as `Tailwind`, `React Query`, `Axios`, `Zod`, `Zustand`, and so on. These are already fundamental building blocks of most frontend projects, from web to mobile.

This template does not stop there. It aims to provide a truly **production-ready** mobile app template, where the real-world challenges of the mobile environment are considered from the very beginning: **offline handling**, a local database with `SQLite`, native modules written in `Kotlin`/`Swift`, the real application lifecycle such as **foreground**, **background**, and **cold start**, **push notifications**, **import restrictions**, and many other concerns.

This template separates all of these foundational concerns into a unified starting point, so teams do not have to spend time rebuilding the same things over and over again. Everything only needs to be set up once. Standards are enforced through tooling, and development time can be spent entirely on what truly matters: **the product logic**.

## Architecture at a glance

```
titan/
├── app.config.ts                 # typed config, variants, plugins
├── eas.json                      # development / preview / production
├── package.json
├── tsconfig.json                 # paths: "@/*" → "./src/*"
├── metro.config.js               # getDefaultConfig, no custom watchFolders
├── babel.config.js
├── eslint.config.js              # + eslint-plugin-boundaries
├── .env.example
├── .easignore
├── google-services.json          # or pulled from EAS secrets, not committed
│
├── assets/                       # icon, splash, adaptive icon (prebuild inputs)
├── plugins/                      # internal config plugins: `.js` files, import `expo/config-plugins`
│   └── with-titan-permissions.js
├── modules/                      # Expo native modules
│   └── media-pipeline/
│
├── .eas/workflows/               # CI: lint, typecheck, preview, e2e, submit
├── e2e/                          # Maestro
│   └── flows/
│
└── src/
    ├── app/                      # ONLY routes + _layout. Thin.
    ├── features/
    ├── entities/
    ├── shared/
    └── app-providers.tsx         # the single provider tree
```

Each folder has one job and a fixed place in the dependency order. [Project structure](./project-structure.md) walks through all of them.

## Related

- [Project structure](./project-structure.md)
