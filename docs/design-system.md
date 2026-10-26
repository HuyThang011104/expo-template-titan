# Design System — Titan Social

> **Mobile-first · Native-first · Brand blue**
>
> Tài liệu này là nguồn chuẩn cho UI/UX của app. Code là nguồn sự thật về hành vi;
> tài liệu này chốt token, component, header, trạng thái màn hình và quy tắc review.

| Trường | Giá trị |
|---|---|
| Trạng thái | Approved v1.1 — đã chốt Settings stack + brand |
| Ngày | 2026-10-25 |
| Phạm vi | `src/shared/ui`, `src/app`, toàn bộ feature screens |
| Liên quan | `schedule/architecture.md`, `schedule/production-social-functional-roadmap.md`, `AGENTS.md` |
| Nền tảng | Expo SDK 57, React Native 0.86, New Architecture |
| Kế hoạch thi công | `schedule/ui-implementation-plan.md` |

> File này là spec. Tiến độ, chia PR và thứ tự thi công nằm ở `schedule/ui-implementation-plan.md`.

---

## 0. Quyết định đã chốt

| # | Quyết định | Giá trị | Hệ quả |
|---|---|---|---|
| D1 | Platform ưu tiên | **Mobile-first** | Base 360–430pt; tablet/web chỉ scale up sau khi mobile ổn định |
| D2 | Hướng kỹ thuật | **Native-first** | Dùng native Stack header, NativeTabs, native modal, native gesture, native control |
| D3 | Brand | **Giữ xanh `#3C87F7` làm brand** | `brand` dùng cho logo/illustration/accent; `primary` dùng `#2A72DB` (light) / `#6AA6FF` (dark) cho text/fill để đạt AA |
| D4 | Header | **Native header của Expo Router / React Navigation** | Không tự dựng AppBar ở v1; chỉ cấu hình `headerOptions` |
| D5 | Tab bar | **NativeTabs** | Không custom tab bar ở v1 |
| D6 | Web | **Secondary** | Giữ chạy được; chưa làm sidebar/topbar riêng |
| D7 | Nơi đặt design system | `src/shared/ui` | Chưa tách package; tách khi có app thứ hai |
| D8 | Styling | RN `StyleSheet` + token | Không Tailwind/NativeWind, không UI kit ngoài |
| D9 | Font | **System font** | San Francisco (iOS), Roboto (Android), system stack (web) |
| D10 | Theme | Light / Dark / System | Ưu tiên lựa chọn người dùng, fallback system |
| D11 | Settings | **Stack trong `(shared)/settings`** | Không dùng modal; URL `/settings/...`, back native, deep link được |
| D12 | Modal | Chỉ cho tác vụ tập trung | Composer, report, edit-post, media-viewer vẫn là modal |

> Ghi chú: câu hỏi "team size" chưa được trả lời. Các estimate trong tài liệu tính cho **1 dev**.

---

## 1. Mục tiêu và non-goals

### 1.1 Mục tiêu

1. Mọi màn hình nhìn như cùng một sản phẩm, không còn cảm giác "mỗi màn một kiểu".
2. Mọi màu, chữ, khoảng cách, bo góc, icon đều đi qua token.
3. Header, back, title, action, badge hoạt động nhất quán trên iOS/Android.
4. Mỗi màn có đủ 4 trạng thái: loading, empty, error, offline.
5. UI đạt mức production: accessibility, dark mode, touch target, dynamic type.
6. Có nơi review UI nhanh (Design Lab) trước khi lên device.

### 1.2 Non-goals (v1)

- Không làm custom tab bar.
- Không làm web sidebar/topbar riêng.
- Không tách `packages/design-system`.
- Không thêm UI kit (React Native Paper, Tamagui, NativeWind...).
- Không làm tablet layout riêng.
- Không làm animation phức tạp ngoài Reanimated đã có.
- Không đổi backend/API vì design system.
- Không redesign toàn bộ trong một PR.

---

## 2. Nguyên tắc thiết kế

1. **Native by default.** Nếu platform đã làm tốt (header, back gesture, form sheet, switch, alert, date picker), dùng native. Chỉ custom khi có lý do rõ ràng.
2. **Token-only.** Feature/entity không được hardcode hex, fontSize, fontWeight. Layout number vẫn được phép trong `StyleSheet` khi là đặc thù của màn.
3. **Mobile-first.** Thiết kế cho 360–430pt trước. Breakpoint chỉ thêm khi mobile đã pass.
4. **Consistency over novelty.** Một pattern dùng cho tất cả màn tương tự. Không sáng tạo riêng lẻ.
5. **State completeness.** Một màn chưa đủ 4 trạng thái thì chưa xong.
6. **Accessibility as default.** Touch target, contrast, label, dynamic type là mặc định, không phải bước sau.
7. **Content-first.** UI phục vụ nội dung; giảm chrome, giảm màu trang trí.
8. **Một component, một nguồn.** Component dùng ≥2 nơi mới đưa lên `shared`; không copy style.

---

## 3. Kiến trúc UI

### 3.1 Cây thư mục mục tiêu

```
src/shared/ui/
├── index.ts                    # public API duy nhất
├── theme/
│   ├── primitive.ts            # palette, scale gốc
│   ├── semantic.ts             # role màu theo light/dark
│   ├── tokens.ts               # re-export + alias tương thích
│   ├── theme-provider.tsx
│   ├── theme-preference.tsx
│   └── use-theme.ts
├── icons/
│   ├── icon.tsx                # SF Symbols + Material Symbols
│   ├── icon-map.ts             # tên semantic -> symbol từng platform
│   └── index.ts
├── primitives/
│   ├── box.tsx                 # View + token spacing
│   ├── stack.tsx               # Row/Column + gap
│   ├── text.tsx
│   ├── pressable.tsx
│   ├── divider.tsx
│   ├── spinner.tsx
│   └── skeleton.tsx
├── components/
│   ├── button.tsx
│   ├── icon-button.tsx
│   ├── input.tsx
│   ├── text-area.tsx
│   ├── field.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── chip.tsx
│   ├── card.tsx
│   ├── list-item.tsx
│   ├── section-header.tsx
│   ├── tabs.tsx
│   ├── switch.tsx
│   ├── sheet.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   └── loading-state.tsx
├── navigation/
│   ├── screen.tsx
│   ├── header-options.ts      # factory cho native Stack
│   ├── navigation-theme.ts    # map token -> React Navigation theme
│   └── tab-options.ts
└── lab/
    └── design-lab-screen.tsx  # dev-only gallery
```

### 3.2 Quy tắc phụ thuộc

Giữ nguyên quy tắc hiện có trong `AGENTS.md`:

