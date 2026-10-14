# Plan F1 — Composer (đăng bài)

> Nguồn thật: code hiện tại. `composer-screen.tsx` vẫn là placeholder (`coming in Phase F1`), vỏ route đã xong, kernel đã có 80%.
> Mỗi phase = 1 PR độc lập, `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| Route `(modals)/composer.tsx` (formSheet) + `(create)/index.tsx` redirect `/composer` + tab Create `disabled + tabPress` ở `(app)/_layout.tsx` | Xong vỏ, giữ nguyên |
| `features/composer/index.ts` chỉ export `ComposerScreen` placeholder + nút Dismiss | Chưa làm ruột |
| `entities/post/api.ts` chỉ có `fetchPost + likePostRemote` | Thiếu `createPostRemote` |
| `entities/post/cache.ts` chỉ có `setPost/patchPost/hydrateFeedItem/likePost` | Thiếu `addCreatedPost` (prepend feed) |
| `entities/post/schema.ts` chỉ validate `Post` đọc về | Thiếu schema input tạo bài |
| `shared/api/endpoints.ts` chưa có `createPost`, `mock-handlers.ts` chưa có `POST /posts` | Phải thêm |
| Kernel dùng được ngay | `shared/media/picker.ts` (pick, trả `[]/null` khi deny, không throw), `shared/media/upload.ts` (multipart `/uploads`, retry NETWORK/TIMEOUT 1 lần), `shared/storage/db/drafts.ts` (`save/load/deleteDraft`, key `^[A-Za-z0-9._-]+$`), `shared/storage/db/outbox.ts + outbox-worker.ts` (queue `pending → sent/dead`, drain tuần tự, `startOutboxSync` gọi 1 lần ở boot), `shared/ui/input.tsx + button.tsx`, `KeyboardProvider` đã có ở `app-providers.tsx` |
| Feed đọc | `useHomeFeed` infinite `GET /feed/home`, `FeedList` FlashList `postIds`, `PostCard(postId)` canonical — bài mới phải prepend vào đây, không refetch full |

## 1. Nguyên tắc chốt (theo `architecture.md` + `AGENTS.md`)

1. Route mỏng: `src/app` chỉ re-export, không fetch/validate trong route.
2. Một chiều: `features/composer → entities/post + shared`, cấm `features/composer → features/feed`, cấm `shared → entities/features`.
3. Chỉ `entities/post/cache.ts` được `setQueryData(queryKeys.post…)` và patch list feed. Feature gọi hàm cache, không tự `setQueryData`.
4. Server state = TanStack Query. Client state hẹp: `body` text, `picked[]`, `uploading`, draft key duy nhất `composer:draft`.
5. Media: `expo-image-picker → expo-image` preview, không `expo-av`, không progress bar (RN `fetch` không report được — ghi rõ trong UI là "Uploading…").
6. Zod fail → `logger.warn`, không crash. Secret/token không vào outbox payload (sqlite chưa mã hóa).

## 2. Scope MVP vs Non-goals

**MVP (F1 xong là dùng được):**
- Text 1–280 ký tự + 0–4 ảnh (`images` only, `allowsMultiple`, `quality 0.8`).
- Pick → preview → upload từng ảnh qua `uploadMedia` → `POST /posts { body, mediaIds }` → prepend feed trang 0 → clear draft → dismiss về tab cũ → (optional) push `/post/[id]`.
- Draft bền: kill app mở lại còn text + danh sách `uri` local (không đảm bảo file tmp còn — load lại thì ảnh mất nhưng text còn, ghi rõ trong UI).
- Offline: mất mạng khi bấm Post → enqueue `post.create`, online tự drain 1 lần, không double-post.
- Validate + lỗi inline + retry. Analytics `logComposerOpen/Post/Success/Fail`.

**Non-goals (để F1.1 / F2+):**
- Video trim/compress, background upload resumable, progress %.
- Edit post, delete post, repost/quote, mention/hashtag parse, link preview.
- Multi-draft, scheduled post, audience picker.

## 3. Contract API + mock (chốt trước khi code UI)

```text
POST /posts
req:  { body: string (1-280), mediaIds: string[] (0-4) }
res:  Post { id, authorId (= me u-1 mock), body, media: [{kind,url}], likeCount: 0, likedByMe: false, createdAt: ISO }
```

- `shared/api/endpoints.ts`: thêm `createPost: () => "/posts"`.
- `entities/post/api.ts`: thêm `createPostRemote(body, mediaIds, opts) → Post | null` (dùng `client.post`, validate `parsePost`, pattern y hệt `likePostRemote`).
- `entities/post/schema.ts`: thêm `createPostInputSchema = z.object({ body: z.string().trim().min(1).max(280), mediaIds: z.array(z.string().min(1)).max(4) })`, export `parseCreatePostInput` (fail → `null` + warn).
- `shared/api/mock-handlers.ts`: thêm nhánh `POST /posts` trong `defaultEntityResponse` — parse `bodyText` JSON, trả 201 echo với `id: feed-p-new-<ts>`, `authorId: u-1`, `media` map từ `mediaIds` thành `{ kind:"image", url: picsum seed }`. Sai schema → 400.
- Outbox payload schema (opaque string, sender sở hữu): `post.create = { body: string, localUris: string[] }` — worker upload lại rồi gọi `createPostRemote`. Không lưu token.

## 4. Cache strategy (quan trọng nhất)

Thêm vào `entities/post/cache.ts`:

```ts
addCreatedPost(qc, post: Post): void
// 1. setPost(qc, post) — canonical ["posts", id] (key hiện tại là ["posts", id] trong query-keys.ts, giữ nguyên, đừng đổi thành ["post", id] cho khớp docs chữ)
// 2. prepend id vào infinite homeFeed page 0: qc.setQueryData(homeFeed key, old => prepend postId vào pages[0].postIds, dedupe)
// 3. không invalidate full feed (tránh nháy + mất scroll)
```

- `entities/post/queries.ts`: thêm `useCreatePost(opts)` → `useMutation({ mutationFn: (input) => createPostRemote(...) , onSuccess: (post) => post && addCreatedPost(qc, post) })`. Không retry tự động (tránh double-post), lỗi để UI retry tay hoặc outbox.
- `features/composer/mutations/use-create-post.ts`: wrapper mỏng gọi `useCreatePost` entity + `enqueueOutboxJob("post.create", …)` khi `ApiError NETWORK/TIMEOUT`, + `deleteDraft` khi success. Feature không `setQueryData` trực tiếp.
- Grep gate: sau F1, `rg "setQueryData.*feed|setQueryData.*posts" src` chỉ được hit trong `entities/post/cache.ts`.

## 5. File map (tạo / sửa)

```text
SỬA:
 src/entities/post/api.ts            += createPostRemote
 src/entities/post/schema.ts         += createPostInputSchema
 src/entities/post/cache.ts          += addCreatedPost
 src/entities/post/queries.ts        += useCreatePost
 src/entities/post/index.ts          += exports mới
 src/shared/api/endpoints.ts         += createPost()
 src/shared/api/mock-handlers.ts     += POST /posts
 src/app-providers.tsx               += startOutboxSync(sender) 1 lần (sender xử lý kind post.create; unknown kind → log + mark sent để khỏi head-of-line block, theo comment sẵn trong outbox-worker.ts)

