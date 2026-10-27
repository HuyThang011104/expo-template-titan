# Plan UI — Design System (P1 → P4)

> Spec: `docs/design-system.md` v1.1 (Approved) — file này **không thay đổi quyết định** trong spec.
> File này là kế hoạch thi công: chia PR, thứ tự phụ thuộc, file chạm, cách verify, trạng thái.
> Mỗi mục `P*.x` = **1 PR độc lập**. Không gộp 2 mục vào một PR.
> Khi code khác spec, ghi vào §8 (quyết định) rồi sửa spec ở PR riêng — không sửa spec trong PR feature.

## 0. Hiện trạng (đối chiếu code, 2026-10-26)

| Hạng mục | Trạng thái thật trong code |
|---|---|
| `theme/tokens.ts` | Chỉ 8 color role/scheme (`text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary`, `primary`, `onPrimary`, `danger`). Không có primitive/semantic, không elevation/motion/iconSize/breakpoint |
| `Theme` type | `name`, `color`, `space`, `radius`, `type` — thiếu `icon`, `elevation`, `motion` |
| Typography | 5 variant legacy: `title` 48, `subtitle` 32, `body` 16/500, `small`, `caption` |
| `Text` | Nhận 5 variant legacy + `link`; màu lấy `theme.color.text` |
| `Button` | 3 variant (`primary/secondary/ghost`), 2 size (`sm 36/md 44`), không icon, không `outline/danger/lg/fullWidth` |
| `Input` | Label + error inline; chưa có `Field`, `TextArea`, leading/trailing icon, counter |
| `Avatar` | Ở `entities/user/ui/avatar.tsx`, size 32 / 40 / 48 |
| `ThemedText`/`ThemedView` | Chỉ còn `features/showcase` import (3 file) |
| `Screen` | Không có tín hiệu header; ~66 call site `<Screen`, đa số dùng default edges = cả 4 cạnh → double top padding dưới native header |
| Icon | Chưa có `Icon`/`icon-map`. `expo-symbols` đã cài (SDK 57 hỗ trợ iOS SF Symbols + Android/web Material Symbols qua `name={{ ios, android, web }}`) |
| Design Lab | Chưa có route. `(shared)/showcase` vẫn còn |
| Navigation | `(shared)/_layout` đang `headerShown: false`; settings stack tự khai `title` nhưng chưa dùng factory; `app-providers` vẫn dùng `DefaultTheme/DarkTheme` |
| NativeTabs | Chưa có badge; `useInbox().unreadCount` đã có sẵn |
| Hardcode | Hex chỉ còn 2 file (`chat/presence-dot.tsx`, `showcase/animated-icon.tsx`); `fontSize/fontWeight` rải ở 21 file features/entities |
| Guard | Chưa có `check:tokens`; CI chỉ chạy `typecheck + lint:boundaries + test` |
| Settings 7.9 | Route/layout/hrefs đã migrate; còn `headerRight` entry point, `headerOptions`, back-stack QA |
| Maestro | 13 flow trong `e2e/flows/` — đổi `testID`/route phải sửa flow cùng PR |

## 1. Nguyên tắc thi công

1. **Tầng dưới trước**: token → icon → primitive → component → navigation → screen.
2. **Không phá public API**: giữ export cũ + alias, đánh dấu `@deprecated`, xóa khi `rg` hết usage.
3. **Không đổi `testID`** hiện có; nếu buộc đổi, sửa Maestro cùng PR.
4. **Không thêm dependency UI** mới (ngoài `expo-symbols` đã có).
5. Mỗi PR phải xanh:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm exec eslint .
   pnpm test -- --ci
   ```
6. PR UI phải có ảnh light + dark ở 360–430pt. PR token/component phải thêm vào Design Lab cùng PR.
7. **Không build speculative**: component chỉ tạo khi có ≥2 nơi dùng hoặc là nền tảng (governance spec §14.1). Chip/Dialog/Toast/SectionHeader/Switch làm just-in-time ở P2/P3, không làm trước.

## 2. Thứ tự và phụ thuộc

```text
P1.1 Tokens
  ├─ P1.2 Icon
  ├─ P1.3 Primitives
  │    └─ P1.4 Components A ──> P1.5 Components B
  └─ P2.1 Nav theme + header factory   (cần P1.2 cho headerRight)