```
app → features → entities → shared
```

- `shared/ui` không import feature/entity.
- `features` không import feature khác.
- `entities` không import feature.
- Chỉ import public API: `@/shared/ui`, `@/features/<name>`, `@/entities/<name>`.

### 3.3 Chiến lược migrate

Không move hàng loạt file đang chạy. Làm theo thứ tự:

1. Thêm file mới (`primitive.ts`, `semantic.ts`, `icons/`, `primitives/`, `components/`).
2. `tokens.ts` cũ trở thành re-export + alias tương thích.
3. Component cũ giữ nguyên API, ruột chuyển sang token mới.
4. Screen nào sửa thì migrate screen đó.
5. Khi không còn import cũ, xóa alias và `ThemedText`/`ThemedView` legacy.

---

## 4. Tokens

### 4.1 Màu

#### 4.1.1 Primitive palette

Chỉ dùng trong `theme/`. Feature không import primitive palette.

```ts
export const palette = {
  brand: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3C87F7", // brand gốc
    600: "#2A72DB",
    700: "#1F5FBF",
    800: "#1E4E96",
    900: "#1E3A6E",
  },
  neutral: {
    0: "#FFFFFF",
    25: "#FCFCFD",
    50: "#F7F8FA",
    100: "#F0F1F4",
    200: "#E3E5EA",
    300: "#D0D3DA",
    400: "#A7ACB6",
    500: "#7A808C",
    600: "#5C6270",
    700: "#444A56",
    800: "#2A2F39",
    900: "#171A21",
    950: "#0B0D12",
    1000: "#000000",
  },
  green: {
    50: "#ECFDF5",
    600: "#15803D",
    700: "#166534",
  },
  amber: {
    50: "#FFFBEB",
    600: "#B45309",
    700: "#92400E",
  },
  red: {
    50: "#FEF2F2",
    600: "#DC2626",
    700: "#B91C1C",
  },
} as const;
```

#### 4.1.2 Semantic tokens

Đây là thứ duy nhất component được dùng qua `useTheme().color`.

**Light**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `background` | `#FFFFFF` | Nền màn hình |
| `surface` | `#FFFFFF` | Card, header, sheet |
| `surfaceElevated` | `#FFFFFF` | Popover, dialog (kèm elevation) |
| `surfaceSunken` | `#F7F8FA` | Vùng nền phụ, search field |
| `surfaceMuted` | `#F0F1F4` | Nút secondary, skeleton base |
| `border` | `#E3E5EA` | Divider, viền card |
| `borderStrong` | `#D0D3DA` | Viền input focus/active |
| `textPrimary` | `#0B0D12` | Chữ chính |
| `textSecondary` | `#5C6270` | Chữ phụ, metadata |
| `textTertiary` | `#7A808C` | Placeholder, disabled |
| `textInverse` | `#FFFFFF` | Chữ trên nền tối |
| `primary` | `#2A72DB` | Fill/nút/chữ primary đạt AA |
| `primaryPressed` | `#1F5FBF` | Trạng thái pressed |
| `primarySoft` | `#EFF6FF` | Nền nhấn nhẹ |
| `onPrimary` | `#FFFFFF` | Chữ/icon trên primary |
| `brand` | `#3C87F7` | Logo, illustration, accent không phải chữ nhỏ |
| `success` | `#15803D` | Text/icon success |
| `successSoft` | `#ECFDF5` | Nền success |
| `warning` | `#B45309` | Text/icon warning |
| `warningSoft` | `#FFFBEB` | Nền warning |
| `danger` | `#DC2626` | Text/icon danger |
| `dangerSoft` | `#FEF2F2` | Nền danger |
| `onDanger` | `#FFFFFF` | Chữ trên danger |
| `overlay` | `rgba(11,13,18,0.5)` | Backdrop |
| `skeleton` | `#E3E5EA` | Skeleton |
| `focusRing` | `#2A72DB` | Focus (web/keyboard) |

**Dark**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `background` | `#000000` | Nền màn hình (OLED) |
| `surface` | `#121418` | Card, header, sheet |
| `surfaceElevated` | `#1A1D23` | Popover, dialog |
| `surfaceSunken` | `#0B0D12` | Vùng nền phụ |
| `surfaceMuted` | `#212225` | Nút secondary, skeleton base |
| `border` | `#2A2F39` | Divider, viền card |
| `borderStrong` | `#3A404C` | Viền input focus/active |
| `textPrimary` | `#F7F8FA` | Chữ chính |
| `textSecondary` | `#A7ACB6` | Chữ phụ, metadata |
| `textTertiary` | `#7A808C` | Placeholder, disabled |
| `textInverse` | `#0B0D12` | Chữ trên nền sáng |
| `primary` | `#6AA6FF` | Fill/nút/chữ primary |
| `primaryPressed` | `#4C93F9` | Trạng thái pressed |
| `primarySoft` | `#10213D` | Nền nhấn nhẹ |
| `onPrimary` | `#08101F` | Chữ/icon trên primary |
| `brand` | `#3C87F7` | Logo, illustration, accent |
| `success` | `#4ADE80` | Text/icon success |
| `successSoft` | `#052E1A` | Nền success |
| `warning` | `#FBBF24` | Text/icon warning |
| `warningSoft` | `#3A2503` | Nền warning |
| `danger` | `#F87171` | Text/icon danger |
| `dangerSoft` | `#3A0B0B` | Nền danger |
| `onDanger` | `#1A0505` | Chữ trên danger |
| `overlay` | `rgba(0,0,0,0.6)` | Backdrop |
| `skeleton` | `#212225` | Skeleton |
| `focusRing` | `#6AA6FF` | Focus (web/keyboard) |

#### 4.1.3 Quy tắc contrast

- Text thường: **≥ 4.5:1**.
- Text lớn (≥ 24px hoặc ≥ 18.66px bold): **≥ 3:1**.
- Icon/viền UI: **≥ 3:1**.
- `brand #3C87F7` trên trắng chỉ đạt ~3.5:1 → **không dùng làm chữ nhỏ**. Dùng `primary #2A72DB` cho chữ/nút.
- Không dùng màu làm tín hiệu duy nhất; luôn kèm icon hoặc text.
- Không đặt text xám `textTertiary` cho nội dung quan trọng.

#### 4.1.4 Quy tắc dùng màu

- Nền màn hình: `background`.
- Card/header/sheet: `surface`.
- Nút primary: `primary` + `onPrimary`.
- Nút secondary: `surfaceMuted` + `textPrimary`.
- Nút ghost: trong suốt + `primary`.
- Nút danger: `danger` + `onDanger`.
- Link/chữ nhấn: `primary`.
- Logo/accent: `brand`.
- Không gradient ở v1.
- Không hardcode `rgba` ngoài token `overlay`.

