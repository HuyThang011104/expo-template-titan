> DRAFT CONTEXT — DO NOT LINK. Sẽ xóa sau D4. Link đúng là URL /docs/... sau migrate.

# Codebase Production cho Mạng Xã Hội Mobile App

Một codebase production cho mạng xã hội không thắng ở “nhiều folder”. Nó thắng ở ranh giới module rõ, route mỏng, data layer chuẩn hóa, và quy trình native/CI mà 20 dev không đạp lên nhau.

Dưới đây là hình dạng nền tảng mình khuyên cho **Expo SDK 57 + Development Build**, đủ lớn để chạy nhiều năm, nhưng không phải monorepo 30 package ngay ngày đầu.

---

## 1. Nguyên tắc nền (quan trọng hơn cây thư mục)

1. **App là vỏ native, `src/` là sản phẩm.**  
   Expo Router chỉ chứa route + layout. Không để component, hook, API, type nằm trong `app/`. Docs Expo Router coi đó là anti-pattern.

2. **Cắt theo feature (lát dọc), không cắt theo loại file.**  
   `components/`, `hooks/`, `utils/` phình ra sẽ giết team. Feed, chat, profile phải độc lập đến mức 2 squad có thể merge song song.

3. **Một chiều phụ thuộc.**

   ```
   app (routes)
     → features/*
       → entities/*        (Post, User, Conversation)
         → shared/*        (ui, api-client, theme, i18n, storage)
           → native modules / config plugins
   ```

   Feature A không import nội bộ feature B. Nếu 2 feature cần cùng một thứ, đẩy xuống `entities` hoặc `shared`.

4. **Development Build là mặc định, không phải “giai đoạn sau”.**  
   Mạng xã hội cần camera, push, background, video, blob, custom native. `expo-dev-client` + CNG (`npx expo prebuild`) là nền. Không commit `android/` `ios/` trừ khi có lý do rất cụ thể; customize native bằng config plugin.

5. **SDK 57 cụ thể.**  
   React Native 0.86, React 19.2.3, New Architecture. Expo Router không import `@react-navigation/*`. Media dùng `expo-image` / `expo-video` / `expo-audio`, không `expo-av`. Feed dùng `@shopify/flash-list`. Token dùng `expo-secure-store`. Auth gate dùng `Stack.Protected` / `NativeTabs.Protected`.

6. **Chưa cần monorepo nếu chỉ có 1 app mobile.**  
   Monorepo hữu ích khi có app thứ hai, design system publish được, hoặc native module dùng chung. Expo hỗ trợ workspace tốt từ SDK 52+, nhưng complexity tăng ngay. Hãy thiết kế như thể sẽ extract được, rồi extract khi thật sự đau.

---

## 2. Cấu trúc repo (giai đoạn 1 — một app, production-grade)

```
titan/
├── app.config.ts                 # typed config, variants, plugins
├── eas.json                      # development / preview / production
├── package.json
├── tsconfig.json                 # paths: "@/*" → "./src/*"
├── metro.config.js               # getDefaultConfig, không tự watchFolders
├── babel.config.js
├── eslint.config.js              # + eslint-plugin-boundaries
├── .env.example
├── .easignore
├── google-services.json          # hoặc lấy từ EAS secrets, không commit
│
├── assets/                       # icon, splash, adaptive icon (input của prebuild)
├── plugins/                      # config plugins nội bộ: file `.js`, import `expo/config-plugins`
│   └── with-titan-permissions.js
├── modules/                      # Expo native modules (nếu có)
│   └── media-pipeline/
│
├── .eas/workflows/               # CI: lint, typecheck, preview, e2e, submit
├── e2e/                          # Maestro
│   └── flows/
├── docs/
│   ├── architecture.md
│   ├── module-boundaries.md
│   └── runbooks/
│
└── src/
    ├── app/                      # CHỈ route + _layout. Mỏng.
    ├── features/
    ├── entities/
    ├── shared/
    └── app-providers.tsx         # cây provider duy nhất
```

`src/app` được Expo Router ưu tiên hơn `app/` ở root. Config (`app.config.ts`, `eas.json`, `metro.config.js`) giữ ở root.

---

## 3. `src/app` — bản đồ navigation của mạng xã hội

Route là URL/deep link, không phải nơi chứa UI thật.

