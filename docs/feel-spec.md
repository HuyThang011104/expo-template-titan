# Feel & Anatomy Spec — Titan Social

> **Content-first · Native chrome · Feedback everywhere**
>
> `design-system.md` là nguồn chuẩn cho **token và component** (màu, chữ, spacing, variant).
> Tài liệu này là nguồn chuẩn cho **bộ khung màn hình và cảm giác tương tác** (anatomy,
> motion, haptics, native chrome). Hai file không chồng lấn: cái này nói "màn hình có
> cấu trúc gì và phản hồi thế nào", cái kia nói "vẽ bằng token nào".

| Trường | Giá trị |
|---|---|
| Trạng thái | **Approved v1.0 — đã chốt toàn bộ quyết định** |
| Ngày | 2026-10-28 |
| Phạm vi | Anatomy của mọi feature screen, `shared/ui` (feel primitives), icon map, modal presentation |
| Liên quan | `docs/design-system.md` v1.1, `AGENTS.md`, `schedule/ui-implementation-plan.md` |
| Nền tảng | Expo SDK 57, RN 0.86, New Architecture, Reanimated 4, keyboard-controller, gesture-handler |
| Kế hoạch thi công | `schedule/feel-plan.md` (chưa tạo — chờ lệnh) |

> v1.0 (2026-10-28): Q7 + Q8 đưa vào phạm vi (thiết kế đầy đủ ở §4.4.1, §4.5.1);
> các mục hoãn ghi ở Phụ lục C. Không còn quyết định mở.

> Bối cảnh: P1–P3 đã đổi "da" (token/typography/component). Đặc sản của P1–P3 là
> restyle đúng token, nhưng **anatomy giữ nguyên từ giai đoạn prototype**: header tự vẽ
> trong body bằng `Button`, thân bài là `Input` có viền, ảnh fixed height, action rời
> rạc, không một interaction nào có feedback (haptic/motion). Đây là lý do app "đúng
> màu mà vẫn chưa giống mạng xã hội". File này chốt bộ khung đích.

---

## 0. Quyết định đã chốt

> Không còn quyết định mở. Mục 11 ghi mapping Q → chốt để tra cứu; các mục hoãn nằm ở
> Phụ lục C (deferred register).

| # | Quyết định | Giá trị | Hệ quả |
|---|---|---|---|
| F1 | Nguyên lý số 1 | **Content-first**: chrome mỏng, nội dung là hero; mọi thứ không phải nội dung đẩy lên native header/toolbar | Composer bỏ h1 + header body; card bỏ khung card ở feed |
| F2 | Nguyên lý số 2 | **Native chrome**: modal = formSheet + header hệ thống với action; không tự vẽ hàng nút Cancel/Save trong body | Report/edit-post/composer đồng bộ; xoá mọi header-row tự vẽ |
| F3 | Nguyên lý số 3 | **Feedback everywhere**: mọi interaction lặp lại (like, post, send, follow) có press feedback + haptic theo bảng §6 | Thêm `expo-haptics` (infra dep — Q2 đã chốt) |
| F4 | Motion engine | Reanimated 4 + token `motion` hiện có; navigation vẫn dùng animation native của Stack | Không thêm lib animation |
| F5 | Feed row style | **Flat row + hairline divider** (X/Threads), không Card viền ở feed; Card giữ cho chỗ khác nếu cần | PostCard đổi vỏ, giữ API và testID |
| F6 | Media | Tỉ lệ **cố định** (API chỉ có `url`, không có `width/height`): 1 ảnh 4:5 + `maxHeight 420`; grid ô vuông 1–4 ảnh; hết fixed 200px. Video trong grid = tile tối + icon `play` | `MediaGrid` mới trong `entities/post/ui` |
| F7 | `expo-haptics` | Thêm (dep duy nhất của wave này) | Q2 (§11) |
| F8 | `expo-blur` | **Chưa thêm** ở wave này; cân nhắc ở wave sau cho media-viewer/overlay | Giữ scope gọn |
| F9 | `@expo/ui` / `expo-glass-effect` | **Không dùng ở wave này** (đã cài nhưng chưa import; @expo/ui phân mảnh iOS/Android, glass chỉ iOS 26). Revisit sau | Không xoá dep, chỉ để yên |
| F10 | Reduce motion | Bắt buộc: mọi spring/animation tự viết phải tắt theo `useReducedMotion`, giữ opacity feedback | Feel primitive chịu trách nhiệm, screen không tự xử |
| F11 | testID & Maestro | Không đổi testID hiện có; phần tử mới thêm testID mới; Maestro sửa cùng PR | Feed/composer flows không vỡ |
| F12 | Profile header title transition (Q7 cũ) | **Trong wave** — title native crossfade `@handle` → displayName khi khối identity cuộn qua header; scroll-driven, không setState mỗi frame | Đổi cấu trúc profile: header overlay dùng chung ngoài pager |
| F13 | Notification media thumbnail (Q8 cũ) | **Trong wave** — thumbnail 44px lấy từ canonical post cache, không fetch thêm | Row inbox thêm trailing thumbnail |
| F14 | Action row counts | Like hiện count khi `> 0` (ẩn `0`); comment/share/save **icon-only** — model không có `commentCount`/share/save count | §4.1 |
| F15 | Sticky profile tabs + horizontal pager | Header dùng chung dựng bằng `scrollY` (dùng chung cơ chế Q7), dừng khi tabs chạm top; overlay tabs crossfade tại đúng vị trí đó; Posts/Saved dùng native pager để tap và swipe, mỗi page giữ offset riêng | §4.4, PF4.3 |
| F16 | Media viewer dữ liệu + gesture | Params `{ postId, index }`; đọc canonical cache, thiếu thì `usePost`; ở scale 1 kéo dọc để dismiss, scale > 1 chỉ pan/zoom; route `gestureEnabled: false` để tránh cạnh tranh dismiss | §4.10, §7.1 |

