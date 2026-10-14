# Plan F7 — Video in feed (F7a demo trước, F7b backend sau)

> Nguồn thật: code hiện tại + `production-social-foundation.md:979` (`F7 Video in feed | expo-video | recycle player, không autoplay nhiều`) + contract backend mới (HLS `.m3u8`, `displayUrl video-public/video-restricted`, TTL 6h — để dành F7b).
> Chốt phạm vi: **F7a = đúng F7 gốc khi chưa có backend: mp4 public tĩnh, demo được ngay.** KHÔNG làm HLS ký, KHÔNG làm TTL/refresh, KHÔNG làm upload/poll, KHÔNG làm PROCESSING/FAILED. F7b/c chỉ phác thảo để không chốt sai schema.
> Mỗi phase = 1 PR độc lập, `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| `expo-video@~57.0.4` + `expo-audio@~57.0.5` trong `package.json` | Đã cài sẵn, không cài thêm, không đụng native/CNG |
| `entities/post/model.ts` `PostMedia = { kind: "image" \| "video", url: string }`, `schema.ts` validate sẵn | Đủ cho F7a, giữ nguyên — F7b mới mở rộng thêm `mediaId/playbackUrl/thumbnailUrl/expiresAt/status` |
| `entities/post/ui/post-card.tsx` nhánh `video` chỉ là placeholder `View` chữ "Video" | Seam duy nhất cần thay ở F7a |
| `features/feed/components/feed-list.tsx` FlashList v2, `data = postIds`, chưa có viewability | F7a thêm `activeId` tại đây |
| `mock-handlers.ts` video fixture đang dùng URL ảnh `picsum` giả làm video | F7a bắt buộc thay bằng 2–3 mp4 public thật, nếu không không demo được |
| `cache.ts` canonical `["posts", id]` + `hydrateFeedItem` + `likePost` | F7a không đụng — video chỉ đọc, like giữ nguyên |
| Kernel dùng được ngay | `expo-image` (poster), `FlashList`, `queryKeys.post(id)`, `logger.warn`, `useFocusEffect`/`AppState` pattern |

## 1. Nguyên tắc chốt (theo `architecture.md` + `AGENTS.md`)

1. Route mỏng: không thêm route mới, không fetch trong `src/app`.
2. Một chiều: `features/feed → entities/post + shared`, cấm `feature → feature`, cấm `shared → entities/features`.
3. Player primitive dùng lại được ở F2 Profile / F3 Search / post-detail → phải nằm ở `shared/ui/video` + `entities/post/ui`, không nhét vào `features/feed/components`.
4. Chỉ `entities/post/cache.ts` được `setQueryData` cho post. F7a không thêm key mới, không `setQueryData` ở feature.
5. Media: `expo-video` + `expo-image` (poster), không `expo-av`, không `@react-navigation/*`. Docs chuẩn là `https://docs.expo.dev/versions/v57.0.0/sdk/video/`.
6. Zod fail → `logger.warn`, không crash. Không log URL raw ở production.

## 2. Scope F7a vs Non-goals (F7b/c)

**F7a MVP (demo được ngay):**
- Phát mp4 public tĩnh trong feed: muted + loop autoplay, `nativeControls={false}`.
- Tối đa 1 video phát tại 1 thời điểm (recycle player, không autoplay nhiều — đúng chữ plan gốc).
- Tap video toggle play/pause, nút loa toggle mute. Poster `expo-image` tới `onFirstFrameRender`, fallback lỗi không crash.
- Dừng phát khi: scroll qua (viewability), blur tab, app background, mở `post/[id]`.
- Layout cố định 16:9 để không nhảy scroll. A11y testIDs cho Maestro.

**Non-goals → F7b (backend HLS):**
- HLS `.m3u8`, `video-public/video-restricted`, `?token=`, `expiresAt`/refresh 403, `displayUrl: null`.
- Trạng thái `PENDING/PROCESSING/READY/FAILED`, progress upload, nút upload lại.
- `POST /media/videos/init`, upload resumable, `notify-uploaded`, poll `GET /media/{id}`, `VIDEO_TOO_LONG`, 429.
- Cache video (`useCaching` vô tác dụng với HLS trên iOS — cấm bật ở F7a), background playback, PiP, fullscreen nâng cao, analytics xem-bao-lâu.

**→ F7c (sau F7b):** multi-video/carousel trong 1 post, fullscreen, PiP, preload/cache tuning theo đo thật.

## 3. Contract API + mock F7a (chốt trước khi code UI)

```text
Post.media[] giữ nguyên: [{ kind: "video", url: "<mp4 public>" }]
Không thêm field mới ở F7a. F7b mới map:
  displayUrl.playbackUrl → url (khi READY) | null (khi PROCESSING/FAILED)
  displayUrl.thumbnailUrl → poster | null
  expiresAt → field mới
```

- `mock-handlers.ts`: thay fixture video `picsum` bằng 2–3 mp4 public thật (vd. `BigBuckBunny.mp4`, `ForBiggerBlazes.mp4` của Google sample — chốt URL khi code, ưu tiên HTTPS stable). Rải đều feed (không dồn 1 trang) để test "chỉ 1 phát".
- Không thêm endpoint mới. Không sửa `endpoints.ts`, `queryKeys`, `schema.ts` ở F7a.

## 4. Playback + boundary strategy (quan trọng nhất)

```ts
// shared/ui/video/video-view.tsx (dumb, không biết Post):
props = { uri: string, shouldPlay: boolean, muted: boolean, loop?: true,
          posterUrl?: string | null, contentFit?: "cover", testID?: string }
// nội bộ: useVideoPlayer(uri, p => { p.loop = true; p.muted = true }),
// useEvent(player, "playingChange") + "statusChange" để render icon/error,
// <VideoView player nativeControls={false} contentFit="cover"
//   surfaceType="textureView" />  // workaround bug cover-overlap Android trong docs v57
// Mỗi instance 1 useVideoPlayer riêng — cấm share instance (platform limitation).

// entities/post/ui/post-video.tsx (bind Post):
props = { mediaUrl: string, posterUrl?: null, isActive: boolean, muted: boolean,
          onTogglePlay?: () => void, onToggleMute?: () => void }
// post-card.tsx chỉ rẽ: image → expo-image, video → <PostVideo isActive={...} />

// features/feed/hooks/use-active-video-id.ts (pure, dễ test):
(viewableIds: string[], kindById: Map<string,"image"|"video">) => activeId: string | null
// feed-list.tsx: viewabilityConfig { itemVisiblePercentThreshold: 65, minimumViewTime: 400 },
// onViewableItemsChanged (useCallback ổn định) → setActiveId, truyền isActive xuống PostCard.
```

- Vì sao primitive ở `shared`: F2/F3/detail dùng lại, đúng rule "2 feature dùng chung → đẩy xuống".
- Vì sao orchestration ở `features/feed`: chỉ feed biết viewport + scroll; entity không biết list.
- Tách tap: cả card bọc `Link` mở detail, riêng nút play/mute xử lý video — tránh caveat Phase 9 (tap like nổi bọt navigation).
- Grep gate sau F7a: `rg "setQueryData" src/features/feed → 0`; `rg "from '@/features/" src/features/feed → 0` (ngoài index); `rg "expo-av" src → 0`.

## 5. File map (tạo / sửa)

```text
SỬA:
 src/shared/api/mock-handlers.ts        += 2-3 mp4 public thật thay picsum video
 src/entities/post/ui/post-card.tsx     += nhánh video → <PostVideo> (≤15 dòng)
 src/entities/post/index.ts             += export PostVideo
 src/features/feed/components/feed-list.tsx += viewability + activeId + isActive

TẠO:
 src/shared/ui/video/video-view.tsx     # wrapper expo-video dumb
 src/shared/ui/video/index.ts           # public API
 src/shared/ui/video/__tests__/video-view.test.tsx  # mock expo-video: shouldPlay → play/pause, error fallback
 src/entities/post/ui/post-video.tsx    # bind mediaUrl + poster + toggle/mute UI
 src/entities/post/ui/__tests__/post-video.test.tsx # render mp4 + poster (mock shared video-view)
 src/features/feed/hooks/use-active-video-id.ts
 src/features/feed/hooks/__tests__/use-active-video-id.test.ts  # 2 video cùng viewport → 1 active; scroll → đổi; ảnh → null
 e2e/flows/video-feed.yaml              # boot → login → scroll tới post-video-* → tap toggle → assert icon
```

Không sửa: `model.ts`, `schema.ts`, `cache.ts`, `queries.ts`, `query-keys.ts`, `endpoints.ts`, `app.config.ts`, routes.

## 6. Thứ tự PR (mỗi dòng = 1 PR, F7a chỉ 3 PR)

```text
F7a.0 Shared video-view (không đụng feed)
  video-view.tsx + index + test (jest mock useVideoPlayer/VideoView)
  Xong khi: test shouldPlay→play/pause xanh, error không crash, boundary xanh

F7a.1 Entity post-video + mock mp4 thật
  post-video.tsx + post-card rẽ nhánh + mock-handlers mp4 + tests
  Xong khi: feed mock hiện 2-3 video thật phát được tay (tap play), ảnh/like/detail không vỡ

F7a.2 Feed orchestration (ship demo)
  use-active-video-id + feed-list viewability + pause khi blur/background + e2e
  Xong khi: scroll feed chỉ 1 video kêu (muted nên chỉ 1 chạy), qua item khác active đổi, mở detail feed dừng
```

F7b (phác thảo, chưa làm): mở rộng `PostMedia` → `playbackUrl/thumbnailUrl/expiresAt/status`, `parseFeedWireItem` map `displayUrl`, `PostVideo` thêm HLS `contentType`, 403 → invalidate `queryKeys.post(id)`, redact token, staging URL PUBLIC+RESTRICTED test. F7c: multi-video, fullscreen, preload.

## 7. UI spec tối thiểu F7a

- Khung video `width 100%, aspect 16:9 (height ~200-220)`, `borderRadius` từ token, nền `backgroundElement` tới `onFirstFrameRender`.
- Poster `expo-image` đè lên tới frame đầu; buffering hiện `ActivityIndicator` nhỏ giữa; lỗi hiện icon + chữ "Video unavailable" + giữ body/like/time bên dưới.
- Controls tối giản đè góc: nút play/pause giữa (tap cả khung cũng toggle), nút loa góc phải dưới (`video-mute-<id>`). Không thanh seek ở F7a.
- testIDs: `post-video-<id>`, `video-toggle-<id>`, `video-mute-<id>`, giữ `post-card-<id>` cũ.
- A11y: `accessibilityLabel "Play video"/"Pause video"/"Mute"/"Unmute"`, hitSlop 8.

## 8. Verify chung mọi PR F7a

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
# tay:
# - greps: rg "setQueryData" src/features/feed → 0; rg "expo-av" src → 0; rg "from '@/features/" src/features/feed → 0 (ngoài index)
# - device (Android dev-client, mạng thật): login mock → feed scroll → chỉ 1 video chạy, tap toggle/mute đổi icon, blur tab/background dừng, like/detail vẫn đúng
```

## 9. Rủi ro đã biết

- Mp4 sample public có thể chậm/chết → chốt 2 URL dự phòng, lỗi render fallback không crash list.
- Android share `player` instance trên nhiều `VideoView` không work → mỗi `PostVideo` 1 `useVideoPlayer`, không pool global ở F7a.
- `contentFit="cover"` overlap 2 video → `surfaceType="textureView"` theo docs v57.
- Tap video vs `Link` mở detail xung đột → nút play/mute là affordance riêng, không để cả card + video cùng fire.
- Web autoplay có tiếng bị chặn → F7a mặc định muted nên pass; đừng unmute autoplay.
- Đừng bật `useCaching`/background/PiP ở F7a (HLS ở F7b không cache được trên iOS).

## 10. DoD F7a

- [ ] Feed có 2–3 video mp4 thật phát được, chỉ 1 phát tại 1 thời điểm khi scroll.
- [ ] Tap play/pause + mute/unmute đổi trạng thái, poster tới frame đầu, lỗi không crash.
- [ ] Blur tab / background / mở detail dừng video.
- [ ] Like xuyên cache + detail + search/profile không vỡ (regression Phase 9).
- [ ] Không vi phạm boundaries (CI xanh).
- [ ] `e2e/flows/video-feed.yaml` chạy được khi có build + checklist device tick mục video.
- [ ] HLS/TTL/upload explicitly KHÔNG làm — để F7b.
