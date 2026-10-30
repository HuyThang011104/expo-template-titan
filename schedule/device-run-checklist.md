# Checklist chạy thiết bị thật — production-social-foundation

Nguồn: `schedules/production-social-foundation.md`. Code Phase 0–13 đã implement, chưa smoke-test device thật.
Đánh `[x]` khi xong. Làm theo thứ tự 0 → 9. Không mở F1–F5 khi DoD chưa xanh.

## 0. Chuẩn bị môi trường

- [ ] Node 22.13+ (`node -v`)
- [ ] `pnpm exec expo --version` chạy trong project
- [ ] `pnpm exec eas login` + `eas whoami`
- [ ] Android: EAS cloud hoặc Android Studio (đang dùng cloud, không emulator)
- [ ] `pnpm typecheck` pass
- [ ] `pnpm lint` + `pnpm exec eslint .` pass
- [ ] `pnpm test -- --ci` pass (hiện tại 17 suites / 102 tests)
- [ ] `expo-doctor` 21/21 pass

## 1. Build + cài Dev Client lên máy thật

- [ ] `pnpm exec eas build --platform android --profile development-device`
- [ ] Cài APK lên máy thật, mở được launcher dev-client
- [ ] `pnpm exec expo start --dev-client` → load JS, không lỗi Metro
- [ ] Variants: `APP_VARIANT=preview pnpm exec expo config --type public` hiện tên `Social (preview)`, bundle `com.example.social.preview`, scheme `social-preview`
- [ ] `android/` `ios/` không nằm trong git (`git status`)

> Blocker iOS: cần Apple Developer Program ($99/năm) + đăng ký UDID. Profile `development` (simulator) không cài được lên máy thật.

## 2. Phase 5 — Session + Protected routes + splash

- [ ] Cold start chưa login: splash → sign-in, không thấy tabs nháy qua
- [ ] Login mock (`dev-token`): `router.replace("/")` vào `(app)`
- [ ] Kill app, mở lại: vẫn login (SecureStore key `session`)
- [ ] Logout: về sign-in, back cứng không vào lại tab
- [ ] Deep link `/` lúc chưa login → `sign-in`, không flicker

## 3. Phase 8 — Navigation shell

- [ ] 5 tab native hiện đúng: home, search, create, inbox, profile
- [ ] Chưa login không thấy tab
- [ ] Tab Create (`disabled` + `tabPress` listener): mở `/(modals)/composer` dạng `formSheet`, dismiss về tab cũ
- [ ] `media-viewer` mở dạng `modal`
- [ ] `/post/abc` đã login không crash (placeholder đọc `usePost`)
- [ ] `/user/abc` không crash
- [ ] `+not-found` có Link về `/`

## 4. Phase 7 — Entities User + Post (verify lại trên device)

Code đã có ở `src/entities/post/`, `src/entities/user/` nhưng checklist gốc chưa tick.

- [ ] `PostCard(postId)` render từ fixture, không cần feed feature
- [ ] Like flip `likedByMe`, `likeCount ±1` qua `entities/post/cache.likePost`
- [ ] Hai list cùng trỏ 1 id đều thấy like (canonical `['posts', id]`, `['users', id]`)
- [ ] Like fail (`post-fail`) → rollback
- [ ] Zod parse fail → log, không crash UI
- [ ] Grep: không feature nào `setQueryData` post ngoài `entities/post/cache.ts`

## 5. Phase 9 — Feed đọc + like optimistic

- [ ] Feed load 40 post / 8 user / page 10 từ mock, scroll không freeze trên máy tầm trung
- [ ] Pull-to-refresh hoạt động
- [ ] Footer loading trang tiếp theo, hết trang dừng đúng
- [ ] Empty state + Error + nút Retry (`feed-retry-button`) hoạt động
- [ ] Like trên feed → mở detail vẫn liked
- [ ] Unlike `post-fail` (index 7) rollback đúng
- [ ] `Link` tới `/post/[id]` + prefetch `queryKeys.post(id)` on press
- [ ] Post video index 4 hiển thị placeholder, không crash (video full để F7)

## 6. Phase 10 — Push + deep link

- [ ] Sau login mới xin quyền notification
- [ ] Lấy được Expo push token, `POST /devices` mock `{ ok: true }`, không log token thô
- [ ] Payload `{ type: "post", id }` → `router.push(hrefs.post(id))`
- [ ] Chưa login + push post → queue href, flush sau login, không crash
- [ ] Scheme local: `social-dev://post/abc` (đã login) mở đúng màn
- [ ] Universal link `https://social.example/p/{id}` rewrite về `/post/{id}` qua `rewriteUniversalPath` (+native-intent try/catch)
- [ ] `expo config --type public` hiện đúng `associatedDomains` + `intentFilters` (`/p/`, `/post/`, `/u/`, `/user/`)

## 7. Phase 11 — Observability (cần DSN thật)

- [ ] Điền `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG/PROJECT/AUTH_TOKEN` (không hardcode)
- [ ] Login → `setUser({ id: 'dev-user' })`, không gửi token/PII
- [ ] Chuyển tab → screen tracking gửi event (pattern `usePathname` + `useGlobalSearchParams`)
- [ ] `logger.error` forward Sentry với extra đã redact
- [ ] Mở `(shared)/dev-crash` (chỉ `__DEV__`), bấm throw → event hiện dashboard (hiện tại chưa DSN nên chỉ log `would send`)