### 4.2 Spacing (4pt grid)

```ts
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
```

Alias tương thích trong giai đoạn migrate:

| Alias cũ | Giá trị | Ghi chú |
|---|---|---|
| `xs` | 4 | giữ |
| `sm` | 8 | giữ |
| `md` | 16 | giữ để không vỡ layout |
| `lg` | 24 | giữ |
| `xl` | 32 | giữ |

Quy ước:

- Padding màn hình ngang: `4` (16pt).
- Padding card: `4` (16pt); card nhỏ/list row: `3` (12pt).
- Gap giữa item list: `2` (8pt).
- Gap trong cụm label/value: `1` (4pt).
- Section spacing: `6` (24pt).
- Không dùng số lẻ ngoài scale (trừ lineHeight, borderWidth, icon size đặc thù).

### 4.3 Typography

Font: system font. Không bundle brand font ở v1.

| Variant | Size/Line | Weight | Dùng cho |
|---|---|---|---|
| `display` | 34/40 | 700 | Auth, onboarding, empty state lớn |
| `h1` | 28/34 | 700 | Tiêu đề màn hình lớn |
| `h2` | 22/28 | 600 | Tên profile, tiêu đề section |
| `h3` | 18/24 | 600 | Tiêu đề card, dialog |
| `body` | 16/24 | 400 | Nội dung chính |
| `bodyStrong` | 16/24 | 600 | Nội dung nhấn |
| `label` | 14/20 | 500 | Label, metadata, tab |
| `labelStrong` | 14/20 | 600 | Tên tác giả, nút nhỏ |
| `caption` | 12/16 | 500 | Timestamp, helper text |
| `overline` | 11/16 | 600 | Section label (uppercase, letterSpacing 0.6) |

Quy tắc:

- Không dùng `display` cho tên user trong profile; dùng `h2`.
- Không dùng quá 2 weight trong một cụm.
- Số đếm (like, follower) dùng `fontVariant: ["tabular-nums"]`.
- Dynamic type: cho phép scale; `display`/`h1` có thể cap `maxFontSizeMultiplier` 1.3 nếu vỡ layout.
- Không viết hoa toàn bộ trừ `overline`.
- Không hardcode `fontSize` trong feature.

Mapping từ token cũ:

| Cũ | Mới |
|---|---|
| `title` 48 | `display` 34 (chỉ auth/empty) hoặc `h1` 28 |
| `subtitle` 32 | `h2` 22 hoặc `h1` 28 |
| `body` 16 | `body` 16 |
| `small` 14 | `label` 14 |
| `caption` 12 | `caption` 12 |

### 4.4 Radius

```ts
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
```

Quy ước:

- Input/button: `md` (12).
- Card: `lg` (16).
- Sheet/dialog: `xl` (24) hoặc native radius.
- Avatar/badge tròn: `full`.
- Chip: `full`.
- Không dùng radius > 24 cho khối lớn trên mobile.

### 4.5 Elevation

| Token | iOS | Android | Dùng cho |
|---|---|---|---|
| `none` | không shadow | elevation 0 | Mặc định |
| `card` | opacity 0.06, radius 8, y 2 | elevation 1 | Card nổi nhẹ |
| `popover` | opacity 0.12, radius 16, y 8 | elevation 4 | Menu, popover |
| `modal` | opacity 0.18, radius 24, y 12 | elevation 8 | Dialog, sheet |

Quy tắc:

- Android ưu tiên `border` + `surface` thay vì shadow nặng.
- Dark mode dùng `surfaceElevated` + `border`, không tăng shadow.
- Không tự viết shadow trong feature; dùng token.

### 4.6 Motion

```ts
export const motion = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 300,
  easing: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
  },
} as const;
```

Quy tắc:

- Điều hướng màn hình: dùng animation native của Stack, không tự animate.
- Press feedback: opacity/scale nhẹ trong `fast`.
- Skeleton: pulse `slow`, tắt khi `useReducedMotion()`.
- Không animate quá 300ms cho tác vụ thường.
- Tôn trọng `AccessibilityInfo.isReduceMotionEnabled`.

### 4.7 Icon

Dùng `expo-symbols` (đã có trong dependency): SF Symbols trên iOS, Material Symbols trên Android/web.

```ts
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;
```

API:

```tsx
<Icon name="heart" size="lg" color="textSecondary" />
<Icon name="heartFill" size="lg" color="danger" />
```

Quy tắc:

- Default `lg` (24).
- Icon-only button phải có `accessibilityLabel`.
- Hit area tối thiểu 44×44; dùng `hitSlop` nếu icon nhỏ.
- Không dùng text glyph (`…`, `×`, `‹`) làm icon.
- Bộ icon khởi điểm:

| Semantic name | iOS (SF Symbol) | Android (Material) |
|---|---|---|
| `home` | `house` / `house.fill` | `home` |
| `search` | `magnifyingglass` | `search` |
| `plus` | `plus` | `add` |
| `inbox` | `tray` / `tray.fill` | `inbox` |
| `profile` | `person` / `person.fill` | `person` |
| `heart` | `heart` | `favorite_border` |
| `heartFill` | `heart.fill` | `favorite` |
| `comment` | `bubble.right` | `chat_bubble_outline` |
| `share` | `square.and.arrow.up` | `share` |
| `bookmark` | `bookmark` | `bookmark_border` |
| `bookmarkFill` | `bookmark.fill` | `bookmark` |
| `more` | `ellipsis` | `more_horiz` |
| `back` | `chevron.left` | `arrow_back` |
| `close` | `xmark` | `close` |
| `settings` | `gearshape` | `settings` |
| `camera` | `camera` | `photo_camera` |
| `image` | `photo` | `image` |
| `send` | `paperplane.fill` | `send` |
| `check` | `checkmark` | `check` |
| `alert` | `exclamationmark.triangle` | `warning` |
| `offline` | `wifi.slash` | `wifi_off` |
| `refresh` | `arrow.clockwise` | `refresh` |
| `lock` | `lock` | `lock` |
| `eye` | `eye` | `visibility` |
| `eyeOff` | `eye.slash` | `visibility_off` |
| `chevronRight` | `chevron.right` | `chevron_right` |

### 4.8 Breakpoints và layout

| Token | Giá trị | Dùng cho |
|---|---|---|
| `compact` | 0–599 | Phone |
| `medium` | 600–899 | Foldable, tablet portrait |
| `expanded` | ≥ 900 | Tablet landscape, web |

