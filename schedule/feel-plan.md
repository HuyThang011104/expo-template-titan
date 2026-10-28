# Plan Feel & Anatomy (PF0 → PF9)

> Spec: `docs/feel-spec.md` v1.0 (Approved) — file này **không thay đổi quyết định** trong spec.
> File này là kế hoạch thi công wave "Feel": chia PR, thứ tự phụ thuộc, file chạm, cách verify, trạng thái.
> Mỗi mục `PF*.x` = **1 PR độc lập**. Không gộp 2 mục vào một PR.
> Khi code khác spec, ghi vào §14 (quyết định) rồi sửa spec ở PR docs riêng — không sửa spec trong PR feature.
>
> Quan hệ với `schedule/ui-implementation-plan.md`: P1–P3 đã xong. Wave này thay thế vị trí
> P4 cũ; **P4 cũ (polish/a11y/legacy) trở thành PF9.2** và chạy cuối cùng.

| Trường | Giá trị |
|---|---|
| Spec | `docs/feel-spec.md` v1.0 Approved |
| Trạng thái plan | Draft — chưa bắt đầu |
| Ngày | 2026-10-28 |
| Phạm vi | Anatomy mọi feature screen, feel primitives, icon map, modal headers |
| Liên quan | `docs/design-system.md` v1.1, `AGENTS.md`, `schedule/ui-implementation-plan.md` |
| Nền tảng | Expo SDK 57, RN 0.86, Reanimated 4, keyboard-controller, gesture-handler, FlashList 2.0.2 |

---

## 0. Hiện trạng (đối chiếu code, 2026-10-28)

| Hạng mục | Trạng thái thật |
|---|---|
| P1–P3 (design system) | Xong; token/component/native header/state đã áp dụng |
| Anatomy (spec §3, A1–A15) | **Chưa sửa**: composer header tự vẽ trong body, PostCard ảnh fixed 200px + 2 hàng action, comment không avatar, report/edit-post trùng header, chat dùng RN KAV, media-viewer placeholder, profile header ngoài list, notif row chưa thumbnail |
| `expo-haptics` | Chưa cài — cần thêm (F7) + **rebuild dev client 1 lần** |
| `@expo/ui`, `expo-glass-effect` | Đã cài, **0 import** — để yên (F9) |
| Camera capture | Kernel **đã có**: `takePhoto()` + `ensureCameraAccess()` + plugin native (`shared/media/picker.ts:91`, `plugins/with-titan-permissions.js`) — chỉ chưa wire vào composer/chat |
| FlashList 2.0.2 | Không expose `stickyHeaderIndices` (chỉ internal) → profile tabs không sticky (D6) |
| Reanimated / gesture-handler | Reanimated chỉ dùng cho skeleton; gesture-handler chỉ có RootView — feel wave dùng cả hai |
| Maestro | 13 flow trong `e2e/flows/` — xem Phụ lục A |
| Href `post` | Chỉ nhận `id`; cần thêm param focus cho comment affordance (PF3.1) |

---

## 1. Nguyên tắc thi công

1. **Tầng dưới trước**: dep/haptics → primitives → surface (composer → feed → detail → profile → inbox → chat → search → modals → settings → polish).
2. **1 PR = 1 mục PF**. PR lớn nhất được phép: 1 surface (2 màn dùng chung component).
3. **Không phá public API**: giữ props hiện có; thêm optional. `PostCard` giữ callback pattern.
4. **Không đổi `testID`** hiện có; nếu buộc đổi chủ thể, sửa Maestro cùng PR.
5. **Không thêm dependency** ngoài `expo-haptics` (đã duyệt). Không UI kit, không `react-native-svg`.
6. Mỗi PR phải xanh:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm exec eslint .
   pnpm test -- --ci
   pnpm check:tokens
   pnpm lint:boundaries
   ```
7. PR UI phải có ảnh light + dark ở 360–430pt; PR primitive phải thêm vào Design Lab cùng PR.
8. **Reduce motion** là điều kiện xong, không phải nice-to-have: mọi animation tự viết phải test bật/tắt.
9. **Device QA** bắt buộc (ghi rõ trong PR): composer header/keyboard, like motion, Q7 title, chat keyboard, media viewer zoom.
10. **Boundary giữ nguyên**: primitive mới ở `shared/ui`; `MediaGrid` ở `entities/post/ui`; feature không import feature; không sửa token.

---

## 2. Thứ tự và phụ thuộc

```text
PF0.1 Haptics dep + util
  ├─> PF1.x Composer (post haptic)
  ├─> PF2.1 PostCard (like haptic)
  └─> PF3.1 Comments (send haptic)