---

## 1. Mục tiêu và non-goals

### 1.1 Mục tiêu

1. Mỗi surface có **anatomy chuẩn app social production** (mục 4), không còn layout kiểu form.
2. Mọi tương tác lặp lại có **feedback vật lý**: press state, haptic, micro-motion (mục 6).
3. Modal là **native presentation với header hệ thống** — hết hàng nút tự vẽ trong body (mục 7).
4. Media hiển thị đúng **tỉ lệ và grid**, là phần thị giác chính của card (mục 4.1/4.6).
5. Feel primitives dùng chung ở `shared/ui` — không phải mỗi feature tự chế scale/haptic.

### 1.2 Non-goals

- Không đổi navigation structure (NativeTabs, groups, hrefs, deep link giữ nguyên).
- Không thêm UI kit, không đổi token màu/chữ (thuộc `design-system.md`).
- Không làm tính năng mới (repost, poll, GIF, story...). Chỉ anatomy cho tính năng đã có.
- Không làm tablet layout, không shell web riêng.
- Không dùng `@expo/ui`/glass ở wave này (F9).
- Không đổi backend/API.

---

## 2. Nguyên tắc

1. **Content-first.** Chrome mỏng: header hệ thống + toolbar icon; thân màn là nội dung. Mỗi pixel viền/nền/khung phải biện minh được.
2. **Anatomy trước, style sau.** Một màn "đúng" khi cấu trúc đúng (ai ở đâu, action ở đâu), style đã có token lo.
3. **Hệ điều hành làm phần không phải nội dung.** Modal, back, share sheet, alert, keyboard — dùng của hệ thống; chỉ vẽ content area.
4. **Feedback là yêu cầu, không phải trang trí.** Không có interaction nào "im lặng": bấm là có phản hồi thị giác; action có hậu quả (like/post/send) là có haptic.
5. **Một pattern, mọi nơi.** Overflow menu, action row, composer pill, state — mỗi loại một cách làm duy nhất trong app.
6. **Giữ contract.** Boundary `app → features → entities → shared`, canonical `['post', id]`, testID, Maestro — không phá khi đổi anatomy.

---

## 3. Hiện trạng (audit 2026-10-27)

> Đối chiếu code thật. Đây là danh sách "vỡ anatomy" cần sửa; từng mục có đích ở mục 4.

| # | Hiện trạng | File | Đích |
|---|---|---|---|
| A1 | Composer: header tự vẽ trong body (2 `Button`), h1 "New post" trong body, thân bài là `Input` viền, "Add photo" là nút chữ | `composer/screens/composer-screen.tsx` | §4.2 |
| A2 | PostCard: ảnh fixed 200px, 2 hàng action tách rời (like riêng, save/share riêng), timestamp đáy card, không nút comment | `entities/post/ui/post-card.tsx` | §4.1 |
| A3 | Like/comment/send/follow: `Pressable` tay, không press feedback, không haptic, không motion | `post-actions.tsx`, `comment-row.tsx`, `chat-composer.tsx` | §5, §6 |
| A4 | Comment row **không có avatar**; like + Reply là Pressable tay | `entities/comment/ui/comment-row.tsx` | §4.3 |
| A5 | Report + edit-post: hàng Dismiss/Submit tự vẽ trong body **trùng** với header hệ thống | `moderation/screens/report-screen.tsx`, `post-detail/screens/edit-post-screen.tsx` | §4.10 |
| A6 | Media-viewer là placeholder "Coming soon" | `post-detail/screens/media-viewer-screen.tsx` | §4.10 |
| A7 | Me-profile: nút "Edit"/"Sign out" dạng `Button secondary sm` trong body; user-profile private/blocked là 2 `Text` tay | `profile/screens/profile-screen.tsx`, `user-detail-screen.tsx` | §4.4 |
| A8 | Inbox: header tự vẽ (`title` variant + 2 Button) trong body; row là Pressable tay | `inbox/screens/inbox-screen.tsx` | §4.5 |
| A9 | Chat: RN `KeyboardAvoidingView` + `keyboardVerticalOffset` (khác 3 màn còn lại dùng keyboard-controller); composer là Input viền + Button "Attach"/"Send" chữ | `chat/screens/chat-detail-screen.tsx`, `chat/components/chat-composer.tsx` | §4.6 |
| A10 | List không nhất quán: feed/search/chat/inbox dùng `FlashList` thô, comments/profile dùng `AppList` | nhiều file | §5.5 |
| A11 | `Icon` map thiếu icon cho affordance chuẩn (play/pause/volume/reply/flag...) | `shared/ui/icons/icon-map.ts` | §8 |
| A12 | Reanimated chỉ dùng cho skeleton; gesture-handler chỉ có RootView; haptics/blur chưa tồn tại | — | §5–§7 |
| A13 | Post-detail header của chat tự vẽ tên + presence trong body | `chat/screens/chat-detail-screen.tsx` | §4.6 |
| A14 | Profile: header (cover/avatar/names) nằm **ngoài** list nên không cuộn; header title tĩnh `@handle` | `profile/screens/profile-screen.tsx`, `profile-header.tsx` | §4.4, §4.4.1 |
| A15 | Notif row: trailing chỉ có unread dot; payload đã có `postId` nhưng không dùng để hiện thumbnail | `inbox/components/notification-row.tsx`, `entities/notification/model.ts` | §4.5 |