- Content max width: **640**.
- Feed max width: **600**.
- Chỉ áp dụng breakpoint sau khi mobile pass P3.
- Không đổi cấu trúc navigation theo breakpoint ở v1.

### 4.9 Navigation theme tokens

Map token sang React Navigation theme để header/tab khớp app:

```ts
const navigationTheme = {
  dark: name === "dark",
  colors: {
    primary: color.primary,
    background: color.background,
    card: color.surface,
    text: color.textPrimary,
    border: color.border,
    notification: color.danger,
  },
};
```

Thay `DefaultTheme`/`DarkTheme` hiện tại trong `app-providers.tsx` bằng theme dẫn xuất từ token.

---

## 5. Theme và provider

### 5.1 `useTheme()`

Component chỉ dùng semantic token:

```tsx
const theme = useTheme();
theme.color.textPrimary;
theme.space[4];
theme.radius.md;
theme.type.body;
theme.icon.lg;
theme.motion.base;
theme.elevation.card;
```

Không đọc `colors.light` / `colors.dark` trực tiếp trong component.

### 5.2 Theme preference

- `system` (default) → theo OS.
- `light` / `dark` → người dùng chọn, lưu bằng storage hiện có.
- Đổi theme phải đổi cả:
  - token app
  - React Navigation theme
  - status bar style
  - splash/background nếu cần

### 5.3 Status bar

- Light theme: `dark` content.
- Dark theme: `light` content.
- Dùng `expo-status-bar`, không set thủ công trong từng screen.

### 5.4 Dark mode rules

- Nền `background` đen tuyệt đối trên OLED; surface sáng hơn một bậc.
- Không dùng trắng tinh cho card trên nền đen.
- Viền `border` thay shadow.
- Ảnh/cover giữ nguyên; thêm overlay nhẹ nếu chữ đè lên.
- Kiểm tra contrast lại toàn bộ trước khi release.

---

## 6. Components

### 6.1 Inventory

| Component | Layer | Trạng thái | Ưu tiên |
|---|---|---|---|
| `Text` | primitive | có, cần token mới | P1 |
| `Button` | component | có, cần variant/icon/size | P1 |
| `IconButton` | component | chưa có | P1 |
| `Input` | component | có, cần field/helper/icon | P1 |
| `TextArea` | component | chưa có | P1 |
| `Field` | component | chưa có | P1 |
| `Avatar` | component | có trong entity, cần chuyển shared | P1 |
| `Badge` | component | chưa có | P1 |
| `Chip` | component | chưa có | P2 |
| `Card` | component | chưa có | P1 |
| `ListItem` | component | chưa có | P1 |
| `SectionHeader` | component | chưa có | P2 |
| `Tabs` | component | chưa có (profile đang tự làm) | P1 |
| `Switch` | component | dùng native | P2 |
| `Sheet` | component | có | P2 |
| `Dialog` | component | chưa có | P2 |
| `Toast` | component | chưa có | P2 |
| `EmptyState` | component | chưa có | P1 |
| `ErrorState` | component | chưa có | P1 |
| `LoadingState` | component | chưa có | P1 |
| `Skeleton` | component | có trong feed, cần shared | P1 |
| `Screen` | navigation | có, cần header/edges | P1 |
| `headerOptions` | navigation | chưa có | P1 |
| `Icon` | icon | chưa có | P1 |

### 6.2 API conventions

- `variant`, `size`, `disabled`, `loading`, `testID`, `accessibilityLabel`.
- `style` chỉ dùng cho layout (margin/flex), không dùng để đổi màu/chữ.
- Component không gọi API, không đọc feature store.
- Component nhận `children` khi có thể; không ép schema dữ liệu.
- Icon-only phải có `accessibilityLabel`.
- Loading phải giữ nguyên kích thước để tránh layout shift.
- Controlled component cho form; uncontrolled chỉ khi thật đơn giản.

### 6.3 Chi tiết component chính

#### Button

| Thuộc tính | Giá trị |
|---|---|
| Variant | `primary`, `secondary`, `outline`, `ghost`, `danger` |
| Size | `sm` 36, `md` 44, `lg` 52 |
| Icon | trái/phải, size 20 |
| State | default, pressed, disabled, loading |
| Width | `auto` hoặc `full` |

- Min height 44 (trừ `sm` 36 chỉ dùng trong header/card).
- Primary: `primary` + `onPrimary`.
- Secondary: `surfaceMuted` + `textPrimary`.
- Outline: transparent + `border` + `textPrimary`.
- Ghost: transparent + `primary`.
- Danger: `danger` + `onDanger`.
- Loading: spinner cùng màu text, khóa press.

#### Input / Field

- `Field` = label + input + helper/error.
- Label dùng `label` + `textSecondary`.
- Input height 44, radius `md`, border `border`.
- Focus: border `borderStrong` hoặc `focusRing`.
- Error: border `danger`, helper `danger`, icon `alert`.
- Có `leadingIcon`, `trailingIcon`, `maxLength`, `counter`.
- Multiline dùng `TextArea`, min height 96.

#### Avatar

- Size: 24, 32, 40, 48, 64, 96.
- Fallback: initial trên `surfaceMuted`.
- Optional status dot: online/offline.
- Không tự fetch; nhận `avatarUrl`, `displayName`.

#### Badge

- `dot` hoặc `count`.
- Count > 99 hiển thị `99+`.
- Tone: `primary`, `danger`, `neutral`.
- Không dùng badge cho nội dung không đếm được.

#### ListItem

- Leading (avatar/icon), title, subtitle, trailing (value/chevron/switch).
- Min height 56.
- Pressable có feedback.
- Dùng cho Settings, Search results, Follow lists, Conversation list.

#### Tabs

- Dùng cho Profile (Posts/Saved) và các màn filter.
- Style: underline hoặc segmented; chọn một kiểu toàn app.
- Khuyến nghị: **underline** cho profile, **segmented** cho filter.
- Accessibility: `role="tab"`, `selected`.

#### Sheet / Dialog

- Ưu tiên native `formSheet` cho composer/report/settings.
- `Sheet` custom chỉ khi cần cross-platform hoặc nội dung phức tạp.
- Confirm đơn giản: dùng `Alert.alert` native.
- Dialog custom: title `h3`, body `body`, action row.

#### EmptyState / ErrorState / LoadingState

- `EmptyState`: icon 48, title `h3`, description `body` + `textSecondary`, action button.
- `ErrorState`: icon `alert`, title, message theo lỗi, nút Retry.
- `LoadingState`: skeleton hoặc spinner; không dùng chữ "Loading..." đơn điệu nếu có thể skeleton.
- Tất cả có `testID` và accessibility label.

### 6.4 Native-first component rules