P1.6 Design Lab + guard                (bắt đầu sau P1.2, chốt cuối P1)

P2.1 ──> P2.2 Shared header ──> P2.3 Screen edges ──> P2.4 Tab badge
P1.5 ──> P2.5 States adoption ──> P2.6 Templates ──> P2.7 Settings/back QA
P2.x ──> P3 redesign (8 PR) ──> P4 polish
```

Lý do: chưa có semantic token thì mọi component/screen buộc phải hardcode màu; chưa có `Icon`/`IconButton` thì `headerRight` và `ListItem` không làm được; chưa có `Screen edges` thì mọi ảnh header đều sai padding.

## 3. P1 — Foundation

### P1.1 Tokens v2

**Tạo**
```text
src/shared/ui/theme/primitive.ts      # palette đúng spec 4.1.1, chỉ export `palette`
src/shared/ui/theme/semantic.ts       # semantic.light/.dark, 26 role đúng spec 4.1.2
src/shared/ui/theme/__tests__/tokens.test.tsx
```

**Sửa**
```text
src/shared/ui/theme/tokens.ts          # re-export + alias tương thích
src/shared/ui/theme/theme-provider.tsx # thêm icon/elevation/motion/breakpoint vào Theme
src/shared/ui/index.ts                 # export type mới; KHÔNG export `palette`
```

**Contract**

- `semantic.light` và `semantic.dark` phải **cùng key set**; test assert key parity.
- `colors` export cũ giữ nguyên shape `colors.light/.dark` bằng cách map legacy → semantic:
  `text → textPrimary`, `background → background`, `backgroundElement → surfaceMuted`,
  `backgroundSelected → borderStrong`, `textSecondary → textSecondary`, `primary → primary`,
  `onPrimary → onPrimary`, `danger → danger`. Thêm `textPrimary/...` vào cùng object.
- `space`: numeric `0,1,2,3,4,5,6,8,10,12,16` **cộng** alias `xs,sm,md,lg,xl` (giá trị như spec §4.2). Không đổi số của alias.
- `radius`: thêm `none/xs/xl`, giữ `sm/md/lg/full`.
- `typography`: thêm `display,h1,h2,h3,bodyStrong,label,labelStrong,overline`; giữ legacy `title/subtitle/small` **nguyên kích thước cũ** ở P1.1 để không đổi visual (xem §8-Q2). `body` legacy giữ `16/24/500`; `body` mới theo spec là `16/24/400` → đặt tên nội bộ rõ ràng để không đá nhau.
- Thêm `iconSize`, `elevation` (iOS shadow + Android elevation), `motion`, `breakpoint`, `layout` (content 640, feed 600).
- `useTheme()` giữ nguyên signature; chỉ thêm field.

**Xong khi**
- [x] App boot; diff visual đúng như spec: `primary` đổi sang `#2A72DB` (light) / `#6AA6FF` (dark), `text` mềm hơn (`textPrimary`), `backgroundElement`/`backgroundSelected` dịch nhẹ sang `surfaceMuted`/`borderStrong`. `body` weight vẫn 500 (chưa đổi ở P1).
- [x] Test key parity + legacy alias pass (`tokens.test.tsx`).
- [x] `rg "palette" src/features src/entities` = 0.

**Rủi ro**: `ThemeColorName` mở rộng; nếu định nghĩa bằng `keyof typeof colors.light` thì tự nhận cả legacy + mới — kiểm tra `Text color=` vẫn typecheck.

---

### P1.2 Icon

**Tạo**
```text
src/shared/ui/icons/icon-map.ts   # 27 semantic name đúng spec 4.7 -> { ios, android, web }
src/shared/ui/icons/icon.tsx      # wrap expo-symbols SymbolView
src/shared/ui/icons/index.ts
src/shared/ui/icons/__tests__/icon-map.test.tsx
```

**Contract**

