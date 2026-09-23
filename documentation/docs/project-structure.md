---
id: project-structure
title: Project Structure
sidebar_position: 2
slug: /introduction/project-structure
description: The four project folders in src - app, features, entities, and shared - and their dependency rules.
---

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

---

## 1. `src/app` — routes only

Routes are URLs/deep links, not the place that holds real UI.

```
src/app/
├── _layout.tsx                   # SessionProvider, QueryClient, Theme, ...
├── +not-found.tsx
├── +native-intent.ts             # legacy deep link / universal link rewrites
│
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── forgot-password.tsx
│   └── verify-otp.tsx
│
├── (app)/
│   ├── _layout.tsx               # NativeTabs + Protected(session)
│   │
│   ├── (home)/
│   │   ├── _layout.tsx           # Stack inside tab (native header)
│   │   └── index.tsx             # Feed
│   │
│   ├── (search)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   │
│   ├── (create)/                 # composer tab, or modal-only entry
│   │   └── index.tsx
│   │
│   ├── (inbox)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # notifications
│   │   └── chats/
│   │       ├── index.tsx
│   │       └── [id].tsx
│   │
│   └── (profile)/
│       ├── _layout.tsx
│       └── index.tsx             # "me"
│
├── (modals)/
│   ├── _layout.tsx               # presentation: modal / formSheet
│   ├── composer.tsx
│   ├── media-viewer.tsx
│   ├── report.tsx
│   └── share-sheet.tsx
│
└── (shared)/                     # screens pushable from multiple tabs
    ├── post/[id].tsx
    ├── user/[handle].tsx
    ├── user/[handle]/followers.tsx
    ├── hashtag/[tag].tsx
    └── settings/
        ├── index.tsx
        ├── account.tsx
        ├── privacy.tsx
        └── notifications.tsx
```

Rules:

- Route files only glue a screen exported from a feature. Components, hooks, API calls, and domain types stay out of `src/app`.
- Every navigator folder has a `_layout.tsx`.
- Files use kebab-case: `media-viewer.tsx`, not `MediaViewer.tsx`.
- Auth gates use `Stack.Protected` and `NativeTabs.Protected`.

```tsx
// src/app/(app)/(home)/index.tsx
import { HomeFeedScreen } from "@/features/feed";

export default HomeFeedScreen;
```

---

## 2. `src/features` — product code by squad

Each feature is a "mini-app" with a narrow public API. The only public import is `@/features/<name>`.

```
src/features/
├── feed/
│   ├── index.ts                  # the only public export
│   ├── screens/
│   │   └── home-feed-screen.tsx  # imported by app/(home)/index.tsx
│   ├── components/
│   │   ├── feed-list.tsx
│   │   ├── feed-item.tsx
│   │   └── feed-skeleton.tsx
│   ├── queries/
│   │   ├── use-home-feed.ts
│   │   └── use-refresh-feed.ts
│   ├── mutations/
│   │   ├── use-like-post.ts
│   │   └── use-repost.ts
│   ├── realtime/
│   │   └── feed-invalidation.ts
│   └── analytics.ts
│
├── composer/
├── post-detail/
├── profile/
├── search/
├── chat/
├── notifications/
├── stories/                      # or reels
├── moderation/                   # report, block, mute
├── auth/
└── settings/
```

Rules:

- `features/*/index.ts` only exports what outsiders may use.
- Never import a deep path such as `@/features/feed/components/feed-item`.
- A concept used by two features moves down to `entities` or `shared`.

---

## 3. `src/entities` — shared domain models

Entities own the canonical models and cache shared by every feature. A feature never defines its own Post or User type.

```
src/entities/
├── user/
│   ├── model.ts                  # User, Handle, Relationship
│   ├── api.ts                    # GET /users/:id — thin
│   ├── queries.ts
│   ├── cache.ts                  # merge/normalize into the query cache
│   └── ui/
│       ├── avatar.tsx
│       └── user-row.tsx
├── post/
│   ├── model.ts
│   ├── api.ts
│   ├── queries.ts
│   ├── cache.ts                  # optimistic like/unlike, patch every list
│   └── ui/
│       ├── post-card.tsx
│       ├── post-media.tsx
│       └── post-actions.tsx
├── conversation/
└── notification/
```

Rules:

- Each Post has one canonical query `['post', id]`. Lists hold ids. One like patches that entity, and every list follows.
- `PostCard` belongs here because it appears everywhere; `FeedList` stays in the feature because only the feed knows pagination.
- An entity may import `shared`. It never imports `features`.

---

## 4. `src/shared` — shared kernel

Technical code used by entities and features. It contains no business logic and never imports from above.

```
src/shared/
├── api/
│   ├── client.ts                 # fetch wrapper, timeout, tracing
│   ├── auth-middleware.ts        # attach token, 401 → refresh
│   ├── errors.ts                 # typed ApiError
│   ├── pagination.ts             # cursor helpers
│   └── endpoints.ts              # base URL by APP_VARIANT
│
├── query/
│   ├── query-client.ts
│   ├── query-keys.ts             # ['posts', id], ['feed', 'home', cursor]
│   ├── persist.ts                # optional: persist cache
│   └── online-manager.ts         # NetInfo
│
├── realtime/
│   ├── socket.ts                 # 1 connection
│   ├── channels.ts
│   └── use-channel.ts
│
├── auth/
│   ├── session-provider.tsx      # Expo Router pattern
│   ├── session.ts
│   └── biometric.ts
│
├── storage/
│   ├── secure.ts                 # expo-secure-store
│   ├── kv.ts                     # MMKV or AsyncStorage (non-secret only)
│   └── db/                       # expo-sqlite (offline chat/draft)
│       ├── client.ts
│       └── migrations/
│
├── media/
│   ├── image.tsx                 # expo-image wrapper
│   ├── video.tsx                 # expo-video
│   ├── picker.ts                 # expo-image-picker
│   └── upload.ts                 # resumable, background
│
├── ui/                           # design system, no business logic
│   ├── theme/
│   │   ├── tokens.ts
│   │   ├── theme-provider.tsx
│   │   └── use-theme.ts
│   ├── button.tsx
│   ├── text.tsx
│   ├── input.tsx
│   ├── bottom-sheet.tsx
│   └── list.tsx                  # FlashList wrapper
│
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── vi.json
│       └── en.json
│
├── analytics/
│   ├── client.ts
│   └── screen-tracking.ts        # Expo Router analytics events
│
├── observability/
│   ├── sentry.ts
│   └── logger.ts
│
├── config/
│   ├── env.ts                    # parsed + typed EXPO_PUBLIC_* vars
│   └── feature-flags.ts
│
├── navigation/
│   └── hrefs.ts                  # typed helpers, no magic strings
│
├── permissions/
├── notifications/                # expo-notifications wiring
└── lib/
    ├── date.ts
    └── number.ts                 # 1.4M, 38k
```

Rules:

- Server state lives in TanStack Query. Client state stays narrow: session, theme, composer draft, ephemeral UI.
- Media uses `expo-image`, `expo-video`, and `expo-audio`.
- Feed lists use `@shopify/flash-list`.
- Tokens use `expo-secure-store`.