---

## 4. Anatomy chuẩn theo surface

> Mỗi mục: cấu trúc từ trên xuống dưới. Kích thước avatar/padding là quy ước anatomy
> của spec này; màu/chữ tra `design-system.md`. Snapshot có ghi chú riêng.

### 4.1 PostCard (feed) — F5, F6

Vị trí dùng: Home feed, Search results, Hashtag, Profile lists. Một vỏ duy nhất.

```text
┌─ PostCard (flat row, nền background, ngang cách padding 4) ─────┐
│ [Avatar 40] DisplayName        @handle · 2h              [more] │  ← header row, 1 dòng
│ body text (body variant, clamp 8 dòng)                          │
│ media (MediaGrid, tỉ lệ cố định, radius.md)                     │
│ ─────────────────────────────────────────────────────────────── │
│ [comment]       [like] N                     [share]  [save]    │  ← action row, duy nhất
└─────────────────────────────────────────────────────────────────┘
  ← hairline divider `border` giữa 2 card (thay separator 8px)
```

Quy tắc:

1. **Header row**: `Avatar 40` + cột (displayName `labelStrong`, `@handle · time` `caption textSecondary`) + `IconButton more` (owner menu / safety menu — giữ logic hiện có). Timestamp **chuyển lên header** (không còn ở đáy card).
2. **Body**: `Text body`; feed **clamp 8 dòng** + affordance "more" mở rộng tại chỗ.
3. **Media** (MediaGrid — `entities/post/ui`):
   - `PostMedia` chỉ có `{ kind, url }` → **không có aspect thật**. 1 ảnh: `aspectRatio 4/5`, `maxHeight 420`, `contentFit="cover"`. Grid: ô vuông.
   - 2 ảnh: 2 cột vuông. 3 ảnh: 1 lớn + 2 nhỏ. 4 ảnh: lưới 2×2. Gap `space[1]`, `radius.md`.
   - Video: 1 video → giữ `PostVideo`; video nằm trong grid → tile tối + icon `play` (không có poster URL).
   - Bấm media → media-viewer (§4.10) với `{ postId, index }`.
4. **Action row — duy nhất 1 hàng**: `comment` (icon-only; mở detail + focus composer), `like` (icon + count, **ẩn khi `0`**), spacer, `share` (icon-only), `save` (icon-only, `saveAffordance`). Hit area 44.
5. **Like**: fill `danger` + haptic light + spring pop (§6.2). Unlike: không haptic.
6. Video: giữ `PostVideo` + `activeVideoId`; overlay control dùng icon mới (§8), hết glyph `▶/🔇`.
7. Long-press card → mở cùng overflow menu với `more` (§7.3).
8. Giữ nguyên: API props, testID `post-card-<id>`/`like-button-<id>`, canonical `usePost`, callback pattern (`onSafetyPress`/`onOwnerEditPress`/`saveAffordance`).

### 4.2 Composer — F1, F2