```
src/app/
├── _layout.tsx                   # SessionProvider, QueryClient, Theme, ...
├── +not-found.tsx
├── +native-intent.ts             # rewrite deep link cũ / universal link
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
│   │   ├── _layout.tsx           # Stack trong tab (header native)
│   │   └── index.tsx             # Feed
│   │
│   ├── (search)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   │
│   ├── (create)/                 # tab composer, hoặc chỉ mở modal
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
│       └── index.tsx             # “me”
│
├── (modals)/
│   ├── _layout.tsx               # presentation: modal / formSheet
│   ├── composer.tsx
│   ├── media-viewer.tsx
│   ├── report.tsx
│   └── share-sheet.tsx
│
└── (shared)/                     # màn hình push được từ nhiều tab
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

### Quy ước Expo Router nên giữ

- Mỗi thư mục có `_layout.tsx` nếu là navigator.
- Tab root không hiện header; header nằm ở Stack bên trong từng tab.
- Màn dùng chung (post, user) dùng shared routes / array groups ([shared-routes](https://docs.expo.dev/router/advanced/shared-routes/)) nếu cần history riêng theo tab — ví dụ `(home,search,profile)`.
- File kebab-case: `media-viewer.tsx`, không `MediaViewer.tsx`.
- Luôn có route `/`.
- Auth: `Stack.Protected guard={!!session}` cho `(app)`, `guard={!session}` cho `(auth)`. Đây là pattern chính thức từ SDK 53+, không tự `router.replace` trong `useEffect` nữa.

`src/app/(app)/_layout.tsx` chỉ làm việc này: native tabs + guard. Không fetch feed ở đây.

---

## 4. `src/features` — đơn vị làm việc của từng squad

Mỗi feature là một “mini-app” với public API hẹp.

```
src/features/
├── feed/
│   ├── index.ts                  # public exports duy nhất
│   ├── screens/
│   │   └── home-feed-screen.tsx  # được import bởi app/(home)/index.tsx
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
├── stories/                      # hoặc reels
├── moderation/                   # report, block, mute
├── auth/
└── settings/
```

Route file chỉ glue:

```tsx
// src/app/(app)/(home)/index.tsx
import { HomeFeedScreen } from "@/features/feed";

export default HomeFeedScreen;
```

Team feed không cần đụng folder chat. PR review nhìn `features/feed/**` là đủ.

`features/*/index.ts` chỉ export những gì bên ngoài được phép dùng. Cấm import `... from '@/features/feed/components/feed-item'`. Enforce bằng ESLint boundaries.

---

## 5. `src/entities` — mô hình domain dùng chung

Mạng xã hội sống chết ở cùng một `Post`/`User` xuất hiện ở feed, profile, search, push notification. Nếu mỗi feature tự định nghĩa `Post`, cache sẽ lệch, like ở feed không cập nhật profile.

```
src/entities/
├── user/
│   ├── model.ts                  # User, Handle, Relationship
│   ├── api.ts                    # GET /users/:id — thin
│   ├── queries.ts
│   ├── cache.ts                  # merge/normalize vào query cache
│   └── ui/
│       ├── avatar.tsx
│       └── user-row.tsx
├── post/
│   ├── model.ts
│   ├── api.ts
│   ├── queries.ts
│   ├── cache.ts                  # like/unlike optimistic, patch mọi list
│   └── ui/
│       ├── post-card.tsx
│       ├── post-media.tsx
│       └── post-actions.tsx
├── conversation/
└── notification/
```

- Entity được phép dùng `shared`. Entity **không** được import `features`.
- `PostCard` thuộc entity vì xuất hiện khắp nơi; `FeedList` thuộc feature vì chỉ feed mới biết pagination/timeline algorithm.

---

## 6. `src/shared` — kernel kỹ thuật

Đây là chỗ “nền tảng vững” thật sự. Viết một lần, gần như không đụng lại trừ khi đổi SDK.

```
src/shared/
├── api/
│   ├── client.ts                 # fetch wrapper, timeout, tracing
│   ├── auth-middleware.ts        # attach token, 401 → refresh
│   ├── errors.ts                 # typed ApiError
│   ├── pagination.ts             # cursor helpers
│   └── endpoints.ts              # base URL theo APP_VARIANT
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
│   ├── session-provider.tsx      # pattern Expo Router
│   ├── session.ts
│   └── biometric.ts
│
├── storage/
│   ├── secure.ts                 # expo-secure-store
│   ├── kv.ts                     # MMKV hoặc AsyncStorage (chỉ non-secret)
│   └── db/                       # expo-sqlite (offline chat/draft)
│       ├── client.ts
│       └── migrations/
│
├── media/
│   ├── image.tsx                 # wrapper expo-image
│   ├── video.tsx                 # expo-video
│   ├── picker.ts                 # expo-image-picker
│   └── upload.ts                 # resumable, background
│
├── ui/                           # design system, không business
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
│   ├── env.ts                    # EXPO_PUBLIC_* đã parse + typed
│   └── feature-flags.ts
│
├── navigation/
│   └── hrefs.ts                  # typed helpers, không rải string magic
│
├── permissions/
├── notifications/                # expo-notifications wiring
└── lib/
    ├── date.ts
    └── number.ts                 # 1.4M, 38k
