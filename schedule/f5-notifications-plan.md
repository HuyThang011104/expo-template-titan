# Plan F5 — Notifications inbox (list + mark read)

> Nguồn thật: code hiện tại + `production-social-foundation.md` bảng chi tiết (`F5 Notifications inbox | push Phase 10 | list + mark read`).
> Chốt phạm vi: F5 = **Notifications inbox**. KHÔNG làm Settings, KHÔNG làm Moderation, KHÔNG làm Chat (F4 đã quyết định bỏ qua — `ChatListScreen` / `ChatDetailScreen` giữ nguyên placeholder).
> Lưu ý mâu thuẫn tài liệu: bản đồ tóm tắt `foundation.md:74` ghi `F5 Settings / moderation`, nhưng bảng chi tiết `foundation.md:977-978` tách `F5 Notifications inbox` / `F6 Moderation`. Plan này theo **bảng chi tiết**. Settings + Moderation dời sang F6.
> Mỗi phase = 1 PR độc lập, `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| Route `(inbox)/index.tsx` re-export `InboxScreen`, vỏ xong | Giữ nguyên, route mỏng |
| `features/inbox/index.ts` export `InboxScreen + ChatListScreen + ChatDetailScreen` placeholder | `InboxScreen` rewrite ở F5; 2 màn Chat giữ placeholder F4 |
| `entities/notification/` | **Chưa tồn tại** — phải tạo mới theo mẫu `entities/post` |
| `queryKeys` chưa có notification keys; `endpoints.notifications(cursor)` **đã có** (`endpoints.ts:43-44`) nhưng chưa ai gọi + chưa có `markRead` endpoint | Thêm keys + `markNotificationRead(id)` endpoint ở F5.0 |
| `mock-handlers.ts` chưa có `GET /notifications`, chưa có mark-read | Thêm ở F5.0 (xem §3) |
| Kernel dùng được ngay | `shared/notifications/handlers.ts` (tap `{ type: "post", id }` → `hrefs.post(id)`, queue khi chưa login, flush sau login), `register.ts` (`POST /devices` mock `{ ok: true }`), `shared/navigation/hrefs.ts` (`post/user`), `FlashList` pattern `feed-list.tsx`, `PostCard(postId)` canonical, `shared/ui` (`Screen/Input/Button/Text`), `logger.warn` + redact |
| Push Phase 10 | Xong: xin quyền sau login, token lên mock, cold-start + queue flush đã có test |

## 1. Nguyên tắc chốt (theo `architecture.md` + `AGENTS.md` + `foundation.md`)

1. Route mỏng: `src/app` chỉ re-export, không fetch/parse trong route.
2. Một chiều: `features/inbox → entities/notification (+ post/user khi cần actor/post preview) + shared`, cấm `features/inbox → features/feed` hay bất kỳ feature nào, cấm `shared → entities/features`.
3. Chỉ `entities/notification/cache.ts` được `setQueryData(queryKeys.notification…)` và patch list notifications. Feature gọi hàm cache, không tự `setQueryData`.
4. Server state = TanStack Query infinite. Client state hẹp: không có draft; chỉ ephemeral UI (đang mark-read id nào).
5. Zod fail → `logger.warn`, skip item, không crash. Không log token/PII thô.
6. Entity mới không redefine `Post`/`User` — actor/post preview đọc qua canonical `entities/user` + `entities/post` nếu cần.

## 2. Scope MVP vs Non-goals

**MVP (F5 xong là dùng được):**
- List notifications phân trang (`GET /notifications?cursor=`, page 10, `{ ids, nextCursor }`), pull-to-refresh, empty/error + Retry.
- Row hiển thị: avatar actor + text theo kind (`like` / `follow` / `post` / `mention` tối thiểu 3 kinds đầu) + time relative + unread dot.
- Tap row → optimistic mark read 1 item → navigate đúng đích (`postId` → `hrefs.post`, `handle` → `hrefs.user`); kind lạ → mark read nhưng ở lại list, không crash.
- Nút `Mark all read` (1 mutation, optimistic tất cả visible).
- Badge unread: `useUnreadCount` đọc từ cache list, không fetch riêng.
- Analytics `logInboxOpen/NotificationTap/MarkRead`.

**Non-goals (để F6+):**
- Chat realtime (F4 đã skip), stories/reels, recommendation.
- Settings screens (`account/privacy/notifications-settings`), Moderation (`report modal`, block/mute → User relationship) — thuộc F6.
- Push rich media, grouping theo ngày, filter tab (All/Mentions), swipe actions, realtime socket live-insert (chỉ `invalidateOnForeground` ở F5, socket thật để sau).
- Badge số trên app icon (cần native entitlements riêng, tách PR).

## 3. Contract API + mock (chốt trước khi code UI)

```text
GET /notifications?cursor=<offset|null>
res: { items: NotificationWire[], nextCursor: string | null }