```text
┌─ formSheet, header hệ thống ────────────────────────────────────┐
│ [×]              New post                    ( Post )           │  ← headerLeft close IconButton,
│                                                                 │     headerRight pill Post;
│                                                                 │     HẾT hàng nút trong body
│ [Avatar me 40]  TextInput borderless auto-grow                  │  ← viết thẳng lên canvas
│                 placeholder "What's happening?"                 │
│                                                                 │
│ [media strip 72px — giữ nguyên]                                 │
│                                                                 │
│ ┌─ toolbar (pin đáy, trên keyboard) ──────────────────────────┐ │
│ │ [image] [camera]              counter-ring khi ≥260/280    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Quy tắc:

1. Body bỏ h1 "New post", bỏ hàng `Dismiss/Post` trong body — action sống ở **header hệ thống** (layout đã có title; thêm `headerLeft`/`headerRight` qua `Stack.Screen options`). Giữ testID: `composer-dismiss-button` → IconButton close, `composer-post-button` → nút pill.
   > Đối chiếu: `design-system.md` §7.2 **đã** chốt matrix này (composer: formSheet, Dismiss trái, Post phải). P3.8 chỉ đổi token nên bỏ sót phần header — đây là lỗi thi công, không phải đổi quyết định.
2. Nút Post = `Button size="sm" variant="primary"` **radius `full`** (pill), disabled rõ (mờ 40%), loading giữ nguyên kích thước.
3. Thân bài = `ComposerInput` mới (§5.2): borderless, auto-grow, min 2 dòng max ~12 dòng, `body` variant.
4. Hàng đầu thân: `Avatar me 40` + `ComposerInput` — người đăng tự nhận diện bằng avatar, không cần label.
5. **Toolbar đáy** (pin, nền `surface` + border top): `IconButton image` (giữ testID `composer-media-add`), `IconButton camera` (picker camera). Trạng thái `Uploading…/Queued/error` hiển thị dạng dòng `caption` ngay trên toolbar — giữ testID cũ.
6. **Counter-ring** (§5.3): đặt **bên phải toolbar** (không quanh nút Post); hiện khi `length ≥ 260/280`; giữa ring hiển thị **số ký tự còn lại** (20→0, âm khi vượt), màu `primary → warning → danger`; `accessibilityLabel` đếm ký tự (testID `composer-counter` chuyển sang ring). `< 260` ẩn hoàn toàn; toolbar reserve chỗ để không layout shift.
7. Keyboard: keyboard-controller `KeyboardAvoidingView` (như hiện tại), toolbar tự nhấc theo keyboard.
8. Draft/outbox/mention-gate/upload pipeline: **giữ nguyên hành vi**, chỉ đổi vỏ.

### 4.3 Comment (row + composer)

Row:

1. `Avatar 32` leading (mới — hết A4) + cột: dòng 1 = displayName `labelStrong` + `@handle · time` `caption`; dòng 2 = body; dòng 3 = action nhỏ: like (icon sm + count) + "Reply".
2. Reply indent `paddingLeft` = 32 + 8 (đổi từ 40 cho khớp avatar mới), giữ 1 cấp.
3. Pending = `Skeleton` row; giữ testID hiện có.

Composer (pinned footer của `DetailPage`):

1. **Pill input**: `ComposerInput` giới hạn 1–4 dòng, nền `surfaceSunken`, `radius.full`, placeholder "Add a comment…".
2. `IconButton send` (`primary`) chỉ hiện khi có text; thay Button chữ "Send".
3. Reply banner giữ nguyên (trên pill), hết A5-style dư thừa.
4. Chưa login: giữ dòng mời đăng nhập hiện tại.

### 4.4 Profile

**Cấu trúc — header dùng chung trên pager (A14):**

```text
Screen
├─ ProfilePager (native horizontal)
│   ├─ Posts page: AppList(ids) — spacer đúng headerHeight
│   └─ Saved page: AppList(ids) — spacer đúng headerHeight
├─ Header overlay (ngoài pager) = <ProfileHeaderBlock>
│    cover 140 → Avatar 96 đè cover (−32, viền background 3)
│    h2 name → @handle caption → bio/link
│    stats 1 dòng: N posts · N followers · N following (CountLink, tabular-nums)
│    action: Follow pill (primary) / Following (secondary) / Edit profile (secondary)
│    Follow requests row (nếu N > 0)
│    Tabs underline  Posts | Saved
└─ Sticky Tabs overlay (fade thay tabs trong header khi đã dính)
```

1. Header **dùng chung, nằm ngoài pager**: dịch theo `scrollY` của page active nên cover/avatar/names trôi đi, nhưng không bị pager kéo ngang. Header dừng khi hàng tabs chạm top (`tabsTop`), nhờ vậy tabs trong header thành sticky. Sticky tabs overlay crossfade đúng vị trí đó (nền `surface` + hairline dưới) — không dựa `stickyHeaderIndices`. Posts/Saved nằm trong native horizontal pager, mỗi page giữ offset riêng. Khi chuyển tab, page đích được đồng bộ về header offset hiện tại nếu một trong hai page gần top; nếu cả hai đã cuộn qua header thì giữ offset riêng. Page rỗng luôn mở header (không đủ nội dung để cuộn dưới header đóng).
2. **Action pill** (fullWidth): follow = `Button primary radius full`; đã follow → `secondary` "Following"; me → `secondary` "Edit profile". Hết 2 nút `secondary sm` dồn cột (A7).
3. **Me-profile overflow**: `IconButton more` ở `headerRight` → Sheet: Follow requests (badge N), Settings, Sign out (danger). Giữ testID `profile-sign-out-button` trên item trong Sheet — Maestro phải mở menu trước (sửa cùng PR).
4. **User-profile** (khác viewer): action slot = `FollowButton` hoặc Edit (self); overflow `more` = report / block / share.
5. Private/blocked → `EmptyState` (lock icon), hết 2 `Text` tay (A7).
6. Tabs Posts/Saved giữ `underline` + testID; tap và swipe ngang đều đổi page; Saved tab dùng cùng vỏ list, giữ `saved-list`.
7. Canonical ids / `PostCard` / refresh / infinite scroll: không đổi.

#### 4.4.1 Header title transition — Q7 (F12)

Mục tiêu: khi khối identity cuộn qua native header, title đổi `@handle` → displayName
mượt, **không re-render JS mỗi frame**.

Cơ chế:

1. Screen giữ 2 shared value: `scrollY` và `switchRange` (`{ start, end }`).
2. `AppList` nhận `onScroll` + `scrollEventThrottle={16}` (mở rộng `shared/ui/list.tsx`); handler chỉ làm `scrollY.value = e.nativeEvent.contentOffset.y` — một write, không `setState`.
   - Device QA xác nhận FlashList v2 Android có nhận worklet handler không; nếu có, nâng lên `useAnimatedScrollHandler` mà **không đổi API của screen**.
3. Đo khối identity (cover + avatar + names) bằng `onLayout` trên wrapper →
   `switchRange.value = { start: y + height − 48, end: y + height }`. Không hardcode chiều cao cover/header inset.
4. Khi user data sẵn sàng, gọi **một lần** `navigation.setOptions({ headerTitle: () => <ProfileHeaderTitle … /> })`, truyền `scrollY`, `switchRange`, `handle`, `displayName`, `reduceMotion`. **Không** gọi `setOptions` trong lúc scroll (mỗi lần gọi = re-render navigator → jank).
5. `ProfileHeaderTitle`: 2 `Text` chồng tuyệt đối (handle dưới, name trên), style khớp `headerTitleStyle` của design-system (17/600, `textPrimary`). `useAnimatedStyle`:
   `progress = interpolate(scrollY, [start, end], [0, 1], Extrapolation.CLAMP)`;
   opacity dưới = `1 − progress`, trên = `progress`. `numberOfLines={1}`, maxWidth ≈ 60% màn để truncate tên dài.
6. **Reduce motion**: `progress` thành 0/1 tại ngưỡng (không crossfade), vẫn cập nhật title.
7. **Accessibility**: container `accessibilityRole="header"` + `accessibilityLabel` = `@handle` hoặc displayName; đổi nhãn bằng `useAnimatedReaction` + `runOnJS` **chỉ khi vượt ngưỡng** (2 lần/screen, không mỗi frame, guard bằng ref); 2 `Text` con `accessible={false}` (tránh đọc trùng).
8. **Không** animate khi: overscroll pull-to-refresh (`scrollY < 0` → progress clamp 0), keyboard mở, chuyển tab.

QA bắt buộc (thiết bị thật, cả 2 platform): push 2 profile liên tiếp (options per-screen), data về muộn (setOptions sau), displayName dài, Android title left-align, dynamic type 130%, reduced motion on/off.

TestID: `profile-title-handle`, `profile-title-name` (cả hai luôn render; opacity điều khiển).

### 4.5 Inbox (notifications)

1. Bỏ header tự vẽ trong body (A8): title "Inbox" từ header hệ thống; "Mark all read" = text-button `primary` ở `headerRight` (giữ testID).
2. Row = `ListItem` anatomy: leading `Avatar 40`, title `actor + verb` (labelStrong), subtitle thời gian tương đối (caption), trailing cluster = **thumbnail (nếu có) + unread `Badge dot`**.
3. Row mới chưa đọc: nền `primarySoft` fade-out sau khi xem (motion.base).
4. Dùng `AppList` (A10), giữ pull-to-refresh + footer như hiện tại.

#### 4.5.1 Notification media thumbnail — Q8 (F13)

- **Nguồn: canonical post cache only** — `getPostData(qc, notification.postId)?.media[0]`. Không fetch, không skeleton, không đổi row height khi thiếu (giữ minHeight 64).
- Điều kiện: `notification.postId != null` và `kind ∈ {like, post, mention}`.
  - `media[0].kind === "image"` → thumbnail ảnh.
  - `video` → ảnh poster + badge `play` nhỏ ở góc (§8).
- UI: `expo-image` 44×44, `radius.sm`, `contentFit="cover"`, `accessible={false}` (trang trí — row label đã đủ mô tả), testID `notification-thumb-<id>`.
- Post chưa có trong cache → **không render thumbnail** (progressive enhancement); lần mở sau khi cache đã có thì tự hiện. Không thêm N query cho N row.
- Không đụng `resolveNotificationHref`, mutation mark-read, prefetch target.

### 4.6 Chat

Conversation list:

1. Row giữ anatomy hiện tại (Avatar 48 + PresenceDot, name, preview/typing, time, Badge) — chuẩn rồi; chỉ đổi container sang `ListItem`-pattern + `AppList` cho đồng bộ (A10).

Detail:

2. **Bỏ header tự vẽ trong body** (A13): header hệ thống title = tên peer; `headerRight` = `IconButton more` (Sheet: view profile / block / report). Presence: chấm vào **conversation list** là đủ; trong detail, trạng thái thể hiện bằng typing indicator (giữ) + "Seen" (giữ).
3. **Bubbles**: maxWidth 75%; `radius.lg` nhưng góc sát người gửi = `radius.sm` (mine: bottom-right; theirs: bottom-left). Mine = `primary`/`onPrimary`, theirs = `surfaceMuted`/`textPrimary`. Ảnh trong bubble: full-bleed radius, max 220.
4. **Nhóm timestamp**: chỉ hiện `caption` thời gian khi cách tin trước ≥ 5 phút (mới); status "Sending/Sent/Seen/Queued" chỉ trên bubble cuối của mình (hết rác mắt giữa các bubble).
5. **Composer**: pill `ComposerInput` (1–5 dòng) + `IconButton camera` trái + `IconButton send` phải (chỉ hiện khi có text). Ảnh đính kèm = preview 96 + close (giữ). Hết Button "Attach"/"Send" chữ (A9).
6. Keyboard: **đổi sang keyboard-controller** `KeyboardAvoidingView` như 3 màn còn lại; bỏ RN KAV + `keyboardVerticalOffset` (A9).
7. Message list giữ chronological (FlashList v2 chưa có inverted — không đổi).

### 4.7 Search + hashtag

1. iOS giữ `headerSearchBarOptions`; Android giữ SearchBar pill `surfaceSunken` trong content (đã đúng hướng, chỉ bỏ nút "Clear" chữ → `IconButton close` trong field trailing).
2. **Kết quả có `Tabs segmented` "Top | People | Posts"** (component P1.5 đang đứng không): Top = ghép people (3) + posts; People/Posts = list tương ứng. Hết label "People/Posts" dạng `Text` trong header list.
3. Trending row = `ListItem`: leading **số hạng** (h3 `textTertiary`), title `#tag` labelStrong, subtitle "N posts" caption.
4. History row giữ, đổi clear-icon thành `IconButton close sm`.
5. Mọi list chuyển `AppList` (A10).