```

- **Server state:** TanStack Query (hoặc tương đương).
- **Client state:** cực hẹp — session, theme, composer draft, UI ephemeral. Không nhét feed vào Redux.

### Chuẩn hóa cache là kỹ thuật then chốt

- Mỗi Post có một canonical query `['post', id]`.
- Feed/profile chỉ giữ danh sách id.
- Like 1 lần → patch entity → mọi list tự đúng.

Không làm bước này, mạng xã hội sẽ bug “tim ở feed nhưng profile chưa tim” ngay tháng thứ 3.

---

## 7. Cây provider (root layout)

`src/app/_layout.tsx` chỉ compose. Logic nằm ở `app-providers.tsx`.

Thứ tự điển hình:

1. Error boundary / Sentry
2. Theme
3. Safe area
4. SessionProvider (`expo-secure-store`)
5. SplashScreenController (giữ splash đến khi session hydrate)
6. QueryClientProvider
7. RealtimeProvider (chỉ connect khi đã login)
8. Gesture / Keyboard controller
9. Root Stack + `Stack.Protected`

Đây đúng pattern auth chính thức của Expo Router: splash đến khi auth load xong, rồi Protected quyết định `(app)` hay `(auth)`.

---

## 8. Native, variants, Development Build

### `app.config.ts` — config động theo môi trường

Ba variant, ba bundle id, cài song song trên một máy:

| Profile     | Bundle id          | API     | Mục đích                      |
| ----------- | ------------------ | ------- | ----------------------------- |
| development | `...titan.dev`     | staging | Dev Client + debugger         |
| preview     | `...titan.preview` | staging | Internal / TestFlight QA      |
| production  | `...titan`         | prod    | Store + EAS Update production |

Mỗi variant: icon khác màu, scheme deep link khác (`titan-dev://`), `runtimeVersion` policy fingerprint (SDK 52+) để OTA không gãy native.

### `eas.json` tối thiểu

- **development:** `developmentClient: true`, `distribution: internal`
- **preview:** internal, không dev client (gần prod)
- **production:** store, `autoIncrement`, `appVersionSource: remote`

Rebuild native chỉ khi: thêm native lib, đổi `app.config`, upgrade SDK. JS hàng ngày chỉ `npx expo start`.

### Config plugins, không sửa Xcode/Gradle tay

Push, camera, photo library, background upload, associated domains (Universal Links / App Links) đi qua plugin. Plugin nội bộ để trong `plugins/`. Custom Swift/Kotlin để trong `modules/` theo Expo Modules API.

`android/` `ios/` nên gitignore nếu đi CNG. Đó là cách team lớn không conflict file native.

---

## 9. Tooling buộc ranh giới (đây mới là “vững” với nhiều dev)

Không có cái này, folder đẹp cũng sụp sau 6 tháng.

| Việc                 | Công cụ                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Import xuyên feature | `eslint-plugin-boundaries` hoặc `no-restricted-imports`              |
| Type                 | `strict: true`, typed routes Expo Router                             |
| Format               | Prettier + lint-staged                                               |
| Test unit            | Jest + `@testing-library/react-native` — test query/cache/entity     |
| Test route           | Expo Router testing helpers                                          |
| E2E                  | Maestro trên EAS Workflows                                           |
| Ownership            | CODEOWNERS: `src/features/chat @chat-squad`                          |
| PR                   | typecheck + lint + unit bắt buộc; preview build / EAS Update trên PR |
| Secret               | EAS env, không commit `.env`                                         |
| Feature flag         | remote flag, không nhánh `if (user.id === ...)`                      |

Quy tắc import nên viết chết trong `docs/module-boundaries.md` và eslint phải fail CI.