TẠO:
 src/features/composer/validation.ts              # wrap parseCreatePostInput + message tiếng Việt/Anh cho UI
 src/features/composer/hooks/use-composer-draft.ts # load/save (debounce 500ms)/clear key "composer:draft"
 src/features/composer/mutations/use-create-post.ts # như §4 + outbox fallback
 src/features/composer/components/composer-media-strip.tsx # preview expo-image, nút xóa từng ảnh, testID composer-media-*
 src/features/composer/screens/composer-screen.tsx # REWRITE: Input multiline + counter + strip + nút Post/Dismiss
 src/features/composer/analytics.ts               # logComposerOpen/Post/Success/Fail (giống feed/analytics.ts)
 src/features/composer/__tests__/validation.test.ts
 src/features/composer/mutations/__tests__/use-create-post.test.tsx  # success prepend + fail không prepend + offline enqueue
 src/entities/post/__tests__/create-cache.test.ts  # addCreatedPost prepend + dedupe
 e2e/flows/composer.yaml                           # boot → login → tab Create → type → Post → feed hiện bài mới (Maestro, chạy khi có build)
```

Xóa placeholder `Coming soon — Phase F1` khi rewrite screen. Giữ `handleDismiss` (canDismiss → dismiss, else replace "/").

## 6. Thứ tự PR (mỗi dòng = 1 PR)

```text
F1.0 Entity + mock (không UI)
  api/schema/cache/queries/index + endpoints + mock POST /posts + tests create-cache
  Xong khi: pnpm test entities/post pass, mock POST /posts trả Post hợp lệ qua curl/fetch test