### 4.8 Auth

Giữ nguyên anatomy hiện tại (display + Field + error inline) — đã đạt. Chỉ bổ sung:

1. Nút submit = pill (`radius.full`) `size="lg"` — đồng bộ với Post/Follow.
2. Không thêm social login/logo (non-goal).

### 4.9 Settings

1. Nhóm **inset-grouped**: mỗi group = Card (`radius.lg`) chứa các `ListItem` nối `Divider`; trên group có `overline` section label. (Settings hub đã dùng ListItem — chỉ thêm grouping.)
2. `PrefToggleRow` → đổi sang `ListItem` + trailing `Switch` native (hết row tay, A-style).
3. Sub-screen loading/error → `LoadingState`/`ErrorState` chuẩn.

### 4.10 Modals (report / edit-post / media-viewer) — F2

1. **Report**: headerLeft `Dismiss` (IconButton close hoặc text-button theo platform), headerRight pill `Submit`; bỏ hàng nút + h1 trong body (A5). Radio list giữ; có thể đổi row sang `ListItem` với trailing `check`. TestID giữ.
2. **Edit-post**: headerLeft `Cancel`, headerRight pill `Save`; body chỉ còn `ComposerInput` + counter (ring không cần, giữ caption). Bỏ hàng nút dưới (A5).
3. **Edit-profile**: đồng bộ pattern trên.
4. **Media-viewer**: hết placeholder (A6) — full-screen `modal`, nền đen; params `{ postId, index }`, đọc canonical post cache, thiếu thì `usePost`; ảnh zoom/pan (pinch + pan + double-tap), kéo dọc ở scale 1 để dismiss, `IconButton close` vẫn là fallback accessibility; video dùng `expo-video` fullscreen controls. Route đặt `gestureEnabled: false` để gesture ảnh không xung đột với native dismiss. Giữ tên route + testID.