- `Switch` → dùng `Switch` của RN.
- `Alert` → dùng native alert.
- `Modal` → dùng native `formSheet`/`modal`.
- `Pressable` → dùng `Pressable` với `android_ripple` nếu phù hợp.
- Không tự vẽ back button; dùng header native.
- Không tự vẽ tab bar; dùng NativeTabs.
- Haptic (like/send/delete) cân nhắc thêm `expo-haptics` ở P2, không bắt buộc v1.

---

## 7. Navigation và Header (native)

### 7.1 Nguyên tắc

- Root Stack: `headerShown: false`.
- Mỗi tab có Stack riêng, header native.
- Màn shared/detail: header native, có back.
- Modal: native presentation + header native.
- Không dựng AppBar custom ở v1.
- Không import `@react-navigation/*` trong route; dùng Expo Router.

### 7.2 Header matrix

| Route | Header | Title | Back | Right action |
|---|---|---|---|---|
| `(auth)/sign-in` | ẩn | — | — | — |
| `(auth)/sign-up` | ẩn | — | — | — |
| `(app)/(home)/index` | native Stack | `Home` | — | — |
| `(app)/(search)/index` | native Stack | `Search` | — | search bar (iOS) |
| `(app)/(inbox)/index` | native Stack | `Inbox` | — | `Mark all` |
| `(app)/(inbox)/chats/index` | native Stack | `Chats` | có | — |
| `(app)/(inbox)/chats/[id]` | native Stack | tên đối phương | có | `more` |
| `(app)/(profile)/index` | native Stack | `Profile` | — | `settings` |
| `(shared)/post/[id]` | native Stack | `Post` | có | `more` |
| `(shared)/user/[handle]` | native Stack | `@handle` | có | `more` |
| `(shared)/user/[handle]/followers` | native Stack | `Followers` | có | — |
| `(shared)/user/[handle]/following` | native Stack | `Following` | có | — |
| `(shared)/hashtag/[tag]` | native Stack | `#tag` | có | — |
| `(shared)/follow-requests` | native Stack | `Follow requests` | có | — |
| `(shared)/settings/index` | native Stack | `Settings` | có | — |
| `(shared)/settings/notifications` | native Stack | `Notifications` | có | — |
| `(shared)/settings/privacy` | native Stack | `Privacy` | có | — |
| `(shared)/settings/account` | native Stack | `Account` | có | — |
| `(shared)/design-lab` | native Stack | `Design Lab` | có | — |
| `(modals)/composer` | formSheet | `New post` | `Dismiss` | `Post` |
| `(modals)/edit-post` | formSheet | `Edit post` | `Cancel` | `Save` |
| `(modals)/report` | formSheet | `Report` | `Dismiss` | `Submit` |
| `(modals)/media-viewer` | modal | — | `Close` | — |

### 7.3 Sửa lỗi hiện tại

1. `src/app/(shared)/_layout.tsx` đang `headerShown: false` → **đổi thành header native**, khai báo title/back cho từng screen. Hiện post/user detail không có nút back.
2. `src/app/(app)/(home)/_layout.tsx` chỉ có `title: "Home"` → thêm `headerOptions` chung.
3. `src/app/(app)/(profile)/_layout.tsx` → thêm `headerRight` settings; bỏ nút Settings khỏi body.
4. `src/app/(app)/(inbox)/_layout.tsx` → thêm badge unread qua NativeTabs.
5. `Screen` mặc định đang bọc SafeAreaView tất cả edges → dưới native header dễ bị double top padding. Chuẩn hóa `edges`.
6. Settings đang là modal (`(modals)/settings*`) → chuyển sang stack `(shared)/settings/*`; cập nhật `hrefs`; xóa `Stack.Screen` khỏi `(modals)/_layout.tsx` (chi tiết 7.9).

### 7.4 Header options factory

```ts
// src/shared/ui/navigation/header-options.ts
export function headerOptions(theme: Theme, options?: {
  title?: string;
  large?: boolean;
  right?: () => ReactNode;
  tint?: ThemeColorName;
}) {
  return {
    title: options?.title,
    headerLargeTitle: options?.large ?? false,
    headerTintColor: theme.color[options?.tint ?? "primary"],
    headerStyle: { backgroundColor: theme.color.surface },
    headerTitleStyle: {
      color: theme.color.textPrimary,
      fontSize: 17,
      fontWeight: "600",
    },
    headerShadowVisible: false,
    headerBackTitleVisible: false, // iOS
    headerRight: options?.right,
  } as const;
}
```

Dùng trong layout:

```tsx
const theme = useTheme();
<Stack.Screen
  name="index"
  options={headerOptions(theme, { title: "Home", large: true })}
/>
```

Lưu ý: `useTheme()` phải gọi trong component; không gọi trong file config tĩnh.

### 7.5 Search bar

- iOS: dùng `headerSearchBarOptions` native.
- Android: native header không có search bar chuẩn → đặt `SearchBar` ở đầu content, vẫn giữ header title.
- Không tự dựng search bar giả trong header Android.

### 7.6 Tab bar

- Giữ `NativeTabs`.
- Label ngắn: `Home`, `Search`, `Create`, `Inbox`, `Profile`.
- Icon SF/Material như hiện tại.
- Badge Inbox: dùng `badgeValue` của NativeTabs, cập nhật từ `useInbox`.
- Create là trigger đặc biệt: `disabled` + push composer (giữ pattern hiện tại).
- Không custom tab bar ở v1.

### 7.7 Safe area và Screen

Quy ước:

- Màn có native header: `Screen` dùng `edges={["left", "right", "bottom"]}`.
- Màn không header (auth, full-screen media): `edges={["top", "left", "right", "bottom"]}`.
- Không bọc thêm `SafeAreaView` lồng nhau.
- Nếu cần offset theo header: dùng `useHeaderHeight()`.
- Keyboard: form/chat dùng `KeyboardAvoidingView` hoặc `react-native-keyboard-controller` đã có.

Đề xuất API:

```tsx
<Screen edges={["left", "right", "bottom"]} header>
  ...
</Screen>
```

`header` chỉ là tín hiệu để chọn edges mặc định; không render header.

### 7.8 Deep link và back

- Giữ nguyên `hrefs`, `+native-intent`.
- Header back phải hoạt động với deep link: nếu không có history, back về Home.
- Không tự `router.replace` trong header.
- Modal dismiss phải trả về đúng màn trước đó.

### 7.9 Settings là stack, không phải modal

**Lý do:** Settings là đích đến thường xuyên, cần back stack, deep link, mở rộng nhiều màn con và review store. Modal phù hợp cho tác vụ tập trung (composer, report, edit-post, media viewer), không phù hợp cho một khu vực nhiều tầng.

