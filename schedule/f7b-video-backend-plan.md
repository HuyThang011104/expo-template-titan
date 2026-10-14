# Plan F7b — Video in feed với backend (HLS + signed URL)

> Nguồn thật: code F7a đã xong + contract backend (Media service: `displayUrl video-public/video-restricted`, HLS `.m3u8`, TTL 6h, status `PENDING → PROCESSING → READY/FAILED`) + docs `https://docs.expo.dev/versions/v57.0.0/sdk/video/`.
> Chốt phạm vi: **F7b = phát video backend trong feed (READY public/restricted + hiển thị đúng PROCESSING/FAILED).** Upload (`init → upload → notify → poll`) thuộc F1-composer-video, không làm ở đây — F7b chỉ chừa schema để F1 nối vào.
> Mỗi phase = 1 PR độc lập, `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| F7a đã ship | `PostMedia = { kind: "image" \| "video", url: string }`, mock 3 mp4 public, `PostVideo(postId, mediaUrl, isActive)`, `SharedVideoView(uri, shouldPlay, muted, posterUrl?)`, viewability active-1-video, `__mocks__/expo-video.js` global |
| Backend trả (theo xác nhận BE) | `displayUrl: { kind: "video-public" \| "video-restricted", playbackUrl: ".../manifest/video.m3u8[?token=...]", thumbnailUrl, expiresAt? } \| null`; `null` khi status != READY; mobile không bao giờ thấy `stream_uid` raw; RESTRICTED resolve qua domain sở hữu (`POST /internal/media/resolve-url` nội bộ, mobile không gọi trực tiếp) |
| Upload flow (thuộc F1, chỉ tham khảo) | `POST /media/videos/init → uploadUrl (TTL 30p, maxDuration 90s) → upload thẳng Stream (resumable/chunked) → notify-uploaded → poll GET /media/{id}`; lỗi `VIDEO_TOO_LONG` (user tự cắt, server không cắt), 429 (10 video/giờ) |
| Chưa có trong code | HLS handling, `expiresAt`/refresh 403, status UI, redact signed URL, mock shape backend |
| Kernel dùng được ngay | `fetchPost`/`usePost` + canonical cache (`cache.ts` — refetch = invalidate là có URL mới), `thumbnailUrl → expo-image poster` (prop `posterUrl` đã có sẵn ở `SharedVideoView`), `logger.warn` + Sentry forward |

## 1. Nguyên tắc chốt (theo `architecture.md` + `AGENTS.md`)

1. Route mỏng: không thêm route mới. F7b không đụng `src/app`.
2. Một chiều: `features/feed → entities/post + shared`. Schema/model mới nằm ở `entities/post`; `shared` không biết backend shape.
3. Chỉ `entities/post/cache.ts` được `setQueryData` cho post. Refresh URL hết hạn = **invalidate query `["posts", id]` để `fetchPost` lấy URL mới** — cấm tự nối chuỗi/gia hạn token client-side.
4. Zod fail → `logger.warn` + fallback UI, không crash. **Không bao giờ log `playbackUrl` raw** (chứa `?token=`) — logger hiện tại chỉ redact theo tên key (`token|password|...`), key `playbackUrl` không match → phải xử lý riêng (§5).
5. `expo-video` SDK 57 cho HLS: iOS yêu cầu uri giữ đuôi `.m3u8` **hoặc** `contentType: 'hls'`; **cache không hỗ trợ HLS trên iOS** — giữ `useCaching` tắt (F7a đã đúng, không bật lên).
6. RESTRICTED: mobile chỉ nhận URL đã resolve nhúng trong response domain sở hữu (`/feed/home`, `/posts/:id`). Không gọi Media trực tiếp, không gọi `/internal/*`.

## 2. Scope F7b MVP vs Non-goals

**MVP (F7b xong là xem được video backend):**
- Map wire backend → `Post` entity (READY có URL, PROCESSING/FAILED/`null` có UI đúng).
- Phát HLS public + restricted (muted loop autoplay, 1 video tại 1 thời điểm — giữ nguyên orchestration F7a).
- `thumbnailUrl` làm poster tới frame đầu (prop đã có, chỉ cần truyền vào).
- RESTRICTED hết hạn: player lỗi/403 **hoặc** `expiresAt` gần hết → invalidate post query → URL mới → `replaceAsync` + phát tiếp, không crash list.
- PROCESSING → progress/skeleton; FAILED → lỗi + (bài của mình thì nút upload lại — wiring sang F1, F7b chỉ chừa prop); `displayUrl: null` ở feed người khác → ẩn khung video, giữ body/like.
- Redact signed URL trong log + Sentry.
- Mock shape backend + staging verify bằng URL thật.

**Non-goals:**
- Upload flow (`init/upload/notify/poll`, check 90s client-side, `VIDEO_TOO_LONG`, 429) → plan **F1-composer-video** riêng. F7b chỉ đảm bảo schema có `mediaId` để F1 dùng.
- Multi-video/carousel trong 1 post, fullscreen, PiP, background playback, preload/cache tuning → F7c.
- Poll PROCESSING → READY realtime cho bài của mình trong feed (dùng refetch khi focus + pull-to-refresh là đủ ở F7b).

## 3. Contract mapping (chốt trước khi code UI)

Backend nhúng trong mỗi post của feed (xác nhận bằng sample JSON thật trước khi code — xem §9):

```text
wire media (backend)                    →  Post entity (mobile)
───────────────────────────────────────────────────────────────
{ mediaId, type: "VIDEO",
  status: "READY" | "PENDING" | "PROCESSING" | "FAILED",
  visibility: "PUBLIC" | "RESTRICTED",
  displayUrl: {
    kind: "video-public" | "video-restricted",
    playbackUrl: ".../manifest/video.m3u8[?token=...]",
    thumbnailUrl: ".../thumbnails/thumbnail.jpg",
    expiresAt?: ISO (chỉ restricted)
  } | null }
```

```ts
// entities/post/model.ts — mở rộng, KHÔNG phá PostMedia image:
type PostVideoMedia = {
  kind: "video";
  mediaId: string;
  status: "READY" | "PENDING" | "PROCESSING" | "FAILED";
  visibility: "PUBLIC" | "RESTRICTED";
  playbackUrl: string | null;   // = displayUrl.playbackUrl (null khi chưa READY)
  thumbnailUrl: string | null;  // = displayUrl.thumbnailUrl
  expiresAt: string | null;     // restricted mới có
};
type PostMedia = { kind: "image"; url: string } | PostVideoMedia;
// Giữ `url` cho image; video đọc `playbackUrl`. Không giữ field `url` cho video
// để không ai nhầm mp4 F7a với HLS F7b.
```

- `schema.ts`: thêm `videoMediaSchema` (zod) + `parsePost` vẫn trả `Post | null` như cũ — item hỏng 1 video → cả post `null` + warn (giữ rule hiện tại) **hoặc** degrade thành post không media? Chốt ở F7b.0: giữ rule hiện tại (null cả post) vì đơn giản, trừ khi feed staging toàn PROCESSING làm trống list — khi đó mới degrade. Ghi quyết định vào PR.
- `mock-handlers.ts`: feed fixtures chuyển 3 video sang shape backend (1 PUBLIC READY, 1 RESTRICTED READY `expiresAt` +6h, 1 PROCESSING `displayUrl: null`); giữ 1 mp4 F7a? **Không** — F7a mp4 xóa khi F7b merge để mock trùng backend. Test dùng URL `.m3u8` giả (`https://example.com/.../video.m3u8`) vì Jest stub player, không fetch thật.
- Không sửa `endpoints.ts` ở F7b trừ khi route refresh là endpoint mới (§4).

## 4. TTL + 403 refresh strategy (quan trọng nhất)

```ts
// entities/post/cache.ts += :
isVideoUrlExpired(post, skewMs = 5 * 60_000): boolean
// true khi video RESTRICTED && expiresAt && now > expiresAt - skew.
// PUBLIC hoặc thiếu expiresAt → false (không đoán).

refreshPostVideo(qc, postId): Promise<void>
// qc.invalidateQueries({ queryKey: queryKeys.post(postId) }) —
// domain sở hữu resolve lại URL rồi nhúng vào GET /posts/:id.
// Không tự gia hạn token, không gọi Media trực tiếp.
```

- **Passive là chính:** `SharedVideoView` báo lỗi phát (`status === "error"`) → `PostVideo` hiện nút Retry (`testID video-retry-<id>`) → tap gọi `refreshPostVideo` → `usePost` refetch → `uri` mới → `replaceAsync` + phát tiếp. Không auto-loop refetch (tránh vòng lặp 403).
- **Guard chủ động nhẹ:** trước khi `shouldPlay` chuyển true, nếu `isVideoUrlExpired` → refetch trước rồi mới phát (tránh bấm play vào URL chết). Chỉ check `expiresAt`, không timer nền.
- Phân biệt 403-hết-hạn vs 403-không-quyền: cần backend xác nhận mã lỗi — nếu API trả 403 kèm code riêng khi hết hạn thì refresh, 403 thật thì hiện "Video unavailable" + không retry (ghi vào §9 hỏi BE, code theo hằng số `VIDEO_URL_EXPIRED_*` khi có).

## 5. Player HLS + bảo mật log

```text
SỬA shared/ui/video/video-view.tsx:
 += prop contentType?: "hls" (truyền { uri, contentType: "hls" } cho expo-video
    khi url kết thúc .m3u8 — cần test device iOS vì uri ký có query ?token=...).
 += prop onError?: () => void (đẩy lỗi phát lên PostVideo để hiện Retry).
 += KHÔNG bật useCaching (HLS iOS không hỗ trợ — docs v57).

SỬA logger.ts:
 += redact giá trị URL có query: key `playbackUrl|thumbnailUrl` → chỉ log
    origin + path (bỏ query), hoặc REDACTED hẳn. Không log `expiresAt` kèm id
    ở mức info (chỉ warn khi refresh fail, kèm postId — không PII).
```

- Segment con có cần token riêng không (Cloudflare Stream signed thường chỉ cần ký manifest)? Hỏi BE + verify device: nếu segment 403 giữa chừng thì cùng đường `onError → refresh` (không code riêng).
- `thumbnailUrl` là public (kể cả asset RESTRICTED?) — xác nhận BE; nếu thumbnail cũng ký thì cùng TTL, poster hỏng → fallback nền `backgroundElement` (đã có).

## 6. File map (tạo / sửa)

```text
SỬA:
 src/entities/post/model.ts            += PostVideoMedia (giữ image nguyên)
 src/entities/post/schema.ts           += videoMediaSchema + parse giữ contract Post|null
 src/entities/post/cache.ts            += isVideoUrlExpired + refreshPostVideo
 src/entities/post/api.ts              += (không thêm hàm nếu refresh = fetchPost có sẵn)
 src/entities/post/index.ts            += exports type + helpers mới
 src/entities/post/ui/post-video.tsx   += nhận PostVideoMedia (thay mediaUrl),
                                         poster=thumbnailUrl, PROCESSING/FAILED/null UI,
                                         onError → Retry → refreshPostVideo
 src/entities/post/ui/post-card.tsx    += truyền media object (thay mediaUrl),
                                         thêm isOwnUpload? (chỉ để hiện nút re-upload → F1)
 src/shared/ui/video/video-view.tsx    += contentType + onError (≤20 dòng)
 src/shared/observability/logger.ts    += redact playbackUrl/thumbnailUrl query
 src/shared/api/mock-handlers.ts       += fixtures shape backend (PUBLIC/RESTRICTED/PROCESSING)

TẠO:
 src/entities/post/__tests__/video-backend.test.ts  # parse PUBLIC/RESTRICTED/PROCESSING/FAILED/null;
                                                 # isVideoUrlExpired true/false; refresh gọi invalidate
 src/entities/post/ui/__tests__/post-video.test.tsx # thêm cases: PROCESSING skeleton,
                                                 # FAILED lỗi, null ẩn video, onError → Retry
 e2e/flows/video-feed.yaml               # SỬA: id theo staging/mock mới (giữ toggle/mute steps)
```

Không sửa: `query-keys.ts` (dùng key post có sẵn), `feed-list.tsx` orchestration (giữ nguyên — chỉ nhận `isActive`), routes, `app.config.ts`.

## 7. Thứ tự PR (mỗi dòng = 1 PR)

```text
F7b.0 Entity schema + mock (không UI)
  model/schema (PostVideoMedia) + fixtures backend + tests parse
  Xong khi: parse PUBLIC/RESTRICTED/PROCESSING/FAILED/null đúng, fixtures cũ image không vỡ,
            quyết định null-cả-post vs degrade-media đã ghi vào PR

F7b.1 Player HLS + log redact (chưa refresh)
  video-view contentType/onError + logger redact + tests
  Xong khi: HLS staging phát được tay trên Android + iOS dev-client (muted autoplay),
            log/Sentry không chứa ?token=

F7b.2 TTL refresh + trạng thái UI (ship demo backend)
  isVideoUrlExpired + refreshPostVideo + PostVideo Retry/PROCESSING/FAILED/null + post-card wiring
  Xong khi: pause lâu quá TTL / force-expire 1 id → tap Retry → URL mới → phát tiếp;
            PROCESSING hiện progress, FAILED/null không crash list

F7b.3 Staging verify + e2e
  URL staging PUBLIC + RESTRICTED thật, flow video-feed.yaml chạy, checklist device §10
  Xong khi: DoD §10 tick đủ trên Android dev-client (+ iOS nếu có device)
```

## 8. UI spec bổ sung (trên nền F7a)

- READY: như F7a (16:9, poster `thumbnailUrl`, toggle ▶/❚❚, mute 🔇/🔊) + thêm nút Retry (`video-retry-<id>`) chỉ hiện khi lỗi phát.
- PROCESSING/`PENDING` (`playbackUrl: null`): skeleton 16:9 + dòng "Processing video…" + spinner, giữ body/like/time. Không nút phát.
- FAILED: khung lỗi + "Video failed to process" + nút re-upload **chỉ khi là bài của mình** (`isOwnUpload` — prop từ feature, default false); bài người khác chỉ hiện lỗi gọn.
- `displayUrl: null` ở feed người khác: ẩn cả khung video (không skeleton to), giữ body/like như post text.
- testIDs giữ: `post-video-<id>`, `video-toggle-<id>`, `video-mute-<id>` + mới `video-retry-<id>`, `video-status-<id>` (processing/failed cho Maestro).

## 9. Câu hỏi chốt với backend (xong mới code F7b.0)

1. 2 sample JSON feed/post thật (PUBLIC + RESTRICTED + PROCESSING/FAILED) — schema không đoán.
2. Segment HLS có cần token riêng không? Cho URL staging PUBLIC + RESTRICTED thật để test device.
3. Route refresh khi 403/hết TTL là gì (`GET /posts/:id` lại hay endpoint riêng)? Mã phân biệt 403-hết-hạn vs 403-không-quyền?
4. Spec 3 endpoint upload + error codes (`init`, `notify-uploaded`, `GET /media/:id`, `VIDEO_TOO_LONG`, 429 `Retry-After`?) — để chừa `mediaId` đúng cho F1-composer-video.
5. `thumbnailUrl` của asset RESTRICTED có public không? 1 post tối đa mấy video? Feed có chứa PROCESSING của người khác không?

## 10. Verify + DoD F7b

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
# greps: rg "stream_uid" src → 0 (mobile không bao giờ chạm uid raw);
#        rg "playbackUrl" src/shared/observability → chỉ hit redact;
#        rg "setQueryData" src/features/feed → 0; rg "useCaching" src → 0
# device (dev-client, mạng thật, staging):
# - PUBLIC HLS autoplay muted, poster tới frame đầu
# - RESTRICTED HLS phát được; force-expire → Retry → phát tiếp, không crash
# - PROCESSING hiện progress; FAILED/null không vỡ list; like/detail/search không vỡ
```

DoD:

- [ ] Feed phát HLS PUBLIC + RESTRICTED, 1 video tại 1 thời điểm (giữ orchestration F7a).
- [ ] Hết TTL/403 → Retry ra URL mới, không tự gia hạn token.
- [ ] PROCESSING/FAILED/`null` có UI đúng, không crash.
- [ ] Log/Sentry không chứa signed query; `stream_uid` không xuất hiện trong code.
- [ ] Boundary xanh; `e2e/flows/video-feed.yaml` chạy với mock mới.
- [ ] Upload flow explicitly KHÔNG làm — sang plan F1-composer-video.