F1.1 Composer text-only (ship được ngay)
  validation + use-composer-draft + use-create-post + composer-screen rewrite (text + counter + Post/Dismiss) + analytics
  Xong khi: gõ 10 chữ → Post → feed prepend ngay, detail mở được, draft còn sau kill app, Zod fail hiện lỗi inline

F1.2 Media (ảnh)
  composer-media-strip + pickFromLibrary(images, allowsMultiple) + uploadMedia từng ảnh trước POST + mock /uploads đã có
  Xong khi: chọn 0-4 ảnh → preview → Post thành công; deny quyền → trả [] im lặng (theo picker.ts); >4 ảnh chặn ở UI

F1.3 Offline (outbox)
  wiring startOutboxSync ở app-providers + sender post.create (upload lại localUris → createPostRemote → addCreatedPost) + UI badge "Queued — will send when online"
  Xong khi: tắt mạng → Post → job pending; bật mạng → drain 1 lần, feed có 1 bài (không 2); quá 5 attempts → dead, listDeadJobs thấy

F1.4 Polish + e2e
  keyboard-avoid (KeyboardProvider có sẵn), a11y testIDs (composer-input, composer-post-button, composer-media-*), screen-tracking, Maestro flow
  Xong khi: checklist device §8 pass trên Android dev-client
```

## 7. UI spec tối thiểu (để không cãi nhau lúc review)

- Sheet `formSheet`, header: `Dismiss` trái, `Post` phải (disabled khi `body.trim()==""` hoặc `uploading/sending`). Counter `n/280` đỏ khi quá.
- Body `Input multiline maxLength 280`, autofocus, `testID="composer-input"`.
- Strip ảnh ngang dưới input, mỗi thumb 72px + nút ×, nút `+` mở library. Đang upload: overlay `Uploading…` + disable Post.
- Lỗi: inline đỏ dưới input (`parse fail`, `NETWORK` → gợi ý "Queued", `HTTP` → message server). Nút Retry khi fail.
- Success: `deleteDraft("composer:draft")` → dismiss → feed đã có bài (optimistic prepend, không chờ refetch).

## 8. Verify chung mọi PR F1

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
# tay:
# - greps: rg "from '@/features/feed" src/features/composer → 0; rg "setQueryData" src/features/composer → 0
# - device: login mock → tab Create → post text-only → feed prepend; kill app → draft còn; offline → queued → online → 1 bài
```

## 9. Rủi ro đã biết

- File tmp picker bị OS dọn → draft còn text mất ảnh: chấp nhận MVP, UI ghi "photo may need re-pick".
- Double-post khi retry tay + outbox cùng chạy: chặn bằng disabled Post khi `sending`, worker drain tuần tự (`draining` flag có sẵn), không auto-retry mutation.
- `queryKeys.post = ["posts", id]` lệch chữ `['post', id]` trong docs: giữ code, không rename key giữa F1 (sẽ mất cache user đang có).
- Video: cấm ở picker F1 (`images` only) vì feed video mới là placeholder (device checklist ghi "video full để F7").

## 10. DoD F1

- [ ] Post text-only + 0–4 ảnh lên feed ngay, detail đọc được.
- [ ] Draft bền qua kill app (text).
- [ ] Offline queue 1 lần, không trùng.
- [ ] Không vi phạm boundaries (CI xanh).
- [ ] `e2e/flows/composer.yaml` chạy được khi có build + checklist device tick mục composer.