#### Route tree

```
src/app/(shared)/settings/
├── _layout.tsx          # Stack + native header
├── index.tsx            # Settings hub
├── notifications.tsx    # Notification prefs
├── privacy.tsx          # Privacy
└── account.tsx          # Account, sessions, language, theme, data
```

URL sau khi bỏ group:

| File | URL |
|---|---|
| `settings/index.tsx` | `/settings` |
| `settings/notifications.tsx` | `/settings/notifications` |
| `settings/privacy.tsx` | `/settings/privacy` |
| `settings/account.tsx` | `/settings/account` |

#### Header

| Route | Title | Back | Right |
|---|---|---|---|
| `/settings` | `Settings` | có | — |
| `/settings/notifications` | `Notifications` | có | — |
| `/settings/privacy` | `Privacy` | có | — |
| `/settings/account` | `Account` | có | — |

Dùng `headerOptions` chung; không dùng `presentation: "formSheet"`, không dùng nút `Done` thay cho back.

#### Layout mẫu

```tsx
// src/app/(shared)/settings/_layout.tsx
import { Stack } from "expo-router";
import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

export default function SettingsLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen name="index" options={headerOptions(theme, { title: "Settings" })} />
      <Stack.Screen
        name="notifications"
        options={headerOptions(theme, { title: "Notifications" })}
      />
      <Stack.Screen name="privacy" options={headerOptions(theme, { title: "Privacy" })} />
      <Stack.Screen name="account" options={headerOptions(theme, { title: "Account" })} />
    </Stack>
  );
}
```

#### Cập nhật `hrefs`

```ts
settings: (): Href => ({ pathname: "/settings" }) as unknown as Href,
notifSettings: (): Href => ({ pathname: "/settings/notifications" }) as unknown as Href,
privacySettings: (): Href => ({ pathname: "/settings/privacy" }) as unknown as Href,
accountSettings: (): Href => ({ pathname: "/settings/account" }) as unknown as Href,
```

#### Migration checklist

> Trạng thái 2026-10-25: route/layout/hrefs đã migrate; header đang dùng `Stack` mặc định, sẽ chuyển sang `headerOptions` ở P2. Còn `headerRight` entry point (P3) và device QA back stack.

- [x] Tạo `src/app/(shared)/settings/_layout.tsx`.
- [x] Move 4 route files từ `(modals)` sang `(shared)/settings/` (giữ nguyên tên screen export).
- [x] Xóa `(modals)/settings.tsx`, `account-settings.tsx`, `notif-settings.tsx`, `privacy-settings.tsx`.
- [x] Xóa 4 `Stack.Screen` settings khỏi `(modals)/_layout.tsx`.
- [x] Cập nhật `hrefs` sang URL mới.
- [x] Bỏ comment `formSheet` trong 4 screen; dùng `Screen` với `edges` của màn có header.
- [ ] Entry point: `headerRight` settings trên Profile (native header), không đặt nút Settings trong body.
- [x] Deep link cũ: chưa release, chấp nhận breaking; không thêm redirect tạm.
- [x] Cập nhật Maestro/test nếu có tham chiếu route cũ (không có tham chiếu; test pass).
- [ ] Kiểm tra back từng màn: Account → Settings → Profile.

#### Không chuyển thành stack

- Composer, edit-post, report, media-viewer: giữ modal.
- Confirm ngắn (xóa bài, đăng xuất): native `Alert`.
- Chọn ảnh, share sheet: native OS sheet.

---

## 8. Page templates và trạng thái

### 8.1 Templates

| Template | Dùng cho | Cấu trúc |
|---|---|---|
| `AuthPage` | Sign in/up | Headerless, centered, logo + h1 + form + footer |
| `ListPage` | Feed, Search, Inbox, Followers | Native header + list + states + optional header |
| `DetailPage` | Post detail, Chat detail | Native header + scroll/list + composer pinned |
| `ProfilePage` | Me/User profile | Native header + cover + avatar + stats + tabs + list |
| `SettingsPage` | Settings/sub-settings | Native header + grouped list |
| `FormPage` | Composer, Edit profile, Report | Native modal header + form + keyboard avoidance |
| `EmptyPage` | Not found, private, blocked | Native header + EmptyState |

### 8.2 State matrix

Mỗi màn hình phải trả lời 5 câu:

| State | Bắt buộc | Thành phần |
|---|---|---|
| Loading | có | Skeleton hoặc spinner, giữ layout |
| Empty | có | Icon + title + description + action (nếu có) |
| Error | có | Icon + message + Retry |
| Offline | có | Banner + retry; không chặn nội dung cache |
| Success | có | Nội dung thật |

Quy tắc:

- Không dùng `Alert` cho lỗi load dữ liệu; hiển thị inline.
- Lỗi validate form: inline dưới field.
- Lỗi mạng: phân biệt `NETWORK` và `HTTP`; message theo `shared/api/errors`.
- Empty state phải có hướng tiếp theo, không chỉ "No data".

### 8.3 Thứ tự redesign màn hình

1. Auth (sign-in/sign-up) — ấn tượng đầu.
2. Home feed + PostCard + FeedSkeleton.
3. Post detail + Comment.
4. Profile (me/user) + Edit profile.
5. Search + Hashtag + Trending.
6. Inbox + Chat.
7. Settings + các màn con.
8. Modals (composer, report, media viewer).

Mỗi màn xong phải pass checklist P3 (mục 13).

---

## 9. Accessibility

- Touch target: iOS ≥ 44×44, Android ≥ 48×48.
- Contrast: theo mục 4.1.3.
- Dynamic type: không khóa font scaling; test ở 130–150%.
- Icon-only: `accessibilityLabel`.
- Button: `accessibilityRole="button"`, `accessibilityState`.
- Tab: `accessibilityRole="tab"`, `selected`.
- Image: label mô tả; ảnh trang trí `accessible={false}`.
- Form: label liên kết input; error được đọc.
- Không dùng màu làm tín hiệu duy nhất.
- Reduce motion: tắt skeleton pulse/animation.
- Screen reader order: header → nội dung → action.
- Test VoiceOver (iOS) + TalkBack (Android) trước release.

---

## 10. Content và i18n

- Mọi chuỗi UI đi qua `t()` trong `shared/i18n`; không hardcode trong component.
- Hiện có `vi`, `en`, `es`; chốt ngôn ngữ mặc định (đề xuất `vi`) và ngôn ngữ fallback (`en`).
- Không trộn Việt/Anh trong cùng màn. Ví dụ hiện tại: `"Bài viết không còn"` cạnh `"It may have been deleted."` → sửa.
- Sentence case cho title/label; `overline` mới uppercase.
- Error message: chuyện gì xảy ra + người dùng làm gì tiếp.
- Empty state: thân thiện, có action.
- Số/ngày/relative time dùng `shared/lib/number`, `shared/lib/date`.
- Không dùng tiếng lóng hoặc emoji trong UI trừ khi brand cho phép.