- `name` của `SymbolView` **phải là object** `{ ios, android, web }`; truyền string chỉ render iOS (theo docs SDK 57).
- `IconProps = { name: IconName; size?: "sm"|"md"|"lg"|"xl"; color?: ThemeColorName; accessibilityLabel?: string; style? }`.
- `color` resolve qua `useTheme().color`; default `textSecondary` hoặc `textPrimary` — chốt 1, ghi trong component.
- Icon-only **bắt buộc** `accessibilityLabel`; dev warn nếu thiếu.
- `expo-symbols` là **beta**: không nâng version trong P1; không dùng prop iOS-only (`type`, `scale`, `colors`) cho Android.
- Không thêm `@expo/vector-icons`.

**Xong khi**
- [x] Test: mọi `IconName` có đủ 3 key, không rỗng.
- [x] Render test mock `expo-symbols` (jest-expo) pass.
- [x] Icon đã thêm vào Design Lab (P1.6) — nếu lab chưa có, thêm tạm route ở P1.6 cùng PR.

---

### P1.3 Primitives + Text

**Tạo**
```text
src/shared/ui/primitives/box.tsx
src/shared/ui/primitives/stack.tsx      # Column + Row + gap
src/shared/ui/primitives/pressable.tsx
src/shared/ui/primitives/divider.tsx
src/shared/ui/primitives/spinner.tsx
src/shared/ui/primitives/skeleton.tsx   # pulse, tôn trọng reduce motion
src/shared/ui/primitives/index.ts
```

**Sửa**
```text
src/shared/ui/text.tsx   # variant mới, màu semantic, legacy map @deprecated
```

**Contract**

- `Stack`/`Row` nhận `gap` là key của `space`, `padding*` cũng là key token; không nhận số lẻ.
- `Skeleton` dùng `useReducedMotion` (Reanimated đã có) → tắt pulse; màu `skeleton`.
- `Text` thêm `display/h1/h2/h3/bodyStrong/label/labelStrong/overline`; legacy `title/subtitle/small/caption` giữ size cũ, map sang token mới khi migrate từng màn ở P3.
- `Skeleton` thay `features/feed/components/feed-skeleton.tsx` **chưa làm ở P1** — chỉ tạo primitive; thay ở P3 (tránh PR trộn).

**Xong khi**
- [x] Primitives render light/dark, có `testID` khi cần.
- [x] `Text` legacy không đổi pixel so với trước (chụp 1 màn đối chiếu).
- [x] `Skeleton` test với reduce-motion on/off.

---

### P1.4 Components A

**Tạo**
```text
src/shared/ui/components/button.tsx        # hoặc nâng cấp tại chỗ rồi re-export
src/shared/ui/components/icon-button.tsx
src/shared/ui/components/input.tsx
src/shared/ui/components/text-area.tsx
src/shared/ui/components/field.tsx
src/shared/ui/components/avatar.tsx
src/shared/ui/components/index.ts
```

**Sửa**
```text
src/entities/user/ui/avatar.tsx   # -> re-export từ shared, giữ import path cũ
```

**Contract**

- `Button`: thêm `outline`, `danger`, size `lg`; `icon?: IconName`, `iconPosition?: "left"|"right"`, `fullWidth?`, `accessibilityLabel?`; giữ `title`, `variant`, `size`, `disabled`, `loading`, `style`, `testID`. Loading **giữ nguyên kích thước**.
- `IconButton`: `icon`, `accessibilityLabel` (required), `size`, `variant` (`ghost` default), hitSlop ≥ 44×44.
- `Input`: thêm `leadingIcon`, `trailingIcon`, `helper`, `counter`, focus state (`borderStrong`/`focusRing`); giữ toàn bộ prop cũ (composer/chat/auth đang dùng).
- `Field` = label + input + helper/error; `TextArea` minHeight 96.
- `Avatar`: size mở rộng `24|32|40|48|64|96`; fallback initial trên `surfaceMuted`; không fetch. `entities/user` re-export để không vỡ 5 call site.

**Xong khi**
- [x] Composer, auth, chat, settings vẫn dùng được, không đổi `testID`.
- [x] `pnpm test` pass (composer/chat tests đang render Input/Button).
- [x] Lab có đủ variant × size × state (thêm ở P1.6 nếu chưa có lab).