```
app        → features, entities, shared
features   → entities, shared          (không → features khác)
entities   → shared
shared     → (không đi lên)
```

---

## 10. Khi nào lên monorepo

Khi xuất hiện app thứ hai hoặc package native/UI dùng lại thật sự:

```
titan/
├── apps/
│   ├── mobile/                   # Expo SDK 57 app (cây src/ như trên)
│   └── web/                      # nếu web không phải cùng Expo Router
├── packages/
│   ├── api-types/                # OpenAPI / zod schemas dùng chung BE
│   ├── ui/                       # design system
│   └── eslint-config/
├── package.json                  # workspaces: ["apps/*", "packages/*"]
└── pnpm-workspace.yaml
```

Từ SDK 54 Expo hỗ trợ isolated installs; SDK 55+ autolinking module resolution bật sẵn trong monorepo. Không được hai version `react` / `react-native` trong cùng app. Metro dùng `expo/metro-config` — đừng tự set `watchFolders` kiểu SDK cũ.

Backend không nhất thiết nằm cùng repo. Nhiều team social để API riêng (Go/Rust/Node). Client chỉ share `api-types`.

---

## 11. Stack kỹ thuật khớp SDK 57 (đừng tự invent)

| Tầng                       | Chọn                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| Routing                    | expo-router + Native Tabs + Protected routes                                 |
| List/feed                  | `@shopify/flash-list`                                                        |
| Ảnh                        | `expo-image`                                                                 |
| Video/audio                | `expo-video`, `expo-audio`                                                   |
| Gesture/anim               | `react-native-gesture-handler`, `reanimated`                                 |
| Keyboard                   | `react-native-keyboard-controller`                                           |
| Token                      | `expo-secure-store`                                                          |
| Offline/draft / chat cache | `expo-sqlite`                                                                |
| Push                       | `expo-notifications`                                                         |
| Deep link                  | associated domains + `+native-intent`                                        |
| OTA                        | EAS Update + runtime fingerprint                                             |
| Crash/perf                 | Sentry hoặc EAS Observe                                                      |
| CI                         | EAS Workflows: development build, preview update, Maestro, production submit |

Cố ý không liệt kê Redux Toolkit + 5 store middleware. Với social app, cache server + realtime invalidation giải quyết 90% state. Redux chỉ đáng nếu có workflow client cực phức tạp (composer multi-step lớn, editor).

---

## 12. Thứ tự xây nền — 6–8 tuần đầu, không viết feed ngay

1. App config variants + Dev Client chạy được trên device thật
2. Path alias, ESLint boundaries, CI typecheck/lint
3. Session + Protected routes + splash
4. API client + error model + TanStack Query + query keys
5. Entity User + Post + cache normalize
6. Design tokens + 10 primitive UI
7. Feed đọc được, like optimistic xuyên cache
8. Push + deep link vào `post/[id]`
9. Observability (mỗi screen, mỗi API failure)
10. EAS preview trên PR

Sau bước 7, team mới tách squad theo feature. Trước đó, 2–3 người dựng kernel. Kernel xấu thì 20 người chỉ nhân bản chaos.

---

## 13. Sai lầm điển hình (nhìn thấy ở hầu hết social app RN)

- `components/Post.tsx` dùng chung nhưng fetch dữ liệu bên trong → không tái sử dụng được, không test được cache.
- Toàn bộ màn hình viết trong `app/` → Router thành God folder, không chia được ownership.
- Context `AppState` chứa feed + chat + user → rerender cả app.
- Commit `ios/` `android/` rồi 5 người sửa `Info.plist`.
- Dùng Expo Go đến lúc cần push/background rồi mới Dev Client → mất 2 tuần.
- Mỗi feature tự gọi fetch không qua client → token refresh viết 8 lần.
- Không normalize Post → like/comment luôn lệch.
- Deep link chưa nghĩ từ ngày đầu → Universal Links vá sau rất đau.

---

## Thực chất “nền tảng vững” là gì

Không phải 200 folder. Là bốn hợp đồng team giữ được 2 năm:

1. **Route mỏng, feature dày, entity chuẩn hóa.**
2. **Phụ thuộc một chiều, CI chặn vi phạm.**
3. **Native sinh ra từ config (CNG), JS ship bằng EAS Update.**
4. **Session / query / realtime / media là kernel dùng chung**, không phải việc của từng màn.

---