---

## 11. Design Lab

Mục đích: review token/component ở light + dark ngay trên device, không cần đi qua flow nghiệp vụ.

- Route: `/(shared)/design-lab` (dev-only, không link từ tab).
- Guard: `if (!__DEV__) return <Redirect href="/" />`.
- Nội dung:
  - Color roles (light/dark)
  - Typography scale
  - Spacing/radius/elevation
  - Icon set
  - Buttons (variant × size × state)
  - Inputs/fields
  - Avatars/badges/chips
  - List items/tabs/settings rows
  - Empty/error/loading/skeleton
  - Header preview (native)
- Mỗi component mới phải thêm vào lab trong cùng PR.
- Có thể thêm Maestro smoke `e2e/flows/design-lab.yaml` ở P2.
- Không dùng `showcase` template làm design lab; `showcase` là demo template, có thể xóa sau khi lab xong.

---

## 12. Migration và roadmap

### 12.1 Tổng quan

| Phase | Thời gian (1 dev) | Deliverable | Done khi |
|---|---|---|---|
| P0 — Chốt | 2–3 ngày | Tài liệu này + inventory + IA | Review xong, không còn quyết định mở |
| P1 — Foundation | 3–5 ngày | Token v2, Icon, primitive, component cơ bản, Design Lab | Build pass, lab render đủ light/dark |
| P2 — Shell | 1 tuần | Navigation theme, header factory, sửa shared header, Screen edges, tab badge, state components | Mọi màn có header/back/4 state |
| P3 — Redesign | 1–2 tuần | Redesign theo thứ tự mục 8.3 | Từng màn pass checklist |
| P4 — Polish | 3–5 ngày | A11y, motion, dark QA, web fallback, docs | Release checklist pass |

### 12.2 P1 — chi tiết

1. Tạo `theme/primitive.ts`, `theme/semantic.ts`.
2. `theme/tokens.ts` re-export + alias cũ; thêm `space`, `iconSize`, `elevation`, `motion`, `breakpoint`.
3. `ThemeProvider` trả thêm `icon`, `elevation`, `motion`.
4. Tạo `icons/` + `Icon` component.
5. Tạo primitive: `Box`, `Stack/Row`, `Divider`, `Spinner`, `Skeleton`.
6. Nâng cấp `Button`, `Input`, `Text`; thêm `IconButton`, `Field`, `TextArea`.
7. Chuyển `Avatar` từ `entities/user/ui` xuống `shared/ui/components` (re-export từ entity để không vỡ import).
8. Thêm `Badge`, `Card`, `ListItem`, `Tabs`, `EmptyState`, `ErrorState`, `LoadingState`.
9. Tạo `design-lab` route.
10. Thêm script/lint chặn hex trong `features`/`entities` (xem 12.4).

### 12.3 P2 — chi tiết

1. `navigation-theme.ts` map token → React Navigation; thay `DefaultTheme/DarkTheme`.
2. `header-options.ts` + áp dụng cho các layout.
3. Sửa `(shared)/_layout.tsx`: bật header, title/back cho post/user/hashtag/follow-requests.
4. Sửa `Screen` edges + pattern header.
5. Tab badge Inbox.
6. State components dùng chung; thay các đoạn "Loading..." thủ công.
7. Page template đầu tiên: `ListPage` + `DetailPage`.
8. Settings IA: chuyển từ `(modals)` sang stack `(shared)/settings` theo checklist 7.9; cập nhật `hrefs`, xóa route modal cũ, kiểm tra back/deep link.

### 12.4 Lint và guardrails

Đề xuất:

- Cấm hex/rgb trong `src/features/**` và `src/entities/**` (trừ file test/fixture).
- Cấm `fontSize`, `fontWeight`, `lineHeight` trong feature (dùng `Text` variant).
- Cảnh báo `padding`, `margin`, `gap`, `borderRadius` số lẻ không thuộc scale (không chặn ở P1, chặn ở P3).
- Cấm import `colors` primitive từ feature; chỉ `useTheme()`.
- CI chạy `typecheck`, `lint`, `test`; thêm bước `check:tokens` nếu viết script.

### 12.5 Backward compatibility

- Giữ `colors`, `spacing`, `radius`, `typography` export cũ trong `tokens.ts` ít nhất 1 phase.
- `Text` giữ variant cũ (`title`, `subtitle`, `small`) map sang scale mới; đánh dấu `@deprecated`.
- `Button` giữ API cũ; thêm prop mới optional.
- Không đổi `testID` hiện có; nếu đổi phải cập nhật Maestro.

---

## 13. Definition of Done (UI)

Một màn/component chỉ được coi là xong khi:

- [ ] Dùng token, không hardcode hex/font.
- [ ] Có native header đúng matrix (title/back/action).
- [ ] Safe area đúng, không double padding.
- [ ] Light + dark đều đẹp, contrast đạt.
- [ ] Đủ loading / empty / error / offline.
- [ ] Touch target ≥ 44×44.
- [ ] Có `accessibilityLabel`/role/state.
- [ ] Có `testID` cho phần tử chính.
- [ ] Không layout shift khi loading.
- [ ] Dynamic type 130% không vỡ.
- [ ] Có mặt trong Design Lab nếu là component mới.
- [ ] Có ảnh trước/sau trong PR.
- [ ] Maestro flow pass nếu flow thay đổi.
- [ ] Không thêm dependency UI mới nếu chưa được duyệt.

---

## 14. Governance

### 14.1 Khi nào tạo component mới

- Dùng ở ≥ 2 nơi, hoặc
- Là nền tảng platform (header, screen, list), hoặc
- Thay thế một pattern đang copy-paste.

Không tạo component cho một màn dùng một lần; giữ trong feature.

### 14.2 Khi nào đổi token

- Có lý do UX/a11y rõ ràng.
- Cập nhật tài liệu này + Design Lab.
- Ghi migration note nếu ảnh hưởng screen cũ.
- Không đổi token trong PR feature; tách PR riêng.

### 14.3 Deprecation

- Đánh dấu `@deprecated` + lý do.
- Giữ ít nhất 1 phase.
- Xóa khi `rg` không còn usage.

### 14.4 Review

- 1 UI reviewer cố định cho các PR UI.
- PR UI phải có ảnh light/dark.
- PR không được trộn refactor token + redesign màn lớn.

### 14.5 Versioning

