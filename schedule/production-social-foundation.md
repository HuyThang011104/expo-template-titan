# Plan: Nền tảng production — mạng xã hội (Expo SDK 57)

Tài liệu này là **lịch triển khai**, không phải architecture. Đọc `docs/architecture.md` trước khi làm. Mỗi phase = một PR độc lập, merge được, review được.

- **Nền:** Expo SDK 57, React Native 0.86, React 19.2.3, New Architecture, Development Build.
- **Docs bắt buộc khi code:** [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
- **Repo hiện tại:** template `create-expo-app` (`src/app`, `src/components`). Đây là điểm xuất phát, không phải sản phẩm.

Cách dùng: đánh `[x]` khi xong. Không nhảy phase. Không viết Feed trước khi kernel (Phase 0–7) xanh.

---

## Mục tiêu / không làm

**Làm trong plan này**

- Skeleton module (`app` → `features` → `entities` → `shared`)
- Development Build + 3 app variants
- Auth gate bằng Protected routes
- API client + TanStack Query + entity `User` / `Post` (normalize cache)
- Shell navigation (tabs + stack + modal)
- Feed đọc được + like optimistic xuyên cache
- Deep link vào `post/[id]`
- CI: typecheck, lint (kèm boundary), unit test
- EAS profiles: development / preview / production

**Không làm trong plan này**

- Chat realtime đầy đủ, stories/reels, recommendation
- Backend production (dùng mock API / OpenAPI giả)
- Monorepo
- Commit thư mục `android/` `ios/` (đi CNG)
- Redux, expo-av, `@react-navigation/*`, Expo Go làm runtime chính

---

## Quy tắc cứng (mọi PR)

1. Route file trong `src/app` chỉ default-export screen từ `features/*`. Không chứa hook fetch, không chứa UI nguyên tử.
2. File kebab-case: `home-feed-screen.tsx`.
3. Import: `app` → `features` → `entities` → `shared`. Feature không import feature khác.
4. Package native: `pnpm exec expo install <pkg>` — không tự gõ version.
5. Không import `@react-navigation/*`. Dùng `expo-router` / `expo-router/stack`.
6. Media: `expo-image`, `expo-video`, `expo-audio`. List: `@shopify/flash-list`.
7. Token: `expo-secure-store`. Không nhét token vào AsyncStorage.
8. Auth: `Stack.Protected` / tab Protected — không `router.replace` trong `useEffect`.
9. `process.env.EXPO_OS` khi cần phân nhánh platform (ưu tiên hơn `Platform.OS` cho code mới).
10. Mỗi PR: `pnpm typecheck` và `pnpm lint` phải pass.

---

## Bản đồ phase

```text
0 Architecture freeze
1 Tooling + boundaries
2 Variants + Dev Client
3 Folder skeleton (migrate template)
4 Shared kernel (theme, env, log)
5 Session + Protected routes + splash
6 API client + Query
7 Entities User + Post + cache
8 Navigation shell (tabs/modals)
9 Feed read + like optimistic     ← feature đầu tiên
10 Push + deep link
11 Observability
12 EAS Workflows / CI
13 Preview update trên PR
── foundation done ──
F1 Composer
F2 Profile
F3 Search
F4 Inbox / chat
F5 Settings / moderation
```

Phase 0–8 là kernel. 9 là proof. 10–13 là ship. F\* là product, ngoài foundation.

Ước lượng 1 người full-time: **6–8 tuần** tới hết Phase 13. 2–3 người: **3–4 tuần**, không song song Phase 0–7.

---

## Phase 0 — Architecture freeze

**PR:** `docs: freeze foundation decisions`

### Việc

- [x] Đọc `docs/architecture.md`, xác nhận 6 nguyên tắc.
- [x] Viết `docs/module-boundaries.md` (copy bảng phụ thuộc ở dưới).
- [x] Viết `docs/adr/0001-single-app-not-monorepo.md` — lý do chưa monorepo.
- [x] Viết `docs/adr/0002-query-not-redux.md` — server state = TanStack Query.
- [x] Viết `docs/adr/0003-cng-dev-client.md` — CNG + Dev Client, gitignore native dirs.
- [x] Chốt bundle id / scheme (điền vào bảng, đừng để placeholder khi implement Phase 2).

| Variant     | `APP_VARIANT` | iOS bundle id                | Android package              | URL scheme       |
| ----------- | ------------- | ---------------------------- | ---------------------------- | ---------------- |
| development | `development` | `com.example.social.dev`     | `com.example.social.dev`     | `social-dev`     |
| preview     | `preview`     | `com.example.social.preview` | `com.example.social.preview` | `social-preview` |
| production  | `production`  | `com.example.social`         | `com.example.social`         | `social`         |

### `docs/module-boundaries.md` (nội dung bắt buộc)

```text
src/app            → features, entities, shared
src/features/*     → entities, shared          (KHÔNG → features khác)
src/entities/*     → shared
src/shared         → (không đi lên)

Public API của feature/entity = file index.ts.
Cấm import sâu: @/features/feed/components/feed-item
```

### Xong khi

- [x] 3 ADR merged. Bundle id đã chốt. Team biết rule import.

---

## Phase 1 — Tooling + ranh giới

**PR:** `chore: eslint boundaries, scripts, gitignore`

### Package

```bash
pnpm exec expo install --dev eslint prettier eslint-config-expo
pnpm add -D eslint-plugin-boundaries lint-staged husky
```

(Nếu `expo lint` đã kéo eslint-config-expo thì đừng cài trùng. Kiểm tra `package.json`.)

### File tạo / sửa

- [x] `eslint.config.js` — `eslint-config-expo` + plugin `boundaries`.
- [x] `.prettierrc`
- [x] `.gitignore` — thêm `android/`, `ios/`, `.env`, `*.jks`, `google-services.json` nếu chưa.
- [x] `package.json` scripts:

```json
{
  "start": "expo start --dev-client",
  "typecheck": "tsc --noEmit",
  "lint": "expo lint",
  "test": "jest --watchman=false",
  "prebuild": "expo prebuild",
  "android": "expo run:android",
  "ios": "expo run:ios"
}
```

- [x] `husky` + `lint-staged`: `*.{ts,tsx}` → `expo lint` (hoặc eslint) trên file staged.

### ESLint boundaries (ý)

```js
// elements
{ type: "app", pattern: "src/app/**" }
{ type: "feature", pattern: "src/features/*/**" }
{ type: "entity", pattern: "src/entities/*/**" }
{ type: "shared", pattern: "src/shared/**" }

// rules
app      → feature | entity | shared
feature  → entity | shared
entity   → shared
shared   → shared
```

Cấm `feature → feature`.

### Xong khi

- [x] `pnpm typecheck` pass trên template hiện tại.
- [x] `pnpm lint` pass.
- [x] Một file test cố tình `features/feed` import `features/chat` → lint fail.

---

## Phase 2 — Variants + Development Build

**PR:** `chore: app.config variants and expo-dev-client`

Chỉ native config. Chưa đụng UI.

### Package

```bash
pnpm exec expo install expo-dev-client expo-secure-store expo-notifications
pnpm add -g eas-cli   # nếu chưa có
pnpm exec eas login
pnpm exec eas build:configure
```

### File

- [x] Đổi `app.json` → `app.config.ts` (dynamic theo `APP_VARIANT`).
- [x] `eas.json` — 3 profile.
- [x] `.env.example`
- [x] `src/shared/config/env.ts` — parse `EXPO_PUBLIC_*`, throw nếu thiếu ở production.
- [x] `plugins/with-social-permissions.js` — camera, photo, notifications, associated domains (stub domain). (`.js` vì EAS CLI không load được config plugin `.ts`; code chạy qua local `expo prebuild` và EAS Build.)

### `app.config.ts` (hình dạng)

```ts
import type { ExpoConfig } from "expo/config";

const variant = process.env.APP_VARIANT ?? "development";

const ids = {
  development: "com.example.social.dev",
  preview: "com.example.social.preview",
  production: "com.example.social",
} as const;

const schemes = {
  development: "social-dev",
  preview: "social-preview",
  production: "social",
} as const;

const config: ExpoConfig = {
  name: variant === "production" ? "Social" : `Social (${variant})`,
  slug: "social",
  scheme: schemes[variant as keyof typeof schemes],
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: ids[variant as keyof typeof ids],
    supportsTablet: false,
  },
  android: {
    package: ids[variant as keyof typeof ids],
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    "expo-dev-client",
    "./plugins/with-social-permissions",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
    eas: { projectId: "REPLACE_AFTER_eas_init" },
  },
  runtimeVersion: { policy: "fingerprint" },
};

export default config;
```

Điền `projectId` sau `pnpm exec eas init`. Bundle id thay bằng giá trị Phase 0.

### `eas.json` (hình dạng)

```json
{
  "cli": { "version": ">= 16.0.1", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "env": { "APP_VARIANT": "development" },
      "ios": { "simulator": true }
    },
    "development-device": {
      "extends": "development",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "env": { "APP_VARIANT": "preview" }
    },
    "production": {
      "autoIncrement": true,
      "environment": "production",
      "env": { "APP_VARIANT": "production" }
    }
  },
  "submit": { "production": {} }
}
```

Tách `development` (simulator) và `development-device` vì iOS simulator build không cài được lên máy thật.

### Lệnh xác minh

```bash
# local native toolchain (khuyến nghị máy dev chính)
pnpm exec expo run:android
pnpm exec expo run:ios

# hoặc cloud
pnpm exec eas build --platform android --profile development
pnpm exec eas build --platform ios --profile development
```

Sau khi cài: `pnpm exec expo start --dev-client` → app mở launcher, load JS.

### Ghi chú triển khai thực tế (2026-09-10)

- EAS project: `@huythang/social`, projectId `1a434ec9-cf6b-4eb3-83ac-0aac6fa51598` — đã điền `owner` + `extra.eas.projectId` trong `app.config.ts`.
- Config plugin nội bộ phải là `.js`: EAS CLI (bản bundled) không transpile được plugin `.ts`. Plugin import `expo/config-plugins` (sub-export của `expo`), **không** cài `@expo/config-plugins` trực tiếp vì `expo-doctor` chặn.
- Android Dev Client build cloud (`--profile development`, distribution internal) đã cài và chạy trên **device thật**; không dùng emulator.
- iOS `development-device` hoãn tới khi có Apple Developer Program ($99/năm) + đăng ký UDID — internal distribution trên iOS bắt buộc tài khoản trả phí.
- `expo-doctor` 21/21 pass; `pnpm typecheck` + `pnpm lint` pass.

### Xong khi

- [x] Dev Client cài được trên device thật Android (EAS cloud; không dùng emulator — iOS hoãn tới khi có Apple account).
- [x] `app.config.ts` đổi tên app khi `APP_VARIANT=preview`.
- [x] `android/` `ios/` không nằm trong git (`pnpm exec expo prebuild` chỉ local).

---

## Phase 3 — Folder skeleton + dọn template

**PR:** `refactor: feature-sliced src skeleton`

Không thêm business. Chỉ chuyển chỗ.

### Cây đích sau PR này

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── +not-found.tsx
│   └── (app)/
│       ├── _layout.tsx              # Slot transparent (thêm ngoài cây mẫu)
│       └── (home)/
│           ├── _layout.tsx
│           └── index.tsx          # tạm re-export màn hiện tại
├── features/
│   ├── _placeholder.md            # xóa ở Phase 8
│   └── home/                      # màn tạm template (giữ route mỏng)
├── entities/
│   └── _placeholder.md
├── shared/
│   ├── ui/                        # themed-text/view đã migrate + index.ts
│   ├── api/ query/ auth/ storage/ lib/   # placeholder, implement sau
│   ├── config/env.ts              # đã có từ Phase 2
├── app-providers.tsx
└── types/
```

### Việc

- [x] Tạo `src/features`, `src/entities`, `src/shared/{ui,api,query,auth,storage,config,lib}`.
- [x] `src/app-providers.tsx` — bọc theme hiện tại; root `_layout.tsx` chỉ gọi providers + navigator.
- [x] Di chuyển primitive template (`themed-text`, `themed-view`) → `src/shared/ui/`.
- [x] Xóa / không dùng `src/components/app-tabs.tsx` sau khi NativeTabs vào Phase 8. Ở phase này có thể giữ tạm để app không vỡ.
- [x] `src/app` không còn component lạ — chỉ route.
- [x] Alias `@/*` đã trỏ `./src/*` (template đã có — xác nhận).

### Xong khi

- [x] App vẫn boot trên Dev Client.
- [x] Không file business nằm ngoài `src/`.
- [x] `pnpm typecheck` pass.

### Ghi chú triển khai thực tế (2026-09-10)

- Route mỏng đúng rule 1: `(app)/(home)/index.tsx` chỉ re-export `HomeScreen` từ `@/features/home` (màn template dời nguyên UI sang `features/home/screens/`).
- `(app)/_layout.tsx` là Slot transparent thêm ngoài cây mẫu để Stack root resolve được nhánh `(app)`; Phase 5 gắn Protected guard, Phase 8 gắn NativeTabs tại đây.
- `src/app/explore.tsx` (demo template) đã xóa; `src/components/app-tabs.tsx` giữ nguyên chưa dùng, xóa ở Phase 8.
- Fix `eslint.config.js` (Phase 1): pattern `src/features/*/**` khiến mỗi file thành element riêng → lint chặn cả import hợp lệ. Đổi về `src/features/*` / `src/entities/*`; đã verify lại: app→feature (index) pass, app→deep fail đúng message public-API, feature→feature fail.
- Verify: `pnpm typecheck` + `pnpm lint` (+ `lint:boundaries`) + `pnpm test -- --ci` pass; Metro start resolve route OK, chưa smoke-test trên device thật — confirm ở lần chạy dev tiếp theo.

---

## Phase 4 — Shared kernel (không mạng)

**PR:** `feat: theme tokens, logger, storage adapters`

### Package

```bash
pnpm exec expo install expo-secure-store expo-localization
```

(`expo-secure-store` có thể đã cài ở Phase 2.)

### File

```text
src/shared/ui/theme/tokens.ts
src/shared/ui/theme/theme-provider.tsx
src/shared/ui/theme/use-theme.ts
src/shared/ui/text.tsx
src/shared/ui/button.tsx
src/shared/ui/screen.tsx
src/shared/storage/secure.ts          # get/set/delete, web fallback
src/shared/storage/kv.ts              # non-secret (draft flags)
src/shared/observability/logger.ts    # console + redaction
src/shared/i18n/index.ts              # stub en + vi, 10 keys
src/shared/i18n/locales/en.json
src/shared/i18n/locales/vi.json
src/shared/lib/number.ts              # 1.4M / 38k
src/shared/lib/date.ts
```

### Việc

- [x] Theme tokens: color, space, radius, type. Light/dark. Không magic number trong feature.
- [x] `secure.ts` wrap `expo-secure-store`; web dùng `localStorage` (copy pattern docs Expo Router auth).
- [x] Logger không in token / password.
- [x] `Text` / `Button` dùng tokens. Feature sau này không import `StyleSheet` màu hex sống.

### Xong khi

- [x] Màn home tạm dùng `shared/ui/text` + `screen`.
- [x] Unit test `number.ts` (1_400_000 → `1.4M`).
- [x] Unit test `secure.ts` mock store.

### Ghi chú triển khai thực tế (2026-09-10)

- `expo-localization@~57.0.1` đã cài (`pnpm exec expo install`); plugin `expo-localization` chưa thêm vào `app.config.ts` (optional, runtime vẫn chạy).
- `tokens.ts` thêm `onPrimary: #ffffff` cho chữ trên nền primary (giữ invariant hex chỉ nằm ở tokens); type `Theme["color"]` là union light/dark.
- `secure.ts` đã nối `logger.warn` (thay `console.warn`), chỉ truyền `{ key }`, không truyền value/error thô.
- Test 3 suites / 13 tests xanh: `number` (5), `date` (4, expected ngày tính dynamic để không flaky theo TZ), `secure` (4: round-trip mock, key invalid, unavailable, web fallback).
- Grep DoD: hex sống trong `features/` = 0; `constants/theme` chỉ còn file deprecated/template (`themed-*`, `hooks/`, `components/*`).
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` + `pnpm test -- --ci` pass; chưa smoke-test trên device thật (dark/light toggle, secure round-trip, locale vi/en) — confirm ở lần chạy dev tiếp theo.

---

## Phase 5 — Session + Protected routes + splash

**PR:** `feat: session provider and protected auth routes`

Pattern: [Authentication in Expo Router](https://docs.expo.dev/router/advanced/authentication.md) + [Protected routes](https://docs.expo.dev/router/advanced/protected.md).

### File

```text
src/shared/auth/session-provider.tsx
src/shared/auth/use-session.ts
src/shared/auth/use-storage-state.ts
src/shared/auth/splash-screen-controller.tsx
src/features/auth/index.ts
src/features/auth/screens/sign-in-screen.tsx
src/features/auth/screens/sign-up-screen.tsx
src/app/_layout.tsx
src/app/(auth)/_layout.tsx
src/app/(auth)/sign-in.tsx
src/app/(auth)/sign-up.tsx
src/app/(app)/_layout.tsx
```

### Root navigator (ý)

```tsx
function RootNavigator() {
  const { session, isLoading } = useSession();
  if (isLoading) return null; // splash controller đang giữ native splash

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

`SplashScreen.preventAutoHideAsync()` ở module scope. `SplashScreenController` gọi `SplashScreen.hide()` khi `!isLoading`. Controller **nằm trong** `SessionProvider`.

### Việc

- [x] Session persist bằng `expo-secure-store` (key `session`).
- [x] `signIn` mock: set session `'dev-token'`. `signOut`: xóa.
- [x] Deep link `/` lúc chưa login → `sign-in`, không flicker tab.
- [x] Sau login `router.replace("/")`.
- [x] Route `(auth)/sign-in.tsx` chỉ `export { SignInScreen as default } from "@/features/auth"`.

### Xong khi

- [ ] Cold start chưa login: splash → sign-in, không thấy tabs.
- [ ] Login: vào `(app)`.
- [ ] Kill app, mở lại: vẫn login.
- [ ] Logout: về sign-in, không back được vào tab.

### Ghi chú triển khai thực tế (2026-09-10)

- Code + test xong (`pnpm typecheck` + `pnpm lint` + `lint:boundaries` + `pnpm test -- --ci` pass, 21/21). 4 mục “Xong khi” là flow device — confirm ở lần chạy dev tiếp theo.
- Thêm `@testing-library/react-native@14.0.1` (devDep): RNTL 14 `renderHook` là async, test phải `await` + bọc setter trong `act`.
- `.expo/types/router.d.ts` đang stale → màn auth dùng relative href (`../sign-up`, `../sign-in`); typegen refresh ở lần start online sau.
- Chi tiết: `schedules/plan/phase-05-session-auth.md`.

---

## Phase 6 — API client + TanStack Query

**PR:** `feat: api client and query client`

### Package

```bash
pnpm exec expo install @shopify/flash-list expo-image
pnpm add @tanstack/react-query zod
pnpm exec expo install @react-native-community/netinfo
```

(`expo-image` đã có trong template.)

### File

```text
src/shared/api/client.ts
src/shared/api/errors.ts
src/shared/api/pagination.ts          # { items, nextCursor }
src/shared/api/auth-middleware.ts     # attach Bearer, 401 → refresh mock
src/shared/query/query-client.ts
src/shared/query/query-keys.ts
src/shared/query/online-manager.ts    # NetInfo → QueryClient
src/app-providers.tsx                 # thêm QueryClientProvider
```

### `query-keys.ts` (khóa ổn định — đừng tự bịa ở feature)

```ts
export const queryKeys = {
  session: ["session"] as const,
  me: ["me"] as const,
  user: (id: string) => ["users", id] as const,
  post: (id: string) => ["posts", id] as const,
  homeFeed: (cursor?: string) => ["feed", "home", cursor ?? ""] as const,
};
```

### `client.ts` yêu cầu

- Base URL từ `env.apiUrl`.
- Timeout (abort).
- Parse JSON; lỗi → `ApiError { status, code, message }`.
- Không `any`. Response đi qua zod ở tầng entity, không ở client thô.

### Mock server (chọn 1, ghi vào ADR)

- Option A: MSW (test + dev).
- Option B: `src/shared/api/mock-handlers.ts` delay + fixture JSON.
- Option C: backend staging thật.

Khuyến nghị B cho foundation (ít tooling). Đổi C khi API sẵn.

### Việc

- [x] `QueryClient`: `staleTime` 30s default, `retry` 1, không retry 401/4xx.
- [x] Online manager: offline → pause refetch.
- [x] Test: client map 500 → `ApiError`.
- [x] Test: 401 gọi refresh một lần rồi retry.

### Xong khi

- [x] Providers có QueryClient.
- [x] Chưa có UI mạng, nhưng `client.get("/health")` chạy được với mock.

### Ghi chú triển khai thực tế (2026-09-10)

- Chốt **Option B** (`src/shared/api/mock-handlers.ts`): delay 300ms, `GET /health → { status: "ok" }`, bật tường minh qua `fetchImpl`, không override `globalThis.fetch`.
- Version cài thực tế: `@tanstack/react-query 5.102.8` (v5, đúng API plan), `zod 4.5.4` (chưa dùng — để Phase 7), `@react-native-community/netinfo 12.0.1`, `@shopify/flash-list 2.0.2` (chưa dùng — để Phase 9).
- `QueryClientProvider` bọc ngoài `SessionProvider`; auth-middleware đọc token qua `secure.ts` + `SESSION_KEY` (không qua hook). `request()` chỉ throw `ApiError`.
- Test 7 suites / 34 tests xanh (13 mới: map 500/NETWORK/TIMEOUT/PARSE, 401 refresh 1 lần + retry, defaults query-client, mock `/health` + 404).
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` pass; grep không `any`/`zod`/`console.*`, không import sâu qua `index.ts`.
- Follow-up: smoke trên device thật (tắt mạng → query pause, `/health` qua mock) — confirm ở lần chạy dev tiếp theo.
- Chi tiết: `schedules/plan/phase-06-api-client-query.md`.

---

## Phase 7 — Entities `User` + `Post` + cache normalize

**PR:** `feat: user and post entities with normalized cache`

Đây là phase quan trọng nhất của mạng xã hội. Làm xong mới được viết Feed.

### File

```text
src/entities/user/model.ts
src/entities/user/schema.ts           # zod
src/entities/user/api.ts
src/entities/user/queries.ts
src/entities/user/cache.ts
src/entities/user/ui/avatar.tsx
src/entities/user/ui/user-row.tsx
src/entities/user/index.ts

src/entities/post/model.ts
src/entities/post/schema.ts
src/entities/post/api.ts
src/entities/post/queries.ts
src/entities/post/cache.ts            # setPost, patchPost, likePost
src/entities/post/ui/post-card.tsx
src/entities/post/ui/post-actions.tsx
src/entities/post/index.ts
```

### Model tối thiểu

```ts
// user
type UserId = string;
type User = {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

// post
type PostId = string;
type Post = {
  id: PostId;
  authorId: UserId;
  body: string;
  media: { kind: "image" | "video"; url: string }[];
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};
```

Feed item trên wire: `{ post: Post, author: User }`.  
Cache:

- `queryClient.setQueryData(queryKeys.post(id), post)`
- `queryClient.setQueryData(queryKeys.user(id), user)`
- Infinite feed chỉ lưu `{ postIds: PostId[], nextCursor }` **hoặc** hydrator luôn ghi canonical post/user rồi list giữ object cũng được — **nhưng mọi like phải đi qua `patchPost`**.

### `likePost(id)` bắt buộc

1. Đọc canonical `['posts', id]`.
2. Optimistic: `likedByMe` flip, `likeCount` ±1.
3. Gọi API.
4. Rollback nếu fail.
5. Không patch từng list thủ công.

### Việc

- [ ] Zod schema fail → log, không crash UI (error boundary entity).
- [ ] `PostCard` dumb: nhận `postId`, đọc `usePost(id)` + `useUser(authorId)`.
- [ ] Test: like → canonical đổi; hai query feed giả cùng trỏ id đó đều thấy like.
- [ ] Test: like fail → rollback.

### Xong khi

- [ ] Không feature nào được tự `setQueryData` cho post trừ `entities/post/cache.ts`.
- [ ] `PostCard` render được từ fixture, không cần feed feature.

---

## Phase 8 — Navigation shell

**PR:** `feat: native tabs, stacks, modals`

Docs: [Native tabs](https://docs.expo.dev/router/advanced/native-tabs.md), [route structure](https://docs.expo.dev/router/basics/notation.md). Import NativeTabs theo **đúng SDK 57** (kiểm tra `expo-router/unstable-native-tabs` vs export ổn định tại thời điểm code).

### Cây `src/app` đích

```text
src/app/
├── _layout.tsx
├── +not-found.tsx
├── +native-intent.ts                 # identity rewrite, Phase 10 mở rộng
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (app)/
│   ├── _layout.tsx                   # NativeTabs, headerShown false
│   ├── (home)/
│   │   ├── _layout.tsx               # Stack
│   │   └── index.tsx
│   ├── (search)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── (create)/
│   │   └── index.tsx                 # redirect/open modal composer
│   ├── (inbox)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── chats/
│   │       ├── index.tsx
│   │       └── [id].tsx
│   └── (profile)/
│       ├── _layout.tsx
│       └── index.tsx
├── (modals)/
│   ├── _layout.tsx                   # formSheet / modal
│   ├── composer.tsx
│   └── media-viewer.tsx
└── (shared)/
    ├── post/[id].tsx
    └── user/[handle].tsx
```

### Việc

- [x] Mỗi tab: Stack bên trong, title native (`Stack.Screen options.title`).
- [x] Tab Create: không stack giả — intercept `tabPress` (`disabled` + listener, xem ghi chú) mở `/(modals)/composer` (`presentation: "formSheet"`).
- [x] Placeholder screen trong `src/features/{feed,search,composer,inbox,profile,post-detail}/screens/*-screen.tsx` — text + token, chưa fetch (`post-detail` đọc `PostCard` entity).
- [x] `+not-found.tsx` có `Link` về `/`.
- [x] Typed routes: `pnpm exec expo customize tsconfig` / typed routes experiment đã bật.
- [x] Xóa `src/components/app-tabs.tsx` (template).

### Shared post/user

Nếu cần history theo tab, dùng array group `(home,search,profile)` theo docs shared routes. Nếu chưa cần, `(shared)/post/[id]` push từ root stack cũng đủ cho foundation.

### Xong khi

- [ ] 5 tab native hiện đúng.
- [ ] Chưa login không thấy tab.
- [ ] Mở composer sheet, dismiss về tab cũ.
- [ ] `/post/abc` (đã login) không crash (màn placeholder).

### Ghi chú triển khai thực tế (2026-09-10)

- Import đúng SDK 57: `expo-router/unstable-native-tabs` (không có export ổn định ở SDK 57), compound `NativeTabs.Trigger.{Label,Icon}` — verify từ `node_modules` + docs versioned.
- Hiệu chỉnh so với plan: tab Create dùng `disabled` + `tabPress` listener (`router.push("/composer")`); event `tabPress` của NativeTabs **không** có `preventDefault` (typecheck xác minh) — plan đã sửa khớp.
- Root `_layout.tsx`: `(modals)` + `(shared)` nằm trong `Stack.Protected guard={!!session}`; `presentation` set per-screen (`composer` formSheet, `media-viewer` modal).
- `media-viewer` gán cho `features/post-detail`; nút sign out giữ ở `ProfileScreen` (không mất đường logout khi xóa template).
- Xóa `app-tabs*.tsx`, `features/home/`, `features/_placeholder.md`; `.expo/types/router.d.ts` regen bằng `expo start --dev-client --offline`.
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` pass. 4 mục "Xong khi" là flow device — confirm ở lần chạy dev tiếp theo.
- Chi tiết: `schedules/plan/phase-08-navigation-shell.md`.

---

## Phase 9 — Feed đọc + like optimistic

**PR:** `feat: home feed`

### Package

```bash
pnpm exec expo install @shopify/flash-list
```

### File

```text
src/features/feed/index.ts
src/features/feed/screens/home-feed-screen.tsx
src/features/feed/components/feed-list.tsx
src/features/feed/components/feed-skeleton.tsx
src/features/feed/queries/use-home-feed.ts
src/features/feed/analytics.ts
src/app/(app)/(home)/index.tsx        # re-export HomeFeedScreen
```

### Việc

- [x] `useInfiniteQuery` cursor. `queryFn` gọi `entities/post` + `entities/user` hydrator, return `{ postIds, nextCursor }`.
- [x] `FlashList`, `keyExtractor=postId` (`estimatedItemSize` không còn ở FlashList v2 — xem ghi chú).
- [x] Pull-to-refresh. Footer loading. Empty state. Error + retry.
- [x] `PostCard` + like đi `entities/post/cache.likePost`.
- [x] `Link` tới `/(shared)/post/[id]` (href typed). Prefetch `queryKeys.post(id)` on press in.
- [x] Không `ScrollView` map 100 post.

### Mock feed

- 40 post, 8 user, cursor page 10.
- 1 post video (placeholder `expo-video` hoặc image-only nếu video để F-phase). Foundation: image là đủ.

### Xong khi

- [ ] Feed scroll 40 item không freeze trên device tầm trung.
- [ ] Like trên feed; mở detail (dù placeholder đọc `usePost`) vẫn liked.
- [ ] Unlike rollback khi mock API fail (force fail 1 id).
- [x] Unit test `use-home-feed` hydrator.

### Ghi chú triển khai thực tế (2026-09-10)

- Mock feed trong `mock-handlers.ts`: generator deterministic 40 post / 8 user / page 10 (`post-fail` ở index 7 để test rollback ngay trang đầu, 1 post video ở index 4); thêm `requestQuery` parse cursor; `/posts/:id` + endpoint like cũng thấy feed posts (detail/like từ feed dùng chung mock).
- `useHomeFeed` (`useInfiniteQuery`, key `queryKeys.homeFeed()`): parse từng wire item (`parseFeedWireItem`, fail → skip) → `hydrateFeedItem` → `{ postIds, nextCursor }`; list chỉ giữ `postIds`; like/prefetch qua canonical Phase 7.
- Lệch text foundation: FlashList v2.0.2 **không còn** `estimatedItemSize` (tự đo layout, verify `FlashListProps.d.ts`); chỉ dùng `keyExtractor=postId`.
- `entities/post/index.ts` mở thêm `parseFeedWireItem` (parse fn, đúng ý plan Phase 7).
- Test 5 cases xanh (hydrate canonical, 40 item/4 trang + hết trang, like flip xuyên cache, rollback `post-fail`, prefetch); full suite 13/62 pass.
- Caveat: nút like lồng trong card bọc `Link` nổi bọt navigation (RN không stopPropagation) — chấp nhận ở foundation, F-phase tách affordance nếu cần.
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` pass. 3 mục "Xong khi" còn lại là flow device — confirm ở lần chạy dev tiếp theo (trên device feed gọi `env.apiUrl` thật nên hiện error + retry tới khi có staging).
- Chi tiết: `schedules/plan/phase-09-home-feed.md`.

---

## Phase 10 — Push + deep link

**PR:** `feat: notifications and universal links`

### File

```text
src/shared/notifications/register.ts
src/shared/notifications/handlers.ts
src/app/+native-intent.ts
src/shared/navigation/hrefs.ts
```

### Việc

- [x] Xin quyền notification chỉ sau login.
- [x] Lưu Expo push token lên mock API `POST /devices`.
- [x] Handler: payload `{ type: "post", id }` → `router.push(hrefs.post(id))`.
- [x] `+native-intent.ts`: `redirectSystemPath` map `https://social.example/p/{id}` → `/post/{id}`. Lỗi → return path gốc, bọc try/catch.
- [x] `app.config.ts`: `ios.associatedDomains`, `android.intentFilters` (domain staging).
- [x] Scheme local: `social-dev://post/abc` mở đúng màn (đã login).

### Xong khi

- [ ] Simulator: `pnpm exec uri-scheme open "social-dev://post/abc" --ios` vào detail.
- [ ] Chưa login + deep link post → sign-in, sau login **cố gắng** restore (nếu tốn thì ghi follow-up; tối thiểu không crash).

### Ghi chú triển khai thực tế (2026-09-10)

- Mới: `src/shared/navigation/` (`hrefs.ts` object-href typed `{ pathname: "/post/[id]", params }` theo mẫu feed-list, `deep-links.ts` pure `rewriteUniversalPath` + test, `index.ts`).
- Mới: `src/shared/notifications/` (`register.ts` channel Android → quyền → token → `POST /devices`, không throw/không log token thô; `handlers.ts` parse `{ type: "post", id }` (+ fallback `data.url`), queue href khi chưa login, flush sau login; `notifications-bootstrap.tsx` mount trong `SessionProvider`, đăng ký 1 lần/phiên login).
- `+native-intent.ts` thành wrapper mỏng gọi `rewriteUniversalPath` (logic + test nằm ở shared để tránh vi phạm boundary shared→app).
- `app.config.ts` khai báo `associatedDomains` + `intentFilters` (4 prefix `/p/`, `/post/`, `/u/`, `/user/`); plugin `with-social-permissions.js` chuyển thành dedupe.
- Mock `POST /devices → { ok: true }` trong `mock-handlers.ts`; `NotificationsBootstrap` mount trong `app-providers.tsx` (route files giữ mỏng).
- Không package mới (`expo-notifications`, `expo-device`, `expo-linking` đã có). `expo config --type public` resolve đúng domains/filters.
- Caveat test: `process.env.EXPO_OS` bị babel-preset-expo inline lúc compile nên UT không đổi bằng runtime mutation — nhánh web/Android cover qua pure helpers `isPushSupportedPlatform`/`needsAndroidChannel` (ghi chú trong test).
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` pass; full suite 16/90 pass (mới 3 suites / 28 tests). 2 mục "Xong khi" là flow device — confirm ở lần chạy dev tiếp theo.

---

## Phase 11 — Observability

**PR:** `feat: sentry and screen tracking`

### Package (chọn 1, ghi ADR)

```bash
pnpm exec expo install @sentry/react-native
# hoặc EAS Observe khi team đã chốt
```

### Việc

- [x] Init Sentry trong `app-providers`, DSN từ env, không hardcode.
- [x] Session user id (không PII) sau login.
- [x] Screen tracking: Expo Router `unstable_navigationEvents` hoặc pattern [screen tracking](https://docs.expo.dev/router/reference/screen-tracking.md).
- [x] `logger.error` forward Sentry.
- [x] Source map upload trên EAS production (cấu hình, chưa cần chạy thật nếu chưa có DSN).

### Xong khi

- [ ] Cố tình `throw` trên 1 màn hidden dev → event hiện trên dashboard (hoặc log “would send” nếu chưa có DSN).

### Ghi chú triển khai thực tế (2026-09-11)

- Chốt `@sentry/react-native ~7.11.0` (`pnpm exec expo install`), ghi ADR `0004-sentry-observability.md` (chưa EAS Observe).
- Mới: `src/shared/observability/` (`sentry.ts` init lazy-`require` + disabled "would send", `screen-tracking.tsx` theo pattern `usePathname` + `useGlobalSearchParams`, `observability-bootstrap.tsx` gắn user id + tracking trong `SessionProvider`, `index.ts` public API).
- `logger.error` forward Sentry với extra đã redact (một chiều `logger → sentry`, không cycle); `mapSessionToUserId` map mock `'dev-token'` → `'dev-user'`, không gửi token/PII thô.
- `app.config.ts` thêm plugin `@sentry/react-native/expo` (org/project/token qua env `SENTRY_*`, không hardcode); script `sentry:sourcemaps` cho EAS Update (`eas update && pnpm sentry:sourcemaps`).
- Màn hidden `(shared)/dev-crash.tsx` + feature `dev-crash` (nút throw chỉ `__DEV__`, không link từ tab nào).
- Chưa DSN nên verify ở mode "would send" (test + `console.debug` khi `__DEV__`); mục "Xong khi" cần DSN thật + dashboard — confirm khi có DSN.
- Verify: `pnpm typecheck` + `pnpm lint` + `lint:boundaries` pass; full suite 17/102 pass (mới 1 suite / 12 tests); `expo-doctor` 21/21 pass; `expo config --type public` resolve đúng plugin.

---

## Phase 12 — EAS Workflows / CI

**PR:** `ci: typecheck lint test and development builds`

### File

```text
.eas/workflows/ci.yml
.eas/workflows/development-builds.yml
e2e/flows/auth-and-feed.yaml          # Maestro, happy path
```

### Job tối thiểu (mỗi PR)

1. install (lockfile): `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test -- --ci`

### Job nightly / main

- `pnpm exec eas build --profile development` Android + iOS simulator khi native config đổi (fingerprint / `app.config` / package native).

### Maestro (1 flow)

1. Boot
2. Sign in (mock)
3. Thấy feed item
4. Tap like

### Xong khi

- [ ] PR trắng (docs) vẫn chạy CI < 5 phút.
- [ ] Cố tình import xuyên feature → CI đỏ.

### Ghi chú triển khai thực tế (2026-09-11)

- Mới: `.eas/workflows/ci.yml` (custom job `quality`: checkout → install frozen → `typecheck` → `lint` → `lint:boundaries` → `test -- --ci`; trigger PR mọi branch + push main; `concurrency.cancel_in_progress`; `defaults.tools` node 22 + pnpm 9 theo lockfileVersion 9) và `.eas/workflows/development-builds.yml` (2 job `type: build` song song Android + iOS simulator, profile `development`; trigger push main lọc paths native config + cron nightly `0 2 * * *`).
- Mới: `e2e/flows/auth-and-feed.yaml` (Maestro: `launchApp clearState` → tap `sign-in-button` → đợi `feed-list` 30s → assert `post-card-feed-p-1` → tap `like-button-feed-p-1`; `appId: com.example.social.dev`; tiền đề API phục vụ `/feed/home`, id item đầu theo mock deterministic).
- `eas.json` thêm profile `e2e-test` (`withoutCredentials`, iOS simulator, Android apk) theo mẫu docs EAS — điều kiện để flow Maestro chạy được trên CI sau này.
- Wire testID ổn định cho flow (không đổi UI/logic): `FlashList testID="feed-list"`, `PostCard testID="post-card-<id>"`, `PostActions testID="like-button-<id>"`, nút Retry feed `testID="feed-retry-button"` (sign-in đã có `sign-in-button`).
- Verify local: `eas workflow:validate` pass cả 2 workflow; YAML parse đúng shape; `pnpm typecheck` + `pnpm lint` + `lint:boundaries` + `pnpm test -- --ci` pass (17 suites / 102 tests); probe import `feed → auth` fail đúng rule boundaries (CI đỏ). 2 mục "Xong khi" cần chạy thật trên EAS dashboard — confirm khi PR đầu tiên chạy workflow.

---

## Phase 13 — Preview update trên PR

**PR:** `ci: eas update preview per pull request`

### Việc

- [x] Channel `preview`.
- [x] Workflow: PR opened/sync → `pnpm exec eas update --channel preview --message "pr-$N"`.
- [x] Comment bot: QR / link Orbit.
- [x] Runtime `fingerprint` — JS update không gửi tới binary lệch native.

### Xong khi

- [ ] QA mở preview build, load update của PR, thấy thay đổi JS không rebuild native.

### Ghi chú triển khai thực tế (2026-09-11)

- Cài `expo-updates@~57.0.21` (`pnpm exec expo install expo-updates`, đúng rule 4).
- `app.config.ts` thêm `updates.url: https://u.expo.dev/<projectId>` (tương đương `eas update:configure`, làm thủ công vì lệnh cần login interactive); `runtimeVersion: { policy: "fingerprint" }` đã có từ Phase 2 — update JS chỉ tới binary khớp native.
- `eas.json`: `preview` thêm `"channel": "preview"`, `production` thêm `"channel": "production"` (đúng mẫu docs `eas update:configure`); `development`/`development-device`/`e2e-test` giữ nguyên (dev build load update qua Extensions tab, không qua channel).
- Mới: `.eas/workflows/pr-preview.yml` (job `update` channel `preview`, `environment: preview`, `message: "pr-<PR number>"` — tương đương `eas update --channel preview --message "pr-$N"`; job `github-comment` auto-discovery post link + QR Orbit; `concurrency.cancel_in_progress` để sync mới hủy update cũ; `defaults.tools` node 22 + pnpm 9 đồng bộ `ci.yml`).
- Sourcemap Sentry: job `update` mặc định tự thử upload khi thấy `@sentry/react-native` (Phase 11), không set tường minh.
- Verify: `eas workflow:validate` pass cả 3 workflow; `expo config --type public` resolve đúng `updates.url` + `runtimeVersion`; `pnpm typecheck` + `pnpm lint` + `lint:boundaries` + `pnpm test -- --ci` pass (17 suites / 102 tests); `expo-doctor` 21/21 pass.
- Mục "Xong khi" cần chạy thật: cài preview build 1 lần (`eas build --profile preview`), mở PR → QA load update qua Orbit — confirm khi PR đầu tiên chạy workflow (lưu ý workflow đọc từ default branch).

---

## Definition of Done — foundation

Foundation xong khi **tất cả** đúng:

- [ ] Dev Client, 3 variants, không commit `android/` `ios/`
- [ ] Protected auth, session secure store, splash không flicker
- [ ] ESLint boundaries fail CI nếu feature import feature
- [ ] `User` / `Post` canonical cache; like xuyên list
- [ ] Native tabs + composer sheet + `post/[id]` + `user/[handle]`
- [ ] Feed FlashList + pull-to-refresh + empty/error
- [ ] Deep link scheme local
- [ ] typecheck, lint, unit test trên CI
- [ ] EAS development + preview profiles chạy được ít nhất 1 lần

Khi đó mới mở F1–F5.

---

## Feature phases (sau foundation)

Mỗi feature một PR series, **không** phá kernel.

| ID  | Feature                        | Phụ thuộc                        | Ghi chú                               |
| --- | ------------------------------ | -------------------------------- | ------------------------------------- |
| F1  | Composer                       | entity Post, modal, image picker | `expo-image-picker`, upload stub      |
| F2  | Profile (me + `user/[handle]`) | entity User/Post                 | grid/list cùng `PostCard`             |
| F3  | Search                         | entity User/Post                 | `headerSearchBarOptions`              |
| F4  | Chat                           | entity Conversation (tạo mới)    | `expo-sqlite` draft + socket stub     |
| F5  | Notifications inbox            | push Phase 10                    | list + mark read                      |
| F6  | Moderation                     | report modal                     | block/mute → entity User relationship |
| F7  | Video in feed                  | `expo-video`                     | recycle player, không autoplay nhiều  |
| F8  | i18n đầy đủ                    | Phase 4 stub                     | không hardcode string UI              |

Khi **app thứ hai** hoặc design system publish được: ADR mới “extract monorepo”, không làm sớm.

---

## Danh sách package (cài đúng phase, đúng lệnh)

| Phase | Lệnh                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| 1     | `pnpm exec expo install --dev eslint prettier eslint-config-expo` + `pnpm add -D eslint-plugin-boundaries`          |
| 2     | `pnpm exec expo install expo-dev-client expo-secure-store expo-notifications`                                       |
| 4     | `pnpm exec expo install expo-localization`                                                                          |
| 6     | `pnpm exec expo install @shopify/flash-list @react-native-community/netinfo` + `pnpm add @tanstack/react-query zod` |
| 9     | FlashList nếu chưa                                                                                                  |
| 10    | notifications đã có; `pnpm exec expo install expo-linking` (template đã có)                                         |
| 11    | `pnpm exec expo install @sentry/react-native`                                                                       |
| F1    | `pnpm exec expo install expo-image-picker expo-file-system`                                                         |
| F4    | `pnpm exec expo install expo-sqlite`                                                                                |
| F7    | `pnpm exec expo install expo-video expo-audio`                                                                      |

Không cài `expo-av`. Không cài `@react-navigation/native`.

---

## Ownership gợi ý (CODEOWNERS)

```text
/src/shared/              @platform
/src/entities/            @platform
/src/app/                 @platform
/src/features/feed/       @feed
/src/features/chat/       @chat
/src/features/auth/       @platform
/app.config.ts            @platform
/eas.json                 @platform
/plugins/                 @platform
```

Tạo file này ở Phase 12 nếu repo đã có GitHub/GitLab org.

---

## Rủi ro

| Rủi ro                          | Xử lý                                                                       |
| ------------------------------- | --------------------------------------------------------------------------- |
| NativeTabs API đổi giữa SDK     | Chỉ đọc docs v57 lúc implement Phase 8, không copy blog cũ                  |
| Isolated installs (pnpm)        | SDK 57 ổn; nếu native duplicate → `experiments.autolinkingModuleResolution` |
| Deep link chưa login mất intent | Ghi queue trong session provider (follow-up nếu Phase 10 chưa làm kịp)      |
| Feed jank                       | FlashList + ảnh `expo-image` + không logic nặng trong render item           |
| Team đạp boundary               | ESLint + CODEOWNERS, không tin convention                                   |

---

## Checklist kickoff (ngày 1)

- [ ] Node 22.13+ (SDK 57 yêu cầu)
- [ ] `pnpm exec expo --version` trong project
- [ ] EAS account + `pnpm exec eas login`
- [ ] Android Studio **hoặc** EAS Build cloud
- [ ] Xcode 26.4+ nếu build iOS local (SDK 57)
- [ ] Đọc `docs/architecture.md` + plan này
- [ ] Mở Phase 0, không commit feature feed trước Phase 9