NotificationWire = {
  id: string,            # "n-1"
  kind: "like" | "follow" | "post" | "mention",
  actorId: string,       # user id tồn tại trong fixtures
  postId: string | null, # set khi kind like/post/mention
  read: boolean,
  createdAt: ISO
}

POST /notifications/:id/read
res: NotificationWire (đã read: true)
```

- `shared/api/endpoints.ts`: giữ `notifications(cursor)`, thêm `markNotificationRead: (id) => /notifications/<id>/read`.
- `entities/notification/api.ts`: `fetchNotificationsRemote(cursor, opts)` (validate từng item, skip bad, `null` chỉ khi shape trang sai) + `markNotificationReadRemote(id, opts)` (pattern y `likePostRemote`: transport throw, schema fail → `null`).
- `entities/notification/schema.ts`: `notificationSchema` + `parseNotification` (fail → `null` + warn), KHÔNG export raw zod.
- `shared/api/mock-handlers.ts`: fixtures deterministic ~25 items trộn kinds + `read: false` vài item đầu để test unread; `GET /notifications` paginate offset; `POST /notifications/:id/read` set `read: true` (stateless mock: echo item với `read: true`, không persist cũng chấp nhận, ghi rõ trong test); id lạ → 404.
- Out-of-scope: không lưu token vào payload; không dùng `process.env.EXPO_OS` ở đây.

## 4. Cache strategy (quan trọng nhất)

Thêm `entities/notification/cache.ts` (file duy nhất được chạm keys notification):

```ts
setNotification(qc, n: Notification): void        // canonical ["notifications", id]
getNotification(qc, id): Notification | undefined
patchNotification(qc, id, patch): Notification | undefined
hydrateNotification(qc, wire): { notificationId: string }  // set canonical, trả id
markRead(qc, id, opts): Promise<void>  // optimistic read:true → server wins → rollback
markAllReadVisible(qc): void           // optimistic tất cả page đã load → read:true (server sync ở mutation)
```

- List key mới trong `query-keys.ts`: `notification: (id) => ["notifications", id]`, `notifications: () => ["notifications"]` (infinite, pages `{ ids, nextCursor }`).
- `entities/notification/queries.ts`: `useNotifications(opts)` infinite (`staleTime 30s`) + `prefetchNotificationTarget` (warm `queryKeys.post` / `queryKeys.user` khi `onPressIn`, copy pattern `use-home-feed`) + `useMarkNotificationRead(id)` (`useMutation` gọi `markRead`, KHÔNG auto-retry) + `useUnreadCount()` (selector đếm `read === false` trên pages đã load, không query riêng).
- `features/inbox/queries/use-inbox.ts` (nếu cần): wrapper mỏng gọi entity hooks + `resolveNotificationHref` từ shared để navigate; feature KHÔNG `setQueryData`.
- Grep gate sau F5: `rg "setQueryData.*notif" src` chỉ hit trong `entities/notification/cache.ts`.

## 5. File map (tạo / sửa)

```text
SỬA:
 src/shared/query/query-keys.ts        += notification(id), notifications()
 src/shared/api/endpoints.ts           += markNotificationRead(id)
 src/shared/api/mock-handlers.ts       += GET /notifications + POST /notifications/:id/read (+ fixtures)
 src/shared/api/__tests__/endpoints.test.ts += cases mới
 src/features/inbox/index.ts           += exports inbox mới (giữ Chat* placeholder)

TẠO:
 src/entities/notification/model.ts
 src/entities/notification/schema.ts
 src/entities/notification/api.ts
 src/entities/notification/cache.ts
 src/entities/notification/queries.ts
 src/entities/notification/index.ts
 src/entities/notification/__tests__/notification-cache.test.ts
 src/features/inbox/queries/use-inbox.ts              # wrapper entity + target resolve (mỏng)
 src/features/inbox/components/notification-row.tsx   # avatar + text + unread dot, testID notification-row-<id>
 src/features/inbox/components/notifications-list.tsx # FlashList ids, testID inbox-list
 src/features/inbox/screens/inbox-screen.tsx          # REWRITE (xóa placeholder F4 ở màn này, giữ 2 màn Chat)
 src/features/inbox/analytics.ts                      # logInboxOpen/Tap/MarkRead (giống feed/analytics.ts)
 src/features/inbox/queries/__tests__/use-inbox.test.tsx
 e2e/flows/notifications.yaml                         # boot → login → tab Inbox → thấy inbox-list → tap row đầu → sang post detail
