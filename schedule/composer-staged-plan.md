# Plan Composer — Staged composer (media-first) + video MVP

> Trạng thái: **P1–P5 implemented (step shell, extracted steps, video MVP, media-only, polish) — device QA pending**
> Ngày: 2026-10-31
> Phạm vi: composer 2 bước trong 1 route, full-screen modal, ảnh + video
> Nền tảng: Expo SDK 57, React Native 0.86, New Architecture
> Nguồn thật: code hiện tại; nền: [`docs/feel-spec.md`](../docs/feel-spec.md) §4.2, [`docs/design-system.md`](../docs/design-system.md) §7.2
> Plan liên quan: [`f1-composer-plan.md`](./f1-composer-plan.md), [`f7-video-plan.md`](./f7-video-plan.md), [`f7b-video-backend-plan.md`](./f7b-video-backend-plan.md)
> Mỗi phase = 1 PR độc lập; gate: `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Quyết định chốt (từ trao đổi)

1. **2 bước UX, 1 route code**: giữ `/composer`, thêm state `step: "media" | "details"`; không tách 2 route.
2. **Full-screen modal** thay cho `formSheet` hiện tại; **native header** (không tự vẽ overlay).
3. **Step 1 = system picker + preview**: dùng `expo-image-picker` (thư viện + camera OS), không custom in-app gallery.
4. **Draft → Details**: mở lại khi draft đã có nội dung/media thì vào thẳng Details; draft trống thì bắt đầu ở Media.
5. **Cho phép media-only**: bài có media được phép caption rỗng (đổi schema).
6. **Video trong MVP**: chọn từ thư viện + quay bằng camera OS (`expo-image-picker`), **không** thêm `expo-camera`.
7. **Tổ hợp media**: **1 video HOẶC tối đa 4 ảnh**, không trộn.
8. **Giới hạn video client**: `≤ 90s`, `≤ 100MB`.
9. **Text-only nhanh**: step Media có lối tắt `Chỉ viết chữ` sang Details để không chậm so với flow 1 trang cũ.

## 1. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| Route `src/app/(modals)/composer.tsx` | `formSheet`, `title: "New post"`, header native |
| `src/app/(app)/_layout.tsx` | Tab Create `disabled` + `tabPress` → `router.push("/composer")`; giữ nguyên |
| `features/composer/screens/composer-screen.tsx` | 1 trang: body + media strip + toolbar; header Dismiss/Post |
| Draft `composer:draft` | `{ body, localUris }`; load 1 lần, save debounce 500ms; `localUris` là ảnh, full `PickedMedia` không persist |
| `useComposerMedia` | Chỉ ảnh, cap 4; `pickMore` / `addAsset` / `removeAt`; `PickedMedia[]` chỉ sống trong session |
| `shared/media/picker.ts` | `PickedMedia.kind = "image" \| "video"`; `pickFromLibrary("images" \| "videos" \| "all")`; `takePhoto` chỉ ảnh |
| `shared/media/upload.ts` | Multipart `/uploads`; đã map `video/mp4`, `video/quicktime`; không có progress |
| `shared/media/video-info.ts` | `getLocalVideoMetadata(asset)` trả `durationMs/fileSize`, fallback picker values |
| `shared/media/video.tsx` | `AppVideo` (`expo-video`) dùng được cho preview trong composer |
| `entities/post/schema.ts` | `createPostInputSchema`: `body` trim **min 1**, `mediaIds` max 4 → chưa cho media-only |
| `features/composer/validation.ts` | `COMPOSER_MAX_MEDIA = 4`; message "photos"; chưa có rule video |
| `features/composer/mutations/use-create-post.ts` | Upload từng `PickedMedia` → `POST /posts`; outbox payload `{ body, localUris }` |
| `features/composer/outbox-sender.ts` | Rebuild `PickedMedia` từ uri; `guessMimeType` chỉ ảnh; validate body min 1 → **chưa hỗ trợ video/media-only** |
| `entities/post/ui/post-card.tsx` | Chỉ render video khi `media.length === 1 && kind === "video"`; ảnh qua `MediaGrid` |
| `entities/post/ui/post-body.tsx` | Luôn render `Text` (kể cả body rỗng) → cần kiểm tra spacing |
| Android permissions | `CAMERA`, `RECORD_AUDIO` đã có trong manifest |
| Mock `POST /posts` | Yêu cầu `body.length >= 1`; map mọi `mediaIds` thành ảnh `picsum` |
| Mock `/uploads` | Luôn trả URL ảnh `picsum` |

## 2. Scope MVP vs Non-goals

**MVP (xong là dùng được):**

- Full-screen modal + 2 step trong cùng `ComposerScreen`.
- Step Media: chọn ảnh (nhiều, ≤4) **hoặc** 1 video (thư viện/camera OS), preview, xoá, lỗi giới hạn inline.
- Step Details: caption ≤280 (có thể rỗng nếu có media), preview media, `Post`.
- Lối tắt text-only từ step Media.
- Draft resume đúng quyết định 4; giữ draft + outbox hiện có.
- Media-only post (schema + outbox + mock).
- Video qua `uploadMedia` hiện có; outbox re-upload video đúng mime.
- Giữ nguyên testID cũ; thêm testID cho step/toggle mới.
- Analytics: giữ `logComposerOpen/Post/Success/Fail`; thêm event chuyển step (không đổi tên event cũ).

**Non-goals (để phase sau):**

- Custom in-app gallery/grid, album, phân trang thư viện.
- Quay video trong app bằng `expo-camera`; camera viewfinder TikTok-like.
- Trim/crop/filter/cover/âm thanh; nhiều video/bài; carousel.
- Progress % upload, resumable upload.
- Scheduled post, multi-draft, audience picker, tag/location.
- Đổi API `/posts` hoặc thêm endpoint video riêng (dùng `/uploads` hiện tại).

## 3. UX + state contract

```ts
type ComposerStep = "media" | "details";
```

**Mở composer**

1. Load draft xong mới render step (tránh nháy Media → Details).
2. `body.trim().length > 0 || media.length > 0` → `details`; ngược lại → `media`.
3. Draft có `localUris` nhưng asset đã mất sau restart: vẫn vào Details, hiện preview lỗi + note "chọn lại media" (giữ hành vi cảnh báo hiện có).

**Header native (theo step)**

| Step | Left | Right | Title |
|---|---|---|---|
| `media` | `Dismiss` (đóng modal) | `Next` (disabled khi chưa có media) | `New post` |
| `details` | `Back` → về `media` | `Post` | `New post` |

- Step Media có link phụ `Chỉ viết chữ` → `details` với media rỗng.
- Android hardware back: ở `details` → `media`; ở `media` → đóng modal. Dùng `BackHandler` trong screen (không đổi route).
- Nút `Post` bật khi: `body.trim().length > 0` **hoặc** `media.length > 0`; và không đang upload/post.
- Đóng giữa chừng: giữ hành vi lưu draft im lặng như hiện tại (không confirm).
- Không persist `step`; mỗi lần mở tính lại theo draft (quyết định 4).

**testID**

- Giữ: `composer-screen`, `composer-dismiss-button`, `composer-post-button`, `composer-input`, `composer-media-add`, `composer-camera`, `composer-counter`, `composer-error`, `composer-queued-badge`, `composer-uploading`, `composer-media-strip`, `composer-media-thumb-<i>`, `composer-media-remove-<i>`.
- Mới: `composer-step-media`, `composer-step-details`, `composer-next-button`, `composer-back-button`, `composer-text-only-button`, `composer-video-preview`, `composer-media-limit-error`.

**Presentation**

- `src/app/(modals)/_layout.tsx`: `composer` đổi `presentation: "formSheet"` → `"fullScreenModal"`; giữ `headerShown: true`.
- Full-screen modal không có swipe-dismiss; kiểm tra lại Android back + iOS header.

## 4. Media rules + validation

**Mode (derive từ item đầu tiên)**

- Chưa có media: được chọn ảnh hoặc video.
- Đã có 1 ảnh: chỉ thêm ảnh, tối đa 4.
- Đã có 1 video: khoá thêm media (nút add/camera disabled).
- Không trộn ảnh + video trong cùng bài.

**Video**

- Nguồn: `pickFromLibrary("videos")` hoặc camera OS (`launchCameraAsync` với `mediaTypes: ["videos"]`, `videoMaxDuration: 90`).
- Validate sau khi chọn bằng `getLocalVideoMetadata(asset)` (fallback `PickedMedia.duration/fileSize`):
  - `durationMs > 90_000` → lỗi `Video must be 90 seconds or shorter.`
  - `fileSize > 100 * 1024 * 1024` → lỗi `Video must be 100MB or smaller.`
- `PickedMedia.duration` là mili-giây (expo-image-picker); ghi rõ trong code để tránh nhầm giây.
- Preview: `AppVideo` (`autoPlay={false}`, `showControls`, `muted={false}` tuỳ UX), poster không có → nền `backgroundElement`.

**Ảnh**

- Giữ `pickFromLibrary("images", { allowsMultiple: true, quality: 0.8 })`, cap 4.
- `takePhoto` hiện có giữ nguyên.

**Validation**

- `COMPOSER_MAX_MEDIA = 4`; thêm `COMPOSER_MAX_VIDEO_DURATION_MS = 90_000`, `COMPOSER_MAX_VIDEO_BYTES = 100 * 1024 * 1024`, `COMPOSER_MAX_VIDEO = 1`.
- `validateComposerInput(body, mediaIds)` vẫn là cổng cuối; message đổi "photos" → "media".
- Tách hàm thuần `validateComposerMedia(media: PickedMedia[]): string | null` để test (mix, cap, video limit).
- `entities/post/schema.ts`: `body: z.string().trim().max(280)` + `superRefine`/`refine`: phải có `body.length > 0 || mediaIds.length > 0`. Giữ `mediaIds.max(4)`.
- `updatePostInputSchema` **không đổi** (edit post vẫn phải có text).

## 5. Data contracts

**Draft `composer:draft`**

- Đổi shape sang `{ body: string, media: PickedMedia[] }` để giữ `kind/mimeType/duration/fileSize` qua restart và validate lại.
- Backward-compat parse: nếu không có `media` mà có `localUris` → map mỗi uri thành `PickedMedia` với mime/kind đoán theo đuôi file (thêm `mp4/mov`).
- `useComposerDraft` trả `{ body, setBody, media, setMedia, loaded, clear }`; bỏ việc sync `localUris` thủ công ở screen.
- Vẫn 1 key duy nhất; vẫn debounce 500ms; asset file tmp có thể mất sau restart (đã cảnh báo).

**Outbox `post.create`**

- **P3 implemented**: giữ payload `{ body, localUris }`; `uploadMedia` gửi `?kind=video`; `outbox-sender` suy ra mime/kind từ đuôi file (`mp4`, `mov`, `m4v`, `webm`) và re-upload đúng video.
- **P4 implemented**: vẫn payload `{ body, localUris }`; `parsePostCreatePayload` cho body rỗng khi `localUris.length > 0` (dùng placeholder ids cho `parseCreatePostInput`). Payload `{ body, media }` với kind/mime rõ ràng là tuỳ chọn tương lai, không cần cho MVP.
- `toPickedMedia(ref)` set đúng `kind` + `mimeType`; `width/height = 0` như hiện tại.
- `handlePostCreateJob` upload tuần tự như cũ; `createPostRemote` không đổi.

**API**

- Không thêm endpoint. `POST /posts { body, mediaIds }` giữ nguyên; P4 đã cho `body` rỗng khi có media.
- `/uploads` dùng chung cho ảnh + video. Xác nhận backend trả URL phát được cho video (xem Open questions).

**Mock**

- `mockUploadResponse`: trả URL mp4 thật khi request là video (nhận diện qua tên file/mime trong multipart hoặc query test-only), ảnh giữ `picsum`.
- `mockCreatePostResponse`: bỏ yêu cầu `body.length >= 1`; cho `mediaIds` 1 video hoặc ≤4 ảnh; map `kind` theo id/flag để feed demo được video.
- Fixture video dùng URL mp4 public ổn định (theo `f7-video-plan.md`).

## 6. File plan

| File | Thay đổi |
|---|---|
| `src/app/(modals)/_layout.tsx` | `presentation: "fullScreenModal"` |
| `features/composer/screens/composer-screen.tsx` | Orchestrator: load draft → step, header actions, back handler, submit |
| `features/composer/components/composer-media-step.tsx` (mới) | Chọn ảnh/video, preview, remove, limit errors, `Chỉ viết chữ` |
| `features/composer/components/composer-details-step.tsx` (mới) | Caption, preview/strip, counter, trạng thái upload/queued/error |
| `features/composer/hooks/use-composer-draft.ts` | Shape `body + media`, backward-compat `localUris` |
| `features/composer/hooks/use-composer-media.ts` | Mode ảnh/video, `canAddMore`, `takeVideo`, validate duration/size |
| `features/composer/validation.ts` | Rule video/mix/cap + message "media" |
| `features/composer/mutations/use-create-post.ts` | `localUris` derive từ `media`; payload outbox mới |
| `features/composer/outbox-sender.ts` | Payload `media`, video mime, cho body rỗng |
| `features/composer/components/composer-media-strip.tsx` | Thumb video (icon play/duration) + ảnh; giữ testID |
| `entities/post/schema.ts` | Cho media-only (`body` rỗng hợp lệ khi có media) |
| `shared/media/picker.ts` | `takeVideo` (camera OS), giữ `takePhoto` |
| `shared/media/index.ts` | Export `takeVideo` |
| `shared/api/mock-handlers.ts` | Upload video thật + `POST /posts` media-only/video |
| Tests liên quan | `validation`, `use-composer-draft`, `use-composer-media`, `use-create-post`, `outbox-sender`, composer screen |

Không đụng: route Create tab, `useCreatePost` entity, feed cache, `PostCard` (đã render single video).

## 7. Phases (PR độc lập)

| Phase | Nội dung | Ước lượng thô |
|---|---|---|
| **P1 — Step shell** | Full-screen modal, `ComposerStep`, header Dismiss/Next/Back/Post, draft resume, text-only shortcut. Chưa đổi media behavior (vẫn ảnh). | 0.5 ngày |
| **P2 — Media step (ảnh)** | Tách `composer-media-step` + `composer-details-step`, preview/strip/remove, giữ upload/outbox ảnh; body vẫn bắt buộc. | 1 ngày |
| **P3 — Video MVP** | `takeVideo`, picker videos, validate ≤90s/≤100MB, `AppVideo` preview, 1 video XOR 4 ảnh, outbox video mime. | 1–1.5 ngày |
| **P4 — Media-only** | Schema cho body rỗng khi có media, copy/validation, mock `POST /posts`, xử lý `PostBody` rỗng trên feed. | 0.5 ngày |
| **P5 — Polish + QA** | Analytics step, a11y, giữ testID, Maestro flows, device QA Android/iOS, copy tiếng Việt/Anh. | 0.5–1 ngày |

Tổng thô: **~3.5–4.5 ngày** (chưa tính thời gian chờ backend xác nhận video upload).

## 8. Test plan

**Unit**

- `validateComposerMedia`: ảnh ≤4 ok; ảnh thứ 5 lỗi; video >90s lỗi; video >100MB lỗi; trộn ảnh+video lỗi; 1 video ok.
- `parseCreatePostInput`: body rỗng + media ok; body rỗng + không media lỗi; body >280 lỗi.
- `parsePostCreatePayload`: payload mới + legacy; body rỗng + media ok; video mime giữ đúng.
- `useComposerDraft`: parse shape mới; legacy `localUris` → `media`; clear.

**Integration**

- Composer screen: mở với draft trống → Media; draft có body/media → Details.
- Chọn ảnh → Next → Details → Post → draft clear, feed prepend (mock).
- Chọn video → preview → Post.
- Text-only shortcut → Details → Post.
- Back từ Details giữ nguyên media; Android back lần 2 đóng modal.
- Media-only: Post bật khi có media, body rỗng.
- Outbox: mất mạng → queued; drain re-upload video đúng mime.

**E2E/Maestro**

- `composer-media-to-details`, `composer-text-only`, `composer-video-post`, `composer-media-only`.
- Không đổi flow feed/comment hiện có.

**Device QA**

- Android: full-screen modal, hardware back, keyboard ở Details, chọn/quay video, upload lớn.
- iOS: header Back/Dismiss, full-screen presentation, video preview.

## 9. Rủi ro / edge cases

- **Backend video**: `/uploads` hiện là endpoint chung; cần xác nhận nhận video và trả URL phát được (mp4) trước khi P3.
- **Draft mất asset sau restart**: persist `PickedMedia` giúp còn metadata, nhưng file tmp vẫn có thể mất; preview lỗi phải fallback + cho remove/re-pick, không crash.
- **Media-only trên feed**: `PostBody` rỗng có thể tạo khoảng trống; kiểm tra và ẩn block body khi rỗng.
- **Video lớn**: không có progress; UI chỉ "Uploading…"; 100MB có thể timeout trên mạng yếu → outbox đã có, nhưng cần copy rõ.
- **Outbox video**: nếu chỉ lưu uri, mime/kind có thể sai sau restart; payload mới giữ kind/mime để tránh upload nhầm `image/jpeg`.
- **Full-screen modal**: khác `formSheet` ở gesture/back; phải test Android back và iOS swipe.
- **Keyboard**: step Details vẫn cần keyboard avoidance (composer hiện dùng `KeyboardAvoidingView`).
- **TestID/Maestro**: giữ testID cũ; flow mới thêm testID mới; không đổi tên cũ.

## 10. Open questions

1. `/uploads` có nhận video và trả URL phát được không? Nếu backend cần flow riêng (resumable/Stream như F7b) thì video MVP phải chờ hoặc chuyển sang F7b.
2. Server trả `media.kind` dựa trên gì (mime upload, mediaId, hay client flag)? Ảnh hưởng mock + cách map `mediaIds`.
3. Có cần giới hạn tổng thời lượng/kích thước theo server không (ngoài 90s/100MB client)?
4. Media-only có được phép cho **video** không, hay chỉ ảnh? (đề xuất: cho cả hai)
5. Có cần tắt swipe-to-dismiss khi draft đang có nội dung không? (đề xuất: giữ như hiện tại, lưu draft im lặng)
6. Có cần analytics funnel riêng cho từng step (`composer_media_step`, `composer_details_step`) không?