### 4.11 Home shell

1. Không FAB — Create là NativeTabs trigger (giữ, đúng F2).
2. **New-posts pill**: khi có post mới realtime, pill nổi dưới header "N new posts" (FadeInDown); bấm → scroll-to-top + refresh. Hiện `feed/realtime/` còn trống — pill chỉ dựng khi có tín hiệu; nếu backlog chưa có, để gap theo AGENTS ("if a behavior is absent, leave the gap") — D4.
3. Feed giữ FlashList + viewability video hiện tại; separator 8px → `Divider` hairline (F5).

---

## 5. Feel primitives (shared/ui)

> Mọi mục đều qua checklist Phụ lục C của design-system (token, light/dark, a11y,
> testID, Design Lab). Component chỉ tạo khi ≥2 nơi dùng hoặc là nền tảng.

### 5.1 `PressableScale` (`primitives/`)

`Pressable` + Reanimated scale `1 → 0.97` + opacity, `motion.fast`, spring về 1. Prop `disabled` tắt cả hai. Reduce motion → chỉ opacity. Dùng cho: PostCard media, like, bubble? (không — bubble), avatar trong header card. **Không** thay `android_ripple` cho list row (row dùng ripple).

### 5.2 `ComposerInput` (`components/`)

`TextInput` borderless, auto-grow (props `minLines`, `maxLines`, scroll khi vượt), `body` variant, placeholder `textTertiary`, controlled. Không bọc Field. Dùng: composer, comment composer, chat composer, edit-post (4 nơi ✓).

### 5.3 `CounterRing` (`components/`)

Vòng tiến trình **không SVG** (2 nửa cung View + rotation), đường kính 28, đặt **trong toolbar** (cạnh các tool). Props: `value`, `max`, `warnFrom` (mặc định 0.9). Khi hiện, giữa ring có **số còn lại** (`max − value`, âm khi vượt). Màu `primary → warning → danger`. Ẩn khi dưới ngưỡng; chỗ được reserve để không layout shift. Dùng: composer (1 nơi hiện tại — là nền tảng cho edit-post/comment sau nên cho phép).

### 5.4 Haptics util (`shared/lib/haptics.ts`)

Wrap `expo-haptics`: `hapticLight()`, `hapticSuccess()`, `hapticWarning()`; try/catch no-op khi không khả dụng; kill-switch const (web no-op). **Không gọi trực tiếp `expo-haptics` trong feature** — chỉ qua util này (để swap/tắt tập trung).

### 5.5 `AppList` — thống nhất (A10)

Feed/search/chat/inbox chuyển sang `AppList` như comments/profile đang dùng. Không đổi hành vi refresh/onEndReached.

Mở rộng passthrough `onScroll` + `scrollEventThrottle` để profile đo offset cho Q7 (§4.4.1) — API cũ giữ nguyên, prop mới optional.

### 5.6 Không tạo

`ActionBar`, `Bubble`, `PullToRefresh` custom — mỗi cái chỉ có 1 nơi dùng hoặc native đã lo. Giữ trong feature theo governance §14.1.

---

## 6. Motion & haptics

### 6.1 Bảng feedback chuẩn

| Interaction | Thị giác | Haptic | Motion spec |
|---|---|---|---|
| Bấm card (feed) | scale 0.97 | — | `PressableScale`, fast |
| Like | heart fill + pop | light | spring scale 1→1.3→1, ~350ms |
| Unlike | fill out | — | fade fast |
| Bấm more/overflow | native-backed bottom sheet | — | `@expo/ui/community/bottom-sheet` |
| Post thành công | dismiss modal | success | native dismiss |
| Send comment/message | bubble/item hiện ngay (optimistic đã có) | light | FadeInDown fast cho item mới |
| Follow/unfollow | đổi label pill | light | crossfade fast |
| Mark all read | rows mất dot | — | fade base |
| New-posts pill | xuất hiện | — | FadeInDown base |
| Profile header title | crossfade opacity theo scroll | — | interpolate Reanimated; reduce motion → swap tại ngưỡng |
| Pull-to-refresh | native spinner | — | native |
| Media mở viewer | — | — | native modal |

### 6.2 Quy tắc

1. Duration/easing lấy từ token `motion` (design-system §4.6); spring không có token → định nghĩa cục bộ trong `PressableScale`/like, không spread.
2. **Reduce motion** (F10): mọi animation tự viết phải qua `useReducedMotion`; khi bật → opacity-only, giữ haptic.
3. Haptic chỉ theo bảng §6.1; không thêm chỗ khác mà không sửa bảng này.
4. Navigation không tự animate — animation native của Stack/formSheet (đúng nguyên tắc design-system §4.6).

---

## 7. Native chrome

### 7.1 Modal presentation