```

Xóa placeholder `Coming soon — Phase F4` **chỉ** trong `inbox-screen.tsx`. Giữ nguyên 2 file chat.

## 6. Thứ tự PR (mỗi dòng = 1 PR)

```text
F5.0 Entity + mock (không UI)
  model/schema/api/cache/queries/index + queryKeys + endpoints.markRead + mock 2 routes + tests notification-cache
  Xong khi: pnpm test entities/notification pass, mock GET /notifications trả 10 items + nextCursor qua fetch test

F5.1 Inbox read-only (ship được ngay)
  use-inbox + notification-row + notifications-list + inbox-screen rewrite (list + refresh + empty/error/retry) + analytics
  Xong khi: login mock → tab Inbox → 10 rows, scroll hết 25, pull-refresh không mất vị trí, Zod item lỗi bị skip không crash

F5.2 Mark read (optimistic)
  useMarkNotificationRead + mark-all-read + unread dot/count + tap-navigate (post/user) + rollback khi 404/500
  Xong khi: tap row → dot tắt ngay → sang đúng detail → back lại vẫn read; API fail → dot bật lại; unknown kind không crash

F5.3 Polish + e2e
  prefetch target onPressIn, a11y testIDs (inbox-list, notification-row-*, inbox-retry-button, inbox-mark-all), screen-tracking, Maestro flow
  Xong khi: checklist device §8 tương đương F1 pass trên Android dev-client (mock EXPO_PUBLIC_API_MOCK=true)
```

## 7. UI spec tối thiểu (để không cãi nhau lúc review)

- Tab Inbox: header `Inbox` + nút `Mark all` phải (`testID="inbox-mark-all"`, disabled khi `unreadCount === 0`).
- Row: `Avatar(actor)` 40px + text 2 dòng (`<Actor> liked your post` / `started following you` / `posted: <prefix body>`) + `formatRelative(createdAt)` + dot xanh khi `!read`. Cả row bọc `Link` + `Pressable onPressIn` prefetch.
- Đang mark-read row đó: dot mờ + disable tap row đó (không disable cả list).
- Lỗi: inline empty/error dưới header (`NETWORK` → gợi ý retry, `HTTP` → message server). Nút Retry `inbox-retry-button`.
- Success tap: patch cache ngay (không chờ refetch), navigate sau 0ms để cảm giác tức thì.

## 8. Verify chung mọi PR F5

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
# tay:
# - greps: rg "from '@/features/feed" src/features/inbox → 0; rg "setQueryData" src/features/inbox → 0; rg "setQueryData.*notif" src → chỉ entities/notification/cache.ts
# - device: login mock → tab Inbox → list 10 → tap row post → sang /post/[id] đúng → back → dot tắt; airplane-mode → error + Retry
```

## 9. Rủi ro đã biết

- Mock stateless: mark-read không persist qua refetch full → chấp nhận ở F5 (test assert optimistic + rollback, không assert persist); BE thật sẽ hết.
- Divergent kinds: `handlers.ts` hiện chỉ biết `{ type: "post", id }`, list F5 có thêm `like/follow/mention` → chốt 1 hàm `resolveNotificationTarget(wire)` dùng chung cả push-tap và list-tap, kind lạ → `null` + warn.
- Race tap-nhanh 2 rows: mutation per-id + disable per-row, không global lock; mark-all dùng `Promise.allSettled` rồi `invalidate` 1 lần.
- F4 skip: `features/inbox` vẫn chứa 2 màn Chat placeholder + CODEOWNERS `@chat` treo — ghi rõ trong PR description để F4 sau không nhầm inbox đã xong.
- Unread badge ngoài tab: không làm ở F5 (cần native badge entitlements); `useUnreadCount` chỉ phục vụ dot + nút mark-all trong màn.

## 10. DoD F5

- [ ] List 25 mock items phân trang 10, refresh/empty/error/retry đúng testID.
- [ ] Tap row mark-read optimistic + navigate đúng post/user; fail rollback.
- [ ] Mark-all-read optimistic visible pages.
- [ ] Không vi phạm boundaries (CI xanh).
- [ ] `e2e/flows/notifications.yaml` chạy được khi có build + checklist device tick mục inbox.
- [ ] Settings + Moderation + Chat explicitly KHÔNG làm ở F5 (ghi trong release notes để khỏi nhầm với nhãn `F5 Settings / moderation` ở bản đồ tóm tắt).