---

### P1.5 Components B + States

**Tạo**
```text
src/shared/ui/components/badge.tsx
src/shared/ui/components/card.tsx
src/shared/ui/components/list-item.tsx
src/shared/ui/components/tabs.tsx
src/shared/ui/components/empty-state.tsx
src/shared/ui/components/error-state.tsx
src/shared/ui/components/loading-state.tsx
```

**Contract**

- `Badge`: `dot | count`, cap `99+`, tone `primary|danger|neutral`.
- `Card`: `surface` + `border` + radius `lg`; elevation `card` (Android ưu tiên border).
- `ListItem`: leading/title/subtitle/trailing; minHeight 56; pressable feedback; dùng cho Settings, Search, Follow, Conversation.
- `Tabs`: underline + segmented, `role="tab"`, `selected`; chốt 1 kiểu cho profile (underline) và filter (segmented).
- `EmptyState/ErrorState/LoadingState`: đúng spec §6.3; có `testID`, `accessibilityLabel`; Không dùng chữ "Loading..." nếu có thể skeleton.
- Chưa thay call site ở P1 — thay ở P2.5/P3 để PR nhỏ.

**Xong khi**
- [x] 7 components render light/dark; `testID` và accessibility label có mặt.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm exec eslint .`, `pnpm test -- --ci` pass.
- [x] Lab coverage để P1.6.

---

### P1.6 Design Lab + guardrails

**Tạo**
```text
src/shared/ui/lab/design-lab-screen.tsx
src/app/(shared)/design-lab.tsx
scripts/check-tokens.mjs
```

**Sửa**
```text
src/app/(shared)/_layout.tsx   # đăng ký route (header chính thức ở P2.2; tạm title)
package.json                   # "check:tokens": "node scripts/check-tokens.mjs"
.github/workflows/ci.yml       # thêm paths "scripts/**" + step check:tokens
```

**Contract**

- Route `/(shared)/design-lab`, dev-only: `if (!__DEV__) return <Redirect href="/" />`.
- Nội dung đúng spec §11: color roles, typography, spacing/radius/elevation, icons, button matrix, inputs, avatar/badge, list/tabs, states, skeleton, header preview.
- `check-tokens.mjs`: fail nếu hex/rgb trong `src/features/**`, `src/entities/**` (trừ `__tests__`, fixtures); allow-list hiện tại: `features/chat/components/presence-dot.tsx`, `features/showcase/components/animated-icon.tsx`. `fontSize/fontWeight` chỉ **warn** ở P1, **fail** ở P3.
- Script phải chạy sạch trên tree hiện tại trước khi bật CI (allow-list tường minh theo path, không theo regex mơ hồ).
- `showcase`: giữ đến P4, không xóa ở P1.

**Xong khi**
- [ ] Lab render đủ light/dark trên iOS + Android dev build.
- [ ] `pnpm check:tokens` exit 0.
- [ ] CI chạy check:tokens.

## 4. P2 — Shell

### P2.1 Navigation theme + header factory

**Tạo**
```text
src/shared/ui/navigation/navigation-theme.ts
src/shared/ui/navigation/header-options.ts
```

**Sửa**
```text
src/app-providers.tsx   # ThemedRouter dùng theme dẫn xuất token
```

**Contract**

- Navigation theme **phải spread base theme** để giữ `fonts` (React Navigation 7 yêu cầu `fonts`):
  ```ts
  { ...base, dark: name === "dark", colors: { ...base.colors, primary, background, card, text, border, notification } }
  ```
- `headerOptions` dùng đúng prop của bản expo-router đang cài (SDK 57):
  - `headerLargeTitleEnabled` — **không** dùng `headerLargeTitle` (đã deprecated).
  - `headerBackButtonDisplayMode: "minimal"` — **không** dùng `headerBackTitleVisible` (không còn trong type).
  - `headerShadowVisible: false`, `headerTintColor`, `headerStyle.backgroundColor = surface`, `headerTitleStyle.color = textPrimary`.
- Factory là pure function nhận `theme`; chỉ gọi `useTheme()` trong component layout, không gọi ở module scope.

**Xong khi**
- [ ] Test pure factory (light/dark).
- [ ] Header/tab chrome đổi theo theme preference (light/dark/system).
- [ ] Sửa snippet tương ứng trong spec (ghi chú vào §8-Q7).

### P2.2 Shared header + layouts

**Sửa**
```text
src/app/(shared)/_layout.tsx              # bật header + options từng screen
src/app/(app)/(home)/_layout.tsx
src/app/(app)/(profile)/_layout.tsx
src/app/(app)/(inbox)/_layout.tsx
src/app/(app)/(search)/_layout.tsx
src/features/profile/screens/profile-screen.tsx   # bỏ nút Settings trong body
```

**Contract**

- `(shared)/_layout` khai báo title/back cho: `post/[id]`, `user/[handle]`, `user/[handle]/followers`, `user/[handle]/following`, `hashtag/[tag]`, `follow-requests`, `dev-crash`, `design-lab`.
- Screen `settings` trong `(shared)/_layout` đặt `headerShown: false` — vì `(shared)/settings/_layout` đã là Stack riêng, tránh double header.
- Search: iOS dùng `headerSearchBarOptions`; Android giữ header title + `SearchBar` trong content (spec §7.5).
- Profile `headerRight` = `IconButton name="settings"` → `router.push(hrefs.settings())`; bỏ `profile-settings-button` khỏi body (Maestro `profile.yaml` có thể tham chiếu — kiểm tra + cập nhật).
- Không tự vẽ back button.

**Xong khi**
- [ ] Tick header matrix §7.2.
- [ ] Back từ deep link không history → về Home.
- [ ] Maestro `profile`, `comments`, `hashtag`, `follow`, `save-share` pass (nếu có build).

### P2.3 Screen edges

**Sửa**
```text
src/shared/ui/screen.tsx        # thêm prop header, suy ra edges mặc định
+ mọi screen dưới native header (grep `<Screen`)
```

**Contract**

- `header?: boolean`, default `true` (đa số screen đang nằm dưới header).
- `edges = header ? ["left","right","bottom"] : ["top","left","right","bottom"]`.
- Màn cần full safe area: auth (`sign-in/sign-up`), `+not-found`, `media-viewer` → `header={false}`.
- Không bọc thêm `SafeAreaView` lồng nhau; giữ `KeyboardAvoidingView`/`KeyboardProvider` như hiện tại.
- Settings screens đang truyền `edges` thủ công → đổi sang `header` để nhất quán.

**Xong khi**
- [ ] Không còn double top padding trên iOS/Android ở feed, post detail, settings, chat.
- [ ] Auth + media viewer vẫn đúng safe area.
- [ ] Ảnh trước/sau cho 3 màn đại diện.

### P2.4 Tab badge

**Sửa**
```text
src/app/(app)/_layout.tsx   # NativeTabs.Trigger.Badge cho (inbox)
```

**Contract**

- Dùng `useInbox().unreadCount`; 0 → không render badge; >99 → `99+`.
- `NativeTabs.Trigger.Badge` có sẵn trong SDK 57; fallback `badgeValue` nếu cần.
- Hook phải an toàn khi chưa login (query disabled/không session) — kiểm tra `useInbox` trước khi gắn ở layout.

**Xong khi**
- [ ] 5 unread → badge 5; mark all read → mất badge.
- [ ] Logout → không badge, không crash, không fetch.

### P2.5 States adoption

- Thay `ActivityIndicator` footer / empty text / error text thủ công bằng `LoadingState`/`EmptyState`/`ErrorState` ở: feed, search, inbox, chat, profile lists, post detail, follows.
- Thêm `OfflineBanner` (NetInfo đã có) + hook `useIsOffline` nếu chưa có; mount 1 lần ở app scope, không chặn cache content.
- Không dùng `Alert` cho lỗi load dữ liệu; lỗi form inline.

**Xong khi**: mỗi list screen trả lời đủ 5 state ở spec §8.2; không còn chuỗi "Loading..." thủ công.

### P2.6 Templates (chỉ 2 cái đầu)

```text
src/shared/ui/templates/list-page.tsx
src/shared/ui/templates/detail-page.tsx
```

Chỉ build khi dùng thật ở ≥2 screen trong P2/P3. `AuthPage`/`SettingsPage`/`FormPage` làm ở P3 khi màn đầu tiên cần.

### P2.7 Settings + back QA (carry-over §7.9)

- `settings/_layout.tsx` dùng `headerOptions`.
- Entry point qua `headerRight` (P2.2); xóa nút body.
- QA tay: `Account → Settings → Profile`, deep link `/settings/notifications`, modal dismiss trả đúng màn.
- Chip/Dialog/Toast/SectionHeader/Switch: chỉ thêm khi screen P3 cần.

## 5. P3 — Redesign theo thứ tự

| PR | Màn / route | Trọng tâm | Xong khi |
|---|---|---|---|
| P3.1 | `(auth)/sign-in`, `sign-up` | `display/h1`, `Field`, error inline, sửa trộn VI/EN | Checklist §13 + ảnh light/dark |
| P3.2 | `(app)/(home)` + PostCard + FeedSkeleton | token PostCard, `Skeleton`, 4 state | Scroll không nháy, ảnh trước/sau |
| P3.3 | `post/[id]` + comments | `DetailPage`, comment row, composer pinned | Keyboard + state đủ |
| P3.4 | `(profile)` me/user + edit-profile | `h2`, `Tabs`, Edit action | Không dùng `display` cho tên |
| P3.5 | `(search)` + hashtag + trending | segmented Tabs, SearchBar Android | State + a11y |
| P3.6 | `(inbox)` + chats | ListItem, badge, chat bubble token | Unread + offline |
| P3.7 | Settings + 3 màn con | ListItem/grouped list, Switch native | Back stack + dark |
| P3.8 | Modals: composer, edit-post, report, media-viewer | Button/Field/state, header native | Không layout shift |

Mỗi PR: 1 màn (hoặc 1 cặp auth), ảnh light/dark, Maestro flow tương ứng pass, `check:tokens` fail-on-fontsize bật từ P3.1.

## 6. P4 — Polish

- A11y sweep: touch target, role/state, screen reader order, VoiceOver + TalkBack.
- Dynamic type 130–150%: `display/h1` cap `maxFontSizeMultiplier` 1.3 nếu vỡ.
- Reduce motion: skeleton/transition.
- Dark QA toàn app + contrast check theo §4.1.3.
- Web fallback: chỉ đảm bảo chạy, không làm shell riêng.
- Xóa alias legacy khi `rg` hết usage; xóa `ThemedText/ThemedView`, quyết định `showcase`.
- Cập nhật `docs/design-system.md` lên v1.2 (mục lục token thực tế, prop header đúng SDK 57) + CHANGELOG.
- `check:tokens` fail cả `fontSize/fontWeight`; thêm `padding/margin/gap/borderRadius` warn.

## 7. Verify chung

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
pnpm check:tokens            # sau P1.6

# boundary greps
pnpm lint:boundaries                                # eslint boundaries = gate chính
rg "palette" src/features src/entities             # = 0
rg "setQueryData" src/features                     # = 0 (chỉ entity cache)

# device
# - light/dark, 360–430pt
# - settings: Account → Settings → Profile
# - deep link post/user/settings (back đúng)
# - e2e/flows/*.yaml liên quan
```

Tham chiếu thêm: `schedule/device-run-checklist.md`.

## 8. Quyết định cần chốt trước P1.1

| # | Câu hỏi | Đề xuất | Ảnh hưởng |
|---|---|---|---|
| Q1 | `body` weight legacy 500 vs spec 400 | Đổi sang 400 ở P3.1 khi migrate Auth, giữ 500 ở P1 để không đổi toàn app | Visual toàn app |
| Q2 | Legacy `Text` variant (`title` 48, `subtitle` 32) map ngay sang scale mới hay giữ nguyên? | **Giữ nguyên ở P1**, migrate từng màn P3, xóa alias P4 | Tránh 2 lần đổi visual |
| Q3 | Tên prop `Screen`: `header` (spec) hay `underHeader` (rõ nghĩa hơn) | `header` theo spec | API nhỏ |
| Q4 | Avatar mở rộng size 24/32/40/48/64/96 | Có; API cũ vẫn hợp lệ | Không phá |
| Q5 | Ngôn ngữ mặc định `vi`, fallback `en`? | `vi` | Chặn P3 copy |
| Q6 | Giữ hay xóa `showcase`? | Xóa ở P4 sau khi lab đủ | Route dev |
| Q7 | Sửa spec §7.4: `headerLargeTitle` → `headerLargeTitleEnabled`, `headerBackTitleVisible` → `headerBackButtonDisplayMode` | Có (PR docs riêng) | Header factory |
| Q8 | `expo-symbols` beta | Pin, không nâng trong P1–P3 | Icon Android/web |
| Q9 | Tab badge dùng `NativeTabs.Trigger.Badge` hay `badgeValue` | `Badge` component; fallback `badgeValue` | Tab layout |

## 9. Trạng thái

| Mục | Trạng thái | PR / ghi chú |
|---|---|---|
| P0 — Chốt spec | [x] | `docs/design-system.md` v1.1 |
| P1.1 — Tokens v2 | [x] | `primitive.ts` + `semantic.ts` + alias; typecheck/lint/test pass |
| P1.2 — Icon | [x] | `icons/icon-map.ts` + `Icon`; 26 semantic names, typecheck/lint/test pass |
| P1.3 — Primitives + Text | [x] | `primitives/` + semantic `Text`; jest resolver cho Reanimated |
| P1.4 — Components A | [x] | `components/` + compat re-exports; typecheck/lint/test pass |
| P1.5 — Components B + States | [x] | 7 components + tests; typecheck/lint/test pass |
| P1.6 — Design Lab + guard | [x] | `lab/design-lab-screen.tsx` + `scripts/check-tokens.mjs` + CI step; `check:tokens` exit 0 |
| P2.1 — Nav theme + header factory | [x] | `navigation-theme.ts` + `header-options.ts`; pure factory tests pass |
| P2.2 — Shared header | [x] | Shared/tab headers + profile settings `headerRight`; device matrix QA pending |
| P2.3 — Screen edges | [x] | `Screen header` prop + headerless auth/not-found/media; before/after images pending |
| P2.4 — Tab badge | [x] | `useInbox().unreadCount`, cap `99+`; device QA pending |
| P2.5 — States adoption | [x] | Loading/empty/error across lists + `OfflineBanner`; device QA pending |
| P2.6 — Templates | [x] | `ListPage` + `DetailPage` with state tests |
| P2.7 — Settings/back QA | [x] | Header factory + deep-link anchors; manual back-stack QA pending |
| P3.1 — Auth redesign | [x] | `AuthForm` mock form + inline validation + `display`; `body` → 400 (Q1); `check:tokens` strict fonts ON (allow-list thu dần theo PR) |
| P3.2 — Home + PostCard | [x] | PostCard/Actions/Share/OwnerMenu token + Icon `more`/`heart`; FeedSkeleton trên `Skeleton` |
| P3.3 — Post detail + comments | [x] | `DetailPage` + composer pinned; comment row token; sửa trộn VI/EN |
| P3.4 — Profile + edit-profile | [x] | `h2` tên profile, shared `Tabs` underline, edit-profile copy EN + validation EN |
| P3.5 — Search + hashtag | [x] | Token search/trending/hashtag/`UserRow`; copy EN; segmented filter Tabs chưa làm (chưa có màn dùng — just-in-time) |
| P3.6 — Inbox + chats | [x] | `ListItem`-style rows + shared `Badge`; bubble token; presence-dot dùng `success`; copy EN |
| P3.7 — Settings | [x] | Hub dùng `ListItem`; radio dùng Icon `check`; copy EN toàn bộ settings |
| P3.8 — Modals | [x] | Composer/edit-post/report/media-viewer: `h1`/`h3`, glyph `…`/`×`/`✕` → Icon, copy EN |
| P4 — Polish | [ ] | Sau P3; còn: video glyphs `▶`/`🔇` → Icon (cần thêm icon play/pause/volume vào map), Maestro device QA |