Giữ `(modals)/_layout` như hiện tại (composer/report/edit-post/edit-profile = `formSheet`, media-viewer = `modal`). Thay đổi chỉ nằm ở **header options** từng screen: `headerLeft`/`headerRight` nhận Button/IconButton từ feature qua `Stack.Screen options` (pattern `headerRight` settings đã có ở P2.2). Không thêm `detents` ở wave này (D5). Riêng media-viewer đặt `gestureEnabled: false` (F16) và có close button overlay.

### 7.2 Keyboard

Một cơ chế duy nhất: `react-native-keyboard-controller` `KeyboardAvoidingView` (`behavior` ios=padding / android=height) — chat chuyển sang (A9). Không dùng RN KAV ở đâu cả.

### 7.3 Overflow & share

1. Overflow menu (post/user/chat/report) = shared `Sheet` adapter backed by `@expo/ui/community/bottom-sheet`, content là list `ListItem`; mở từ cả `more` button lẫn long-press card.
2. Share: giữ native share sheet hiện tại của `PostShareButton`.
3. Confirm phá dữ liệu (xoá post, sign out): native `Alert` (đúng design-system §6.4).

### 7.4 Blur/glass

Không dùng ở wave này (F8, F9). Media-viewer overlay có thể cân nhắc sau.

---

## 8. Icon map — bổ sung

Thêm vào `icon-map.ts` (mỗi name đủ 3 platform, test key parity tự chạy):

| Name mới | iOS | Android | Dùng cho |
|---|---|---|---|
| `play` | `play.fill` | `play_arrow` | video overlay + thumbnail badge (§4.5.1) |
| `pause` | `pause.fill` | `pause` | video overlay |
| `volume` | `speaker.wave.2.fill` | `volume_up` | video unmute |
| `volumeOff` | `speaker.slash.fill` | `volume_off` | video mute |
| `reply` | `arrowshape.turn.up.left` | `reply` | comment reply (nếu cần icon; hiện chữ "Reply" — chỉ thêm khi dùng) |
| `flag` | `flag` | `flag` | report entry trong overflow |
| `at` | `at` | `alternate_email` | mention affordance (nếu cần) |

Nguyên tắc: chỉ thêm icon khi có call site thật trong cùng PR (không speculative icon).

---

## 9. Guardrails và tương thích

1. **Dependency**: chỉ thêm `expo-haptics` (F7). Không UI kit. Không nâng `expo-symbols`.
2. **Boundary**: giữ nguyên. `PressableScale`/`ComposerInput`/`CounterRing`/haptics ở `shared/ui` + `shared/lib`; `MediaGrid` ở `entities/post/ui` (domain post media); feature không import feature.
3. **testID/Maestro**: giữ mọi testID hiện có (chuyển chủ thể khi element đổi loại — ví dụ `composer-dismiss-button` từ Button → IconButton). testID mới: `composer-toolbar`, `composer-counter-ring`, `profile-title-handle`, `profile-title-name`, `notification-thumb-<id>`, `new-posts-pill`, `media-grid-<postId>-<i>`... Lưu ý `profile-sign-out-button` giờ nằm trong overflow Sheet → Maestro `profile.yaml` phải mở menu trước khi tap. Sửa flow cùng PR.
4. **check:tokens**: vẫn fail hex/fontSize; layout number đặc thù (avatar size, ring diameter, bubble maxWidth) hợp lệ vì là anatomy constant của màn — nằm trong `StyleSheet` của feature/entity, không phải token.
5. **design-system.md**: file này KHÔNG đổi token. Nếu thi công cần token mới (vd. `radius.pill` — hiện dùng `full` là đủ), sửa design-system ở PR riêng theo governance §14.2.
6. **Hành vi giữ nguyên**: draft/outbox composer, mention-gate, outbox drain, canonical post cache, video viewability, deep link, session gate. Anatomy không đụng data flow.

---

## 10. Definition of Done — Feel

Một màn chỉ "xong feel" khi:

- [ ] Anatomy khớp mục 4 tương ứng (không còn header-row tự vẽ trong body của modal; action ở native header).
- [ ] Mọi interaction trong bảng §6.1 có đúng feedback; reduce-motion on vẫn dùng được.
- [ ] Không còn `Button` chữ làm icon-action (Attach/Send/Add photo...); Icon-only có `accessibilityLabel`.
- [ ] Media không fixed-height méo tỉ lệ; grid đúng pattern.
- [ ] List dùng `AppList`; divider hairline ở feed.
- [ ] Q7: title crossfade đúng ngưỡng, không re-render mỗi frame; reduced motion + a11y label đúng; QA iOS + Android (push 2 profile, data muộn, tên dài).
- [ ] Q8: thumbnail chỉ đọc post cache, không phát sinh fetch; thiếu cache không layout shift.
- [ ] Giữ nguyên testID cũ + Maestro pass; light/dark + 360–430pt có ảnh trước/sau trong PR.
- [ ] `pnpm typecheck / lint / eslint / test / check:tokens` + `lint:boundaries` xanh.
- [ ] Feel primitive mới có trong Design Lab.

---

## 11. Câu hỏi đã đóng

Không còn câu hỏi mở. Mapping để tra cứu:

| Cũ | Chốt | Nơi ghi |
|---|---|---|
| Q1 — Feed flat-row vs Card | Có: flat + hairline | F5, §4.1 |
| Q2 — `expo-haptics` | Có | F7, §5.4, §9 |
| Q3 — Clamp body 8 dòng | Có | §4.1 |
| Q4 — Double-tap ảnh để like | Hoãn | D1 |
| Q5 — `expo-blur` | Hoãn | D2 |
| Q6 — Notif group theo thời gian | Hoãn | D3 |
| Q7 — Profile title theo scroll | **Làm ngay trong wave** | F12, §4.4.1 |
| Q8 — Notif row thumbnail | **Làm ngay trong wave** | F13, §4.5.1 |
| Q9 — New-posts pill | Hoãn (chờ realtime) | D4 |
| Q10 — formSheet detents | Hoãn | D5 |
| Q11 — Thứ tự thi công | Chốt: Composer → PostCard/Feed → Post-detail/Comment → Profile (gồm Q7) → Inbox (gồm Q8) → Chat → Search → Modals; P4-polish cũ (a11y sweep, legacy cleanup) làm đợt cuối | Phụ lục B |

---

## Phụ lục A — Mapping nhanh hiện trạng → đích

| File hiện tại | Thay đổi chính |
|---|---|
| `composer/screens/composer-screen.tsx` | Bỏ header body + h1; `Input` → `ComposerInput`; toolbar icon; counter-ring; header options |
| `entities/post/ui/post-card.tsx` | Flat row, timestamp lên header, `MediaGrid`, 1 action row, like pop + haptic |
| `entities/post/ui/post-actions.tsx` | Thêm comment slot; `PressableScale`; haptic |
| `entities/comment/ui/comment-row.tsx` | Thêm Avatar 32; action giữ; indent 40 |
| `features/post-detail/components/comment-composer.tsx` | Pill `ComposerInput` + `IconButton send` |
| `features/profile/screens/profile-screen.tsx` | Header dùng chung ngoài pager + spacer trong list; stats row; pill action; overflow more (headerRight); Sign out vào Sheet |
| `features/profile/components/profile-header.tsx` | Avatar đè cover, stats 1 dòng; `onLayout` khối identity cho Q7 |
| `features/profile/components/profile-title.tsx` (mới) | Header title crossfade Q7 (§4.4.1) |
| `features/profile/components/profile-pager.tsx` (mới) | Native horizontal pager; tap `setPage`, swipe báo `onPageSelected`/`onPageScroll` |
| `features/profile/components/profile-sticky-tabs.tsx` (mới) | Sticky tabs overlay crossfade theo `stickyProgress` |
| `features/profile/components/profile-posts-list.tsx` | Nhận spacer header + `onScroll`; list không chứa header/tabs |
| `features/inbox/screens/inbox-screen.tsx` | Bỏ header body; mark-all → headerRight; row → ListItem pattern |
| `features/inbox/components/notification-row.tsx` | Trailing thumbnail từ post cache (§4.5.1) |
| `features/chat/screens/chat-detail-screen.tsx` | Bỏ header body; keyboard-controller |
| `features/chat/components/chat-composer.tsx` | Pill + icon camera/send |
| `features/chat/components/message-bubble.tsx` | Radius góc, timestamp nhóm, status bubble cuối |
| `features/search/screens/search-screen.tsx` | Segmented tabs Top/People/Posts; trending ListItem |
| `features/moderation/screens/report-screen.tsx` | Header hệ thống, bỏ body header |
| `features/post-detail/screens/edit-post-screen.tsx` | Header hệ thống, `ComposerInput` |
| `features/post-detail/screens/media-viewer-screen.tsx` | Viewer thật: zoom pan + close |
| `shared/ui/icons/icon-map.ts` | + `play/pause/volume/volumeOff/flag` |
| `shared/ui/list.tsx` | Passthrough `onScroll` + `scrollEventThrottle` (Q7) |
| `shared/ui/primitives|components/` | + `PressableScale`, `ComposerInput`, `CounterRing`, `shared/lib/haptics.ts` |
| `features/feed/components/feed-list.tsx` | Divider hairline; pill chờ D4 |

## Phụ lục B — Việc tiếp theo

1. Spec → Approved v1.0 — xong (2026-10-28).
2. **Chưa tạo** `schedule/feel-plan.md` — chỉ viết khi có lệnh.
3. Khi bắt đầu thi công: PR nền = thêm `expo-haptics` + `shared/lib/haptics.ts` (không đổi UI).
4. Thứ tự thi công theo Q11 đã chốt ở §11.

## Phụ lục C — Deferred register (nợ đã ghi nhận)

> Các mục dưới **không** nằm trong wave này. Mỗi mục có tín hiệu làm lại rõ ràng;
> không mục nào chặn anatomy wave. Khi làm, tạo PR riêng + cập nhật spec này.

| # | Item | Vì sao hoãn | Tín hiệu làm lại | Cost |
|---|---|---|---|---|
| D1 | Double-tap ảnh để like (Q4) | Chạm 1 (mở viewer) vs chạm đôi (like) cần phân giải cử chỉ; phụ thuộc media-viewer tồn tại trước | Ngay sau PR media-viewer (§4.10) | S — 1 PR |
| D2 | `expo-blur` (Q5) | Blur chỉ có giá trị khi bar nổi đè nội dung — pattern chưa tồn tại; Android blur cần fallback | Khi media-viewer/overlay cần control nổi trên ảnh | S–M |
| D3 | Notif group Today/This week (Q6) | Cần bucket thời gian + sticky section; giá trị thẩm mỹ nhỏ hơn row anatomy | Khi list > ~50 rows hoặc có yêu cầu scan theo ngày | M |
| D4 | New-posts pill (Q9) | `features/feed/realtime/` trống, chưa có tín hiệu bài mới; theo AGENTS: để gap | Khi realtime có event | S — spec §4.11 sẵn |
| D5 | formSheet detents (Q10) | Hành vi detents lệch iOS/Android; form hiện đủ ngắn cho full sheet | Khi có form ngắn cần thao tác nhanh 1 tay | S |