- Tài liệu: `v1.x`.
- Token breaking change: `v2.0` + migration guide.
- Component API breaking change: ghi trong CHANGELOG.

---

## 15. Rủi ro và câu hỏi mở

### 15.1 Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Native header khác nhau iOS/Android | Cao | Test cả 2; dùng `headerOptions` chung; không custom |
| `NativeTabs` còn unstable | Trung bình | Pin Expo SDK; wrap trong 1 file layout |
| Đổi token gây vỡ layout | Cao | Alias tương thích; migrate từng màn |
| Brand blue không đạt contrast | Trung bình | Tách `brand` và `primary`; kiểm tra AA |
| Web bị bỏ rơi | Thấp | Giữ chạy; không đầu tư shell v1 |
| Không có người review UI | Cao | Chốt 1 reviewer; dùng checklist |
| Scope creep sang tablet/web | Trung bình | Non-goals rõ ràng |
| Settings migration vỡ deep link/test cũ | Trung bình | Làm theo checklist 7.9; cập nhật `hrefs` + Maestro cùng PR |

### 15.2 Câu hỏi mở

1. Ngôn ngữ mặc định: `vi` hay `en`? (đề xuất `vi`, fallback `en`)
2. Có cần brand font riêng không? (v1: system font)
3. Có thêm `expo-haptics` cho like/send/delete không? (đề xuất có, P2)
4. Có làm tablet layout không? (đề xuất sau P4)
5. Team size thực tế để chốt timeline?
6. Giữ `showcase` hay xóa sau khi có Design Lab?
7. Danh sách màn con Settings mở rộng ở P2: language, sessions, blocked, about, data export? (đề xuất chốt khi làm 7.9)

---

## Phụ lục A — Mapping token cũ → mới

| Cũ | Mới | Ghi chú |
|---|---|---|
| `colors.light.background` | `background` | giữ trắng |
| `colors.light.backgroundElement` | `surfaceMuted` | đổi tên |
| `colors.light.backgroundSelected` | `borderStrong` | dùng cho selected/border |
| `colors.light.text` | `textPrimary` | đen mềm hơn |
| `colors.light.textSecondary` | `textSecondary` | giữ |
| `colors.light.primary` | `primary` | `#2A72DB` cho AA; `brand` giữ `#3C87F7` |
| `colors.light.danger` | `danger` | giữ đỏ |
| `spacing.xs` | `space[1]` | 4 |
| `spacing.sm` | `space[2]` | 8 |
| `spacing.md` | `space[4]` | 16 |
| `spacing.lg` | `space[6]` | 24 |
| `spacing.xl` | `space[8]` | 32 |
| `radius.sm` | `radius.sm` | 8 |
| `radius.md` | `radius.md` | 12 |
| `radius.lg` | `radius.lg` | 16 |
| `radius.full` | `radius.full` | 9999 |
| `typography.title` 48 | `display` 34 / `h1` 28 | không dùng cho profile |
| `typography.subtitle` 32 | `h2` 22 | |
| `typography.body` 16 | `body` 16 | |
| `typography.small` 14 | `label` 14 | |
| `typography.caption` 12 | `caption` 12 | |

---

## Phụ lục B — Native header snippets

### B.1 Tab stack

```tsx
import { Stack } from "expo-router";
import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

export default function HomeLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={headerOptions(theme, { title: "Home", large: true })}
      />
    </Stack>
  );
}
```

### B.2 Shared detail

```tsx
import { Stack } from "expo-router";
import { useTheme } from "@/shared/ui";
import { headerOptions } from "@/shared/ui/navigation/header-options";

export default function SharedGroupLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen
        name="post/[id]"
        options={headerOptions(theme, { title: "Post" })}
      />
      <Stack.Screen
        name="user/[handle]"
        options={headerOptions(theme, { title: "Profile" })}
      />
      <Stack.Screen
        name="hashtag/[tag]"
        options={headerOptions(theme, { title: "Hashtag" })}
      />
      <Stack.Screen
        name="follow-requests"
        options={headerOptions(theme, { title: "Follow requests" })}
      />
      <Stack.Screen
        name="design-lab"
        options={headerOptions(theme, { title: "Design Lab" })}
      />
    </Stack>
  );
}
```

### B.3 Header right action

```tsx
options={headerOptions(theme, {
  title: "Profile",
  right: () => (
    <IconButton
      icon="settings"
      accessibilityLabel="Settings"
      onPress={() => router.push(hrefs.settings())}
    />
  ),
})}
```

### B.4 Search (iOS native)

```tsx
options={{
  ...headerOptions(theme, { title: "Search" }),
  headerSearchBarOptions: {
    placeholder: "Search people and posts",
    onChangeText: (event) => setQuery(event.nativeEvent.text),
  },
}}
```

Android: giữ header title, đặt `SearchBar` trong content.

### B.5 Tab badge

```tsx
<NativeTabs.Trigger name="(inbox)">
  <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
  <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
  <NativeTabs.Trigger.Badge>{unreadLabel}</NativeTabs.Trigger.Badge>
</NativeTabs.Trigger>
```

(Kiểm tra API badge của SDK 57; nếu chưa hỗ trợ, dùng `badgeValue` trong options.)

---

## Phụ lục C — Checklist component mới

- [ ] Có trong `shared/ui` và export qua `index.ts`.
- [ ] API tối giản, không rò rỉ business.
- [ ] Dùng semantic token.
- [ ] Light/dark.
- [ ] Loading/disabled/pressed.
- [ ] Accessibility label/role/state.
- [ ] Touch target.
- [ ] `testID`.
- [ ] Unit test cho logic (nếu có).
- [ ] Có trong Design Lab.
- [ ] Có ví dụ sử dụng trong doc hoặc lab.
- [ ] Không thêm dependency mới.

---

## Phụ lục D — Việc làm ngay sau khi tài liệu được duyệt

1. Tạo `docs/design-system.md` (tài liệu này) — xong.
2. Tạo `src/shared/ui/theme/primitive.ts` + `semantic.ts`.
3. Cập nhật `tokens.ts` re-export, giữ alias.
4. Tạo `Icon` + `icons/icon-map.ts`.
5. Tạo `design-lab` route + screen.
6. Sửa `(shared)/_layout.tsx` bật header native.
7. Sửa `Screen` edges theo header.
8. Thêm navigation theme từ token.
9. Chuyển `ProfileHeader` từ `title` 48 → `h2`.
10. Thay text glyph `…` bằng `Icon name="more"`.
11. Chuyển Settings sang stack `(shared)/settings` theo checklist 7.9.
12. Cập nhật `hrefs`, xóa route modal cũ, test back/deep link của Settings.