PF0.2 Feel primitives (PressableScale, ComposerInput, CounterRing)
  ├─> PF1.2 Composer toolbar/ring
  ├─> PF2.1 PostCard (PressableScale)
  ├─> PF3.1 Comment composer (ComposerInput)
  └─> PF6.2 Chat composer (ComposerInput)

PF0.3 AppList onScroll ──────────────> PF4.2 Q7 title
PF0.4 Icons (+play/pause/volume/flag) ─> PF2.2 Video, PF5.2 Thumbnail, PF8.2 Viewer
PF0.5 MediaGrid (entities/post) ─────> PF2.1 PostCard

PF1.1 Composer header+body ─> PF1.2 Composer toolbar
PF2.1 PostCard+Feed ─> PF3.1 Comments
                   └─> PF4.1 Profile (list dùng PostCard)
PF4.1 Profile anatomy ─> PF4.2 Q7 title
PF5.1 Inbox anatomy ─> PF5.2 Q8 thumbnail
PF6.1 Chat chrome ─> PF6.2 Bubbles/composer
PF8.1 Modals header actions (độc lập, cần PF0.2)
PF8.2 Media viewer (cần PF0.4)
PF8.3 Auth pill (độc lập, tiny)
PF9.1 Settings (độc lập)
PF9.2 Ship polish (sau tất cả)
```

---

## 3. PF0 — Foundation

### PF0.1 Haptics dep + util

**Tạo**
```text
src/shared/lib/haptics.ts
src/shared/lib/__tests__/haptics.test.ts
```

**Sửa**
```text
package.json   # expo-haptics (expo install)
```

**Contract**

- `hapticLight()`, `hapticSuccess()`, `hapticWarning()`; try/catch no-op; web no-op; kill-switch const `HAPTICS_ENABLED`.
- Feature **không** import `expo-haptics` trực tiếp — chỉ qua util (spec §5.4).
- Thêm dep native → **rebuild dev client 1 lần** (AGENTS); ghi bước này vào PR description.

**Xong khi**
- [ ] Test: web → no-op; throw từ native → không crash.
- [ ] `pnpm` gates xanh; app vẫn boot sau rebuild.

**Rủi ro**: haptics im lặng trên emulator — QA trên máy thật.

---

### PF0.2 Feel primitives

**Tạo**
```text
src/shared/ui/primitives/pressable-scale.tsx
src/shared/ui/components/composer-input.tsx
src/shared/ui/components/counter-ring.tsx
src/shared/ui/**/__tests__/  (3 test)
```

**Sửa**
```text
src/shared/ui/index.ts
src/shared/ui/lab/design-lab-screen.tsx
```

**Contract**

- `PressableScale`: scale `1→0.97` + opacity, `motion.fast`, spring về 1; `disabled` tắt; `useReducedMotion` → opacity-only.
- `ComposerInput`: `TextInput` borderless, auto-grow (`minLines`/`maxLines`), `body` variant, controlled; không bọc `Field`.
- `CounterRing`: **không dùng SVG** (không có dep) — vẽ vòng bằng 2 nửa cung View + rotation; `value/max/warnFrom`; màu `primary→warning→danger`; ẩn khi dưới ngưỡng; `accessibilityLabel` đếm ký tự.
- Design Lab: thêm mục cho 3 component (light/dark, reduce-motion preview).

**Xong khi**
- [ ] Test reduce-motion on/off (PressableScale, CounterRing).
- [ ] ComposerInput: gõ nhiều dòng tự giãn, cuộn khi vượt `maxLines`.
- [ ] CounterRing đúng ở 0 / 259 / 260 / 280 / >280.

**Rủi ro**: ring 2-nửa-cung lệch 1px trên Android — QA 320/360/430pt.

---

### PF0.3 AppList scroll passthrough

**Sửa**
```text
src/shared/ui/list.tsx
```

**Contract**

- Thêm optional `onScroll` + `scrollEventThrottle` (passthrough xuống FlashList); không đổi API cũ.
- Không tự gắn handler ở wrapper — screen quyết định.

**Xong khi**
- [ ] Typecheck với `useAnimatedScrollHandler` và handler JS thường.
- [ ] Không đổi hành vi refresh/onEndReached.

---

### PF0.4 Icons bổ sung

**Sửa**
```text
src/shared/ui/icons/icon-map.ts
src/shared/ui/icons/__tests__/icon-map.test.tsx (nếu cần cập nhật snapshot/list)
```

**Contract**

- Thêm `play`, `pause`, `volume`, `volumeOff`, `flag` (đủ 3 platform).
- Không thêm icon chưa có call site (`reply`, `at` để sau).

**Xong khi**
- [ ] Key parity 3 platform pass; Design Lab hiển thị icon mới.

---

### PF0.5 MediaGrid

**Tạo**
```text
src/entities/post/ui/media-grid.tsx
src/entities/post/ui/__tests__/media-grid.test.tsx
```

**Sửa**
```text
src/entities/post/index.ts
```

**Contract**

- Props: `media: PostMedia[]`, `onPress?: (index) => void`, `maxHeight`.
- 1 ảnh: aspect thật; thiếu metadata → 4:5, `maxHeight 420`. 2: 2 cột vuông. 3: 1 lớn + 2 nhỏ. 4: lưới 2×2. Gap `space[1]`, `radius.md`.
- Video: poster + badge `play` (PF0.4).
- Không fetch; chỉ render; không navigation (callback do feature).

**Xong khi**
- [ ] Test 1/2/3/4 ảnh + video + thiếu metadata.
- [ ] Không layout shift khi ảnh load (dùng `expo-image` + placeholder).

---

## 4. PF1 — Composer

### PF1.1 Composer header + body

**Sửa**
```text
src/features/composer/screens/composer-screen.tsx
```

**Contract**

- Native header: `headerLeft` = IconButton `close` (giữ `composer-dismiss-button`), `headerRight` = pill Post (`composer-post-button`), title "New post" giữ ở layout. Dùng `<Stack.Screen options>` trong screen (không import `@react-navigation/*`).
- Bỏ h1 + hàng `Dismiss/Post` trong body; bỏ header tự vẽ.
- Body: `Avatar me 40` + `ComposerInput` auto-grow (placeholder "What's happening?"), autoFocus.
- Giữ: draft, mention-gate, validation, error/queued caption, testID `composer-input`.

**Xong khi**
- [ ] Không còn `Button`/`h1` trong body; action chỉ ở native header.
- [ ] Keyboard + toolbar không che input; dismiss trả đúng màn.
- [ ] Maestro `composer.yaml` pass (sửa nếu selector đổi).
- [ ] Device QA iOS + Android.

**Rủi ro**: `headerRight` cần state `canPost/busy` — options re-render khi state đổi, **không** re-render mỗi keystroke (counter ở PF1.2).

---

### PF1.2 Composer toolbar + counter + camera

**Sửa**
```text
src/features/composer/screens/composer-screen.tsx
src/features/composer/components/composer-media-strip.tsx
src/features/composer/hooks/use-composer-media.ts
```

**Contract**

- Toolbar pin đáy (trên keyboard): `IconButton image` (giữ `composer-media-add`), `IconButton camera` → `takePhoto()` (kernel đã có; **không** phải feature mới) → append vào media list.
- `CounterRing` hiển thị bên phải toolbar từ `260/280`; testID `composer-counter` chuyển sang ring; `<260` ẩn hoàn toàn.
- Media strip giữ 72px/remove button; `Uploading…/Queued/error` thành dòng `caption` trên toolbar.
- Không đổi upload pipeline, outbox, `COMPOSER_MAX_MEDIA`.

**Xong khi**
- [ ] Camera mở đúng quyền; denied → không crash, không thông báo lỗi thô.
- [ ] Ring đúng ngưỡng, không nhảy layout khi hiện/ẩn (reserve chỗ).
- [ ] Maestro `composer.yaml` pass; device QA.

---

## 5. PF2 — Feed + PostCard

### PF2.1 PostCard anatomy + feed

**Sửa**
```text
src/entities/post/ui/post-card.tsx
src/entities/post/ui/post-actions.tsx
src/entities/post/ui/post-body.tsx
src/entities/post/index.ts            # nếu export type mới
src/features/feed/components/feed-list.tsx
src/features/feed/components/feed-skeleton.tsx   # khớp anatomy mới
src/features/search/components/search-results.tsx
src/features/profile/components/profile-posts-list.tsx
```

**Contract**

- Flat row trên `background`, divider hairline `border` giữa item (bỏ gap 8px); PostCard không còn `Card` ở feed (giữ khả năng dùng Card nếu prop `surface` nếu cần — mặc định flat).
- Header row: Avatar 40 + (name / `@handle · time`) + `more`; timestamp **rời đáy card**.
- Body: clamp 8 dòng + "more" mở rộng tại chỗ (tap không bubble navigation — chặn bằng `onPress` trên span/row).
- Media: `MediaGrid` (PF0.5); bỏ `POST_IMAGE_HEIGHT = 200`.
- Action row **duy nhất**: comment · like · (giãn) · share · save. Thêm prop `onCommentPress?`; item comment mở detail (autofocus để PF3.1).
- Like: `PressableScale` + `hapticLight()` + spring heart (reduce motion → opacity); unlike không haptic.
- Long-press card → mở overflow (cùng handler với `more`).
- Giữ API/testID: `post-card-<id>`, `like-button-<id>`, callback pattern, canonical `usePost`.

**Xong khi**
- [ ] Feed/search/profile/comments dùng chung vỏ mới, không nháy khi scroll (FlashList).
- [ ] Like 10 lần liên tiếp không layout shift; reduce motion tắt spring.
- [ ] Maestro `auth-and-feed`, `save-share`, `hashtag`, `search`, `video-feed` pass (cập nhật selector nếu cần).
- [ ] Ảnh before/after light/dark; device QA.

**Rủi ro**: `onPress` của "more" bên trong `Link`+`Pressable` — ngăn bubble bằng `onPress` handler riêng; QA tap chính xác.

---

### PF2.2 Video overlay icons

**Sửa**
```text
src/entities/post/ui/post-video.tsx
src/entities/post/ui/__tests__/post-video.test.tsx
```

**Contract**

- Thay glyph `▶`/`🔇` bằng `Icon play/pause/volume/volumeOff`; tap toggle play/pause; nút mute riêng.
- Giữ `isActive`/viewability; pause khi `isActive=false`; không autoplay nhiều.
- Overlay dùng `PressableScale`, hit area 44.

**Xong khi**
- [ ] Không còn ký tự glyph trong code; a11y label cho từng nút.
- [ ] Maestro `video-feed.yaml` pass; device QA.

---

## 6. PF3 — Post detail + comments

### PF3.1 Comment row + composer

**Sửa**
```text
src/entities/comment/ui/comment-row.tsx
src/features/post-detail/components/comment-composer.tsx
src/features/post-detail/screens/post-detail-screen.tsx
src/features/post-detail/components/comments-list.tsx
src/shared/navigation/hrefs.ts        # post(id, focus?)
```
Route giữ thin (không sửa); screen đọc `useLocalSearchParams`.

**Contract**

- Row: `Avatar 32` + name `@handle · time` + body + action (like sm, Reply); reply indent `32 + 8`; pending Skeleton.
- Composer: pill `ComposerInput` + `IconButton send` (chỉ hiện khi có text) + reply banner; giữ keyboard-controller.
- `hrefs.post(id, focus?: "comment")`; detail autoFocus composer khi `focus=comment`.
- Giữ testID hiện có của comment/like/reply; canonical cache không đổi.

**Xong khi**
- [ ] Tap comment trên PostCard → mở detail, composer focus.
- [ ] Keyboard không che composer; reply banner dismiss đúng.
- [ ] Maestro `comments.yaml` pass; device QA iOS + Android.

---

## 7. PF4 — Profile

### PF4.1 Profile anatomy (me + user)

**Tạo**
```text
src/features/profile/components/profile-overflow-sheet.tsx
```

**Sửa**
```text
src/features/profile/screens/profile-screen.tsx
src/features/profile/screens/user-detail-screen.tsx
src/features/profile/components/profile-header.tsx
src/features/profile/components/profile-posts-list.tsx
src/features/profile/screens/edit-profile-screen.tsx    # chỉ nếu bị ảnh hưởng layout
```

**Contract**

- Một scroll container: `ProfilePostsList` nhận `ListHeaderComponent` (header + follow-requests + Tabs); header ra khỏi body cố định.
- Header: cover 140, Avatar 96 đè (−32, viền `background` 3), h2 name, `@handle`, bio/link, stats 1 dòng (`tabular-nums`), action pill fullWidth.
- Me: `headerRight` `IconButton more` → Sheet (Follow requests badge N, Settings, Sign out danger). Giữ `profile-sign-out-button` trên item trong Sheet → **Maestro `profile.yaml` mở menu trước**.
- User: `FollowButton`/Edit trong action; overflow = report/block/share.
- Private/blocked → `EmptyState` lock.
- Tabs không sticky (D6) — chấp nhận trong wave; giữ testID tabs/list.
- Không đổi `useUserPosts`/`useSavedPosts`/canonical ids.

**Xong khi**
- [ ] Cuộn: cover/header trôi, list mượt; pull-to-refresh hoạt động.
- [ ] Maestro `profile.yaml`, `follow.yaml` pass (đã sửa sign-out).
- [ ] Ảnh before/after; device QA.

**Rủi ro**: đưa header vào `ListHeaderComponent` làm mất `flex:1` cũ — kiểm tra empty state + footer height.

---

### PF4.2 Q7 — Header title transition

**Tạo**
```text
src/features/profile/components/profile-title.tsx
src/features/profile/lib/title-progress.ts            # pure helper + test
src/features/profile/lib/__tests__/title-progress.test.ts
```

**Sửa**
```text
src/features/profile/screens/profile-screen.tsx
src/features/profile/screens/user-detail-screen.tsx
src/features/profile/components/profile-header.tsx    # onLayout khối identity
```

**Contract**

- `scrollY` + `switchRange` shared value; `switchRange` đo bằng `onLayout` (`start = y + h − 48`, `end = y + h`).
- `AppList onScroll` ghi `scrollY.value` (một write); nếu device QA xác nhận worklet trên FlashList v2 Android → đổi `useAnimatedScrollHandler`, giữ API.
- `navigation.setOptions({ headerTitle })` **một lần** khi data sẵn sàng; không gọi trong scroll; cleanup khi unmount.
- `ProfileHeaderTitle`: 2 `Text` chồng, opacity `1−p` / `p`; `numberOfLines=1`, maxWidth ~60%; khớp `headerTitleStyle` (17/600).
- Reduce motion → p = 0/1 tại ngưỡng; a11y label đổi bằng `useAnimatedReaction` + `runOnJS` chỉ khi vượt ngưỡng (guard ref); text con `accessible={false}`.
- TestID `profile-title-handle`, `profile-title-name`.
- Pure helper test: clamp, ngưỡng, scrollY âm.

**Xong khi**
- [ ] QA matrix spec §4.4.1: push 2 profile, data muộn, tên dài, Android align, dynamic type 130%, reduced motion on/off, cả 2 platform.
- [ ] Không re-render navigator trong lúc scroll (kiểm tra profiler/re-render log).
- [ ] Header title không nhấp nháy khi pull-to-refresh overscroll.

**Rủi ro**: FlashList v2 Android không nhận worklet handler → fallback JS write đã định nghĩa trong spec; **không** đổi approach mà không ghi §14.

---

## 8. PF5 — Inbox

### PF5.1 Inbox anatomy

**Sửa**
```text
src/features/inbox/screens/inbox-screen.tsx
src/features/inbox/components/notifications-list.tsx
src/features/inbox/components/notification-row.tsx   # phần anatomy, chưa thumbnail
```

**Contract**

- Bỏ header tự vẽ: title "Inbox" từ native; "Mark all read" → `headerRight` text-button `primary` (giữ testID hiện có).
- Row = ListItem pattern: Avatar 40 + actor/verb + relative time + trailing cluster (dot); unread nền `primarySoft` fade-out (motion.base).
- List → `AppList`; giữ refresh/infinite/footer/testID.
- Không đụng mutation mark-read/prefetch/href.

**Xong khi**
- [ ] Maestro `notifications.yaml` pass; device QA light/dark.

---

### PF5.2 Q8 — Notification thumbnail

**Sửa**
```text
src/features/inbox/components/notification-row.tsx
src/features/inbox/components/__tests__/notification-row.test.tsx   # nếu có; thêm mới nếu chưa
```

**Contract**

- Thumbnail 44×44 `expo-image` từ `getPostData(qc, postId)?.media[0]` — **cache-only**, không fetch, không skeleton, không đổi minHeight.
- Điều kiện `postId != null` + `kind ∈ {like, post, mention}`; video → poster + badge `play`.
- testID `notification-thumb-<id>`; `accessible={false}`.
- Thiếu cache → không render; không thêm query per row.

**Xong khi**
- [ ] Test: có cache → thumb; không cache → không thumb; video → badge.
- [ ] Không phát sinh network request khi mở inbox (kiểm tra query log).
- [ ] Device QA.

---

## 9. PF6 — Chat

### PF6.1 Chat chrome + keyboard + list

**Sửa**
```text
src/features/chat/screens/chat-detail-screen.tsx
src/features/chat/screens/chat-list-screen.tsx
src/features/chat/components/conversation-row.tsx
src/features/chat/components/conversation-list.tsx
```

**Contract**

- Detail: bỏ header tự vẽ trong body; title = tên peer; `headerRight` `IconButton more` → Sheet (view profile/block/report).
- **Keyboard**: dùng keyboard-controller `KeyboardAvoidingView` (bỏ RN KAV + `keyboardVerticalOffset`).
- Chat list → `AppList`; conversation row giữ anatomy (avatar 48 + presence + typing + badge).
- Presence trong detail: typing indicator (giữ) + "Seen" (giữ); hết dòng status tự vẽ.

**Xong khi**
- [ ] Maestro `chat.yaml` pass; keyboard mở/đóng không che composer ở cả 2 platform; device QA.

---

### PF6.2 Chat bubbles + composer

**Sửa**
```text
src/features/chat/components/message-bubble.tsx
src/features/chat/components/message-list.tsx
src/features/chat/components/chat-composer.tsx
```

**Contract**

- Bubble: maxWidth 75%; `radius.lg` trừ góc sát người gửi `radius.sm`; mine `primary/onPrimary`, theirs `surfaceMuted/textPrimary`; ảnh full-bleed max 220.
- Timestamp nhóm: chỉ hiện khi cách tin trước ≥ 5 phút; status Sending/Sent/Seen/Queued chỉ trên bubble cuối của mình.
- Composer: pill `ComposerInput` 1–5 dòng; `IconButton camera` → `takePhoto()` (kernel có sẵn); `IconButton send` chỉ hiện khi có text; preview ảnh 96 giữ.
- Không đổi optimistic/mutations/outbox.

**Xong khi**
- [ ] Maestro `chat.yaml` pass; gửi 10 tin liên tiếp timestamp/status đọc được.
- [ ] Device QA light/dark + keyboard.

---

## 10. PF7 — Search

### PF7.1 Search anatomy

**Sửa**
```text
src/features/search/screens/search-screen.tsx
src/features/search/screens/hashtag-screen.tsx        # nếu Header dùng chung
src/features/search/components/search-results.tsx
src/features/search/components/trending-list.tsx
src/features/search/components/search-history-list.tsx
src/features/search/components/search-bar.tsx
```

**Contract**

- Kết quả có `Tabs segmented` Top | People | Posts (component có sẵn, lần đầu dùng thật); Top = 3 people + posts.
- Android search field: pill `surfaceSunken` + `IconButton close` trailing (bỏ Button "Clear" chữ); iOS giữ native search bar.
- Trending row = ListItem: số hạng (h3 `textTertiary`) + `#tag` + "N posts"; history row clear = IconButton close.
- Lists → `AppList`.
- Giữ canonical PostCard/UserRow, testID hiện có.

**Xong khi**
- [ ] Maestro `search.yaml`, `hashtag.yaml` pass; segmented tabs a11y `role=tab`; device QA.

---

## 11. PF8 — Modals + Auth

### PF8.1 Report / edit-post / edit-profile header actions

**Sửa**
```text
src/features/moderation/screens/report-screen.tsx
src/features/post-detail/screens/edit-post-screen.tsx
src/features/profile/screens/edit-profile-screen.tsx
```

**Contract**

- Header hệ thống: report (`Dismiss` trái, pill `Submit` phải), edit-post (`Cancel`, pill `Save`), edit-profile (`Cancel`, pill `Save`); **bỏ** hàng nút + h1 trùng trong body.
- edit-post/edit-profile body: `ComposerInput` (hoặc Field cho bio/name), counter giữ dạng caption.
- Giữ testID (nếu đổi chủ thể Button → header, giữ nguyên testID trên element mới); radio row report giữ.
- Không đổi mutation/validation.

**Xong khi**
- [ ] Maestro `edit-post.yaml`, `moderation.yaml` pass; device QA modal dismiss + keyboard.

---

### PF8.2 Media viewer thật

**Tạo**
```text
src/features/post-detail/components/media-viewer-image.tsx   # gesture zoom/pan
```

**Sửa**
```text
src/features/post-detail/screens/media-viewer-screen.tsx
```
Route modal giữ thin (không sửa); screen đọc params.

**Contract**

- Full-screen `modal`, nền đen; `expo-image` + gesture-handler (pinch, pan, double-tap zoom); close `IconButton` overlay top-trailing; video dùng `expo-video` fullscreen controls.
- Không swipe-to-dismiss custom (dùng gesture native của modal) — PD6.
- Giữ route/testID; a11y label cho close; reduce motion → bỏ zoom animation (vẫn cho zoom tĩnh).

**Xong khi**
- [ ] Mở từ PostCard/comment media; zoom/pan mượt 60fps trên máy thật; thoát đúng.
- [ ] Video phát/dừng đúng; không autoplay khi đóng.
- [ ] Device QA iOS + Android (gesture conflict với modal dismiss).

---

### PF8.3 Auth submit pill

**Sửa**
```text
src/features/auth/components/auth-form.tsx
```

**Contract**

- Submit `Button size="lg" radius full` fullWidth; giữ validation/error inline/testID.
- Không thêm social login.

**Xong khi**
- [ ] Maestro `auth-and-feed.yaml` pass.

---

## 12. PF9 — Settings + Ship

### PF9.1 Settings anatomy

**Sửa**
```text
src/features/settings/screens/settings-screen.tsx
src/features/settings/screens/notif-settings-screen.tsx
src/features/settings/components/pref-toggle-row.tsx
src/features/settings/screens/privacy-settings-screen.tsx
src/features/settings/screens/account-settings-screen.tsx   # nếu có
```

**Contract**

- Hub: inset-grouped — `Card` chứa `ListItem` + `Divider`, `overline` section label.
- `PrefToggleRow` → `ListItem` + native `Switch` trailing (bỏ row tay).
- Sub-screen loading/error → `LoadingState`/`ErrorState`.
- Giữ testID/hrefs/back stack.

**Xong khi**
- [ ] Dark + light; switch pending chỉ khóa row của nó; device QA back stack.

---

### PF9.2 Ship polish (= P4 cũ)

**Sửa**: theo `schedule/ui-implementation-plan.md` §6 (a11y sweep, dynamic type 130–150%, reduce motion toàn app, dark QA + contrast, web chạy được, xóa alias legacy khi `rg` hết usage, quyết định `showcase`, docs `design-system.md` v1.2 + CHANGELOG, `check:tokens` warn padding/margin/gap/borderRadius).

**Bổ sung cho wave này**
```text
docs/design-system.md   # v1.2: header matrix composer/author, cross-ref feel-spec
docs/feel-spec.md       # đóng nợ đã xử lý (nếu có), ghi version
schedule/ui-implementation-plan.md   # đánh dấu P4 hoàn tất (giờ là PF9.2)
```

**Xong khi**
- [ ] Checklist `design-system.md` §13 + `feel-spec.md` §10 pass toàn bộ.
- [ ] Maestro 13 flow pass; TalkBack + VoiceOver smoke.
- [ ] Không còn `ThemedText/ThemedView` usage; `showcase` đã xử lý.

---

## 13. Verify chung

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
pnpm check:tokens
pnpm lint:boundaries

# boundary greps
rg "palette" src/features src/entities                 # = 0
rg "setQueryData" src/features                         # = 0 (chỉ entity cache)
rg "expo-haptics" src/features                         # = 0 (chỉ shared/lib)

# device (mỗi PR liên quan)
# - light/dark, 360–430pt
# - composer: header actions, keyboard, camera, ring
# - feed: like motion + haptic, media grid, long-press menu
# - profile: scroll header + Q7 title, overflow menu, back stack
# - inbox: unread fade, thumbnail (cache hit/miss)
# - chat: keyboard-controller, bubble grouping
# - modals: header actions, media viewer zoom, dismiss
# - e2e/flows/*.yaml liên quan (Phụ lục A)
```

---

## 14. Quyết định cần chốt trước PF0.1

| # | Câu hỏi | Đề xuất | Ảnh hưởng |
|---|---|---|---|
| PD1 | `CounterRing` đặt ở đâu? Spec §4.2 diagram đặt ở toolbar, rule 6 lại ghi "quanh nút Post" | **Toolbar** (phải media icons); sửa spec §4.2 rule 6 ở PR docs riêng | PF1.2 |
| PD2 | Camera ở composer/chat: có phải feature mới? | **Không** — kernel đã có `takePhoto()` + permission + plugin; chỉ wire | PF1.2, PF6.2 |
| PD3 | Profile tabs không sticky (D6) trong wave này? | **Chấp nhận** tabs cuộn theo header; nếu QA thấy khó dùng → SectionList ở PR riêng | PF4.1 |
| PD4 | Comment affordance mở detail có autofocus ngay? | **Không** ở PF2.1 (chỉ navigate); PF3.1 thêm `?focus=comment` + autoFocus | PF2.1, PF3.1 |
| PD5 | Settings group: hub 1 group (Notifications/Privacy/Account), notifications 1 group "Activity"? | **Có** | PF9.1 |
| PD6 | Media viewer v1 có swipe-to-dismiss custom? | **Không** — dùng gesture native của modal; chỉ pinch/pan/double-tap zoom | PF8.2 |
| PD7 | Rebuild dev client sau khi thêm `expo-haptics`? | **Có, 1 lần** sau PF0.1 (AGENTS: chỉ rebuild khi thêm native lib) | PF0.1 |

> PD1 phải chốt trước PF1.2; các mục còn lại chốt trước PR tương ứng.

---

## 15. Trạng thái

| Mục | Trạng thái | Size | Ghi chú |
|---|---|---|---|
| PF0.1 — Haptics dep + util | [ ] | S | Rebuild dev client 1 lần |
| PF0.2 — Feel primitives | [ ] | M | Ring không SVG |
| PF0.3 — AppList scroll passthrough | [ ] | S | |
| PF0.4 — Icons bổ sung | [ ] | S | play/pause/volume/volumeOff/flag |
| PF0.5 — MediaGrid | [ ] | M | entities/post |
| PF1.1 — Composer header + body | [ ] | M | PD4 liên quan |
| PF1.2 — Composer toolbar + counter + camera | [ ] | M | PD1, PD2 chốt trước |
| PF2.1 — PostCard + feed | [ ] | L | Ảnh hưởng 5 flow Maestro |
| PF2.2 — Video overlay icons | [ ] | S | |
| PF3.1 — Comment row + composer | [ ] | M | focus param |
| PF4.1 — Profile anatomy | [ ] | L | Sign out vào Sheet |
| PF4.2 — Q7 title transition | [ ] | M | QA matrix bắt buộc |
| PF5.1 — Inbox anatomy | [ ] | M | |
| PF5.2 — Q8 notif thumbnail | [ ] | S | Cache-only |
| PF6.1 — Chat chrome + keyboard + list | [ ] | M | Bỏ RN KAV |
| PF6.2 — Chat bubbles + composer | [ ] | M | Camera wiring |
| PF7.1 — Search anatomy | [ ] | M | Segmented tabs lần đầu dùng |
| PF8.1 — Report/edit-post/edit-profile headers | [ ] | M | |
| PF8.2 — Media viewer thật | [ ] | M | Gesture |
| PF8.3 — Auth submit pill | [ ] | S | |
| PF9.1 — Settings anatomy | [ ] | S | |
| PF9.2 — Ship polish (P4 cũ) | [ ] | L | Đóng cả 2 plan |

---

## Phụ lục A — Maestro flow bị ảnh hưởng

| Flow | PR có thể phải sửa |
|---|---|
| `composer.yaml` | PF1.1, PF1.2 |
| `auth-and-feed.yaml` | PF2.1, PF8.3 |
| `save-share.yaml` | PF2.1 |
| `video-feed.yaml` | PF2.1, PF2.2 |
| `comments.yaml` | PF3.1 |
| `profile.yaml` | PF4.1, PF4.2 (sign out qua menu) |
| `follow.yaml` | PF4.1 |
| `notifications.yaml` | PF5.1, PF5.2 |
| `chat.yaml` | PF6.1, PF6.2 |
| `search.yaml` | PF2.1, PF7.1 |
| `hashtag.yaml` | PF2.1, PF7.1 |
| `edit-post.yaml` | PF2.1, PF8.1 |
| `moderation.yaml` | PF8.1 |

> Nguyên tắc: flow sửa **trong cùng PR** làm đổi selector/hành vi. Không đổi `testID` nếu có thể.

## Phụ lục B — Việc làm ngay

1. Chốt PD1 (+ PD2–PD7 nếu muốn).
2. PF0.1 → rebuild dev client 1 lần.
3. PF0.2–PF0.5 (có thể song song theo phụ thuộc §2).
4. Bắt đầu surface đầu tiên: PF1.1.