## 8. Phase 12 — CI / EAS Workflows (chạy thật)

- [ ] Push PR đầu tiên → workflow `ci` chạy: install frozen → `typecheck` → `lint` → `lint:boundaries` → `test -- --ci`
- [ ] PR trắng (docs) chạy < 5 phút
- [ ] Cố tình `features/feed` import `features/auth` → CI đỏ đúng rule boundaries
- [ ] `eas workflow:validate` pass local đã xong, confirm lịch sử chạy trên EAS dashboard
- [ ] Push main đổi native config → job `development-builds` (Android + iOS simulator) chạy; cron nightly `0 2 * * *`
- [ ] Maestro local (khi có build `e2e-test`): `e2e/flows/auth-and-feed.yaml` — boot → tap `sign-in-button` → thấy `feed-list` + `post-card-feed-p-1` → tap `like-button-feed-p-1`

## 9. Phase 13 — Preview OTA trên PR

- [ ] `eas build --profile preview` cài 1 lần lên máy QA
- [ ] Mở PR → workflow `pr-preview` chạy job `update` channel `preview`, message `pr-<N>`
- [ ] Job `github-comment` post link + QR Orbit
- [ ] QA load update thấy thay đổi JS, không rebuild native (nhờ `runtimeVersion: fingerprint`)
- [ ] Lưu ý: workflow đọc từ default branch, phải merge workflow vào main trước

## 10. Definition of Done — foundation

Chỉ tick khi tất cả đúng:

- [ ] Dev Client, 3 variants, không commit `android/` `ios/`
- [ ] Protected auth, session SecureStore, splash không flicker
- [ ] ESLint boundaries fail CI nếu feature import feature
- [ ] `User`/`Post` canonical cache; like xuyên list
- [ ] Native tabs + composer sheet + `post/[id]` + `user/[handle]`
- [ ] Feed FlashList + pull-to-refresh + empty/error
- [ ] Deep link scheme local
- [ ] typecheck, lint, unit test trên CI
- [ ] EAS development + preview profiles chạy được ít nhất 1 lần

Khi đó mới mở F1–F5.

## 11. F1 — Composer (text + 0–4 ảnh + offline queue)

Nguồn: `schedule/f1-composer-plan.md`. Chạy trên Android dev-client, build có mock
(`EXPO_PUBLIC_API_MOCK=true`) hoặc staging phục vụ `POST /posts` + `POST /uploads`.

- [ ] Tab Create → sheet `composer` (`formSheet`) mở, keyboard hiện, autofocus vào `composer-input`
- [ ] Gõ 10 chữ → Post → dismiss về tab cũ, feed prepend bài mới ngay (không refetch full), mở detail đọc được
- [ ] Counter `n/280`; body rỗng → nút Post disabled; Zod fail → lỗi inline đỏ (`composer-error`)
- [ ] Chọn 1–4 ảnh (`composer-media-add`) → preview strip (`composer-media-thumb-{i}`), xóa từng ảnh (`composer-media-remove-{i}`); quá 4 bị chặn ở UI
- [ ] Bấm Post khi có ảnh → hiện `Uploading…` (`composer-uploading`), Post disabled, xong prepend bài có ảnh
- [ ] Từ chối quyền library → im lặng, không crash, vẫn post text được
- [ ] Gõ dở → kill app → mở lại: text còn (draft `composer:draft`); note re-pick hiện nếu lần trước có ảnh
- [ ] Tắt mạng → Post → badge `Queued — will send when online` (`composer-queued-badge`); bật mạng → drain 1 lần, feed có đúng 1 bài mới
- [ ] Job hỏng > 5 attempts → `dead`, xem được qua `listDeadJobs`
- [ ] Grep gate: `rg "from '@/features/feed" src/features/composer` → 0; `rg setQueryData src/features/composer` → 0
- [ ] Maestro (khi có build `e2e-test`): `maestro test e2e/flows/composer.yaml` pass

## 12. Interaction UX upgrade — device gate

- [ ] Profile Posts/Saved: tap tab và swipe ngang đều đổi page; mỗi page giữ đúng scroll offset sau khi chuyển qua lại.
- [ ] Profile sticky tabs/title: title hiện đúng theo scroll, không che list và không tạo layout shift.
- [ ] Android action sheet: mở từ overflow, swipe xuống để đóng, tap ngoài để đóng, back để đóng; không còn warning `formSheet` + `transparent`.
- [ ] Android gesture navigation và 3-button navigation: sheet không bị kẹt, không double-close, action row vẫn thực hiện đúng.
- [ ] iOS action sheet: drag indicator, interactive dismiss, safe area và keyboard behavior đúng.
- [ ] Media viewer: scale 1 kéo ảnh xuống để dismiss; scale > 1 vẫn pan/zoom, không dismiss nhầm; nút close vẫn hoạt động.
- [ ] Web fallback: profile tab vẫn đổi được bằng tap khi native pager không khả dụng.

## Nhật ký chạy

| Ngày | Device / OS | Build profile | Kết quả | Lỗi / ghi chú |
| ---- | ----------- | ------------- | ------- | ------------- |
|      |             |               |         |               |
