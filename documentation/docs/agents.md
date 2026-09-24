---
id: agents
title: AGENTS.md
sidebar_position: 3
slug: /introduction/agent-instructions
description: Working rules for agents and contributors, mirrored from the repository AGENTS.md file.
---

Source: [`AGENTS.md`](https://github.com/HuyThang011104/expo-template-titan/blob/main/AGENTS.md).

## Expo HAS CHANGED

Read the exact versioned docs at [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) before writing any code.

## What Titan is

Titan is an Expo SDK 57 production boilerplate. Social features under `src/features` are a reference vertical. The product is the kernel: thin routes, feature slices, normalized entities, one-way dependencies, config-generated native projects, and EAS Update.

Code is the source of truth for behavior. This file states the contracts that are easy to miss by reading a single folder. Explain a mechanism by reading the file that implements it. When a path below does not match the tree, follow the tree.

## Four contracts

1. Routes stay thin. Features hold product code. Entities own shared domain models and the canonical cache.
2. Dependencies point one way. CI rejects violations.
3. Native comes from config (CNG). JavaScript ships with EAS Update.
4. Session, query, realtime, and media are shared kernel, not per-screen inventions.

## Dependency rule

- `src/app` may import features, entities, and shared.
- A feature may import entities and shared.
- A feature does not import another feature, including deep paths such as `@/features/feed/components/feed-item`.
- The only public import of a feature is `@/features/<name>`.
- An entity may import shared. An entity does not import features.
- `shared` does not import features or entities.
- A concept used by two features moves down to `entities` or `shared`.

## Before editing

Read the exemplar and match it. Do not load the whole social app for a kernel change.

| Task                                         | Read                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| New screen                                   | `src/app/(app)/(home)/index.tsx`                                                                                                             |
| New feature                                  | `src/features/feed/`                                                                                                                         |
| New domain model                             | `src/entities/post/`                                                                                                                         |
| Cache update that must show on every surface | `src/entities/post/cache.ts`                                                                                                                 |
| Session and auth gate                        | `src/shared/auth/session-provider.tsx`, `src/app/(app)/_layout.tsx`                                                                          |
| API call                                     | `src/shared/api/client.ts`                                                                                                                   |
| Camera, push, upload, deep link              | `plugins/`, `src/app/+native-intent.ts`                                                                                                      |
| Remove the social sample                     | Keep `src/shared/`, `src/app-providers.tsx`, boundary lint, and variants. Remove the social feature folders and the routes that import them. |

## Hard rules

- Route files glue a screen exported from a feature. Components, hooks, API calls, and domain types stay out of `src/app`.
- `android/` and `ios/` stay uncommitted while using CNG. Customize native behavior with a config plugin in `plugins/`, or an Expo module in `modules/`.
- Expo Router code does not import `@react-navigation/*`.
- Media uses `expo-image`, `expo-video`, and `expo-audio`.
- Server state lives in TanStack Query. Client state stays narrow: session, theme, composer draft, ephemeral UI.
- A Post has one canonical query `['post', id]`. Lists hold ids. One like patches that entity, and every list follows.
- A feature does not define its own Post or User type.
- Tokens use `expo-secure-store`.
- Auth gates use `Stack.Protected` and `NativeTabs.Protected`.
- Feed lists use `@shopify/flash-list`.
- If a behavior is absent from the code, leave the gap.

## Stack

Expo SDK 57, React Native 0.86, React 19.2.3, New Architecture. Development builds are the default. Daily JavaScript uses `npx expo start`. Rebuild native only when adding a native library, changing `app.config`, or upgrading the SDK.
