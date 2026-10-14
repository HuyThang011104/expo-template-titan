# Plan F6 — Moderation (report modal + block/mute)

> Nguồn thật: code hiện tại + `production-social-foundation.md:978` (`F6 Moderation | report modal | block/mute → entity User relationship`) + `architecture.md:188` (`features/moderation/ # report, block, mute`) + route modal `architecture.md:129` `(modals)/report.tsx`.
> Chốt phạm vi: F6 = **report + block + mute**. KHÔNG làm Settings, KHÔNG làm Chat (F4 skip), KHÔNG làm Notifications (F5). F6 độc lập với F5, chạy được ngay sau F3.
> Mỗi phase = 1 PR độc lập, `pnpm typecheck + pnpm lint + pnpm exec eslint . + pnpm test -- --ci` pass.

## 0. Hiện trạng đối chiếu (không đoán)

| Cái | Trạng thái |
|---|---|
| Routes `(modals)/` chỉ có `composer.tsx + media-viewer.tsx`, `_layout.tsx` chỉ đăng ký 2 screens đó | Chưa có `report.tsx` — phải thêm route + đăng ký `formSheet` |
| `entities/post/ui/post-card.tsx` + `post-actions.tsx` dumb (like only), không có menu `...` | Giữ dumb — entry point truyền từ ngoài vào qua props, không import moderation vào entity |
| `entities/user/model.ts` chỉ có `id/handle/displayName/avatarUrl`, `schema.ts` strict 4 fields, `cache.ts` chỉ `setUser/setUserByHandle` | Chưa có relationship — F6 thêm **không phá** User hiện tại (xem §4) |
| `endpoints.ts` chưa có `reports/block/mute` nào | Thêm ở F6.0 |
| `mock-handlers.ts` chưa có moderation routes | Thêm ở F6.0 |
| `queryKeys` chưa có relationship keys | Thêm ở F6.0 |
| Kernel dùng được ngay | `shared/ui` (`Screen/Sheet/Button/Input/Text`), `FlashList` pattern, `hrefs.post/user`, `logger.warn` + redact, `formSheet` pattern `composer.tsx`, `formatRelative` |

## 1. Nguyên tắc chốt (theo `architecture.md` + `AGENTS.md`)

1. Route mỏng: `(modals)/report.tsx` chỉ re-export, `presentation: "formSheet"` đăng ký trong `(modals)/_layout.tsx`.
2. Một chiều + public API: `features/moderation` là feature mới; **không feature nào được import nó** (ban `feature → feature`), kể cả feed/profile/search. Entry point giải quyết bằng **callback injection** (§4), không bằng import chéo.
3. `PostCard`/`UserRow` giữ dumb: nhận thêm props optional (`safetyTarget?`), không biết moderation tồn tại.
4. Chỉ entity được `setQueryData` cho keys của mình. Feature gọi helper, không tự `setQueryData`.
5. Zod fail → `logger.warn`, skip/không crash. Không log nội dung report chi tiết ở mức PII (chỉ log `targetType + reason`, không log `details` nguyên văn ở production).
6. Block/mute là hành vi nhạy cảm: confirm trước khi chạy, mutation nào cũng có rollback, không auto-retry (tránh double-block gây nhầm).

## 2. Scope MVP vs Non-goals

**MVP (F6 xong là dùng được):**
- Report post/user: mở `/report?targetType=post|user&targetId=<id>` → chọn 1 trong 6 reasons (`spam/harassment/nudity/violence/misinformation/other`) + details optional ≤500 → submit → toast/dismiss. Sai schema → lỗi inline.
- Block user: confirm dialog → optimistic `blockedByMe: true` → các list hiện tại ẩn bài của họ (invalidate, chấp nhận nhảy scroll vì hiếm).
- Mute user: như block nhưng nhẹ hơn (ẩn bài, không báo, vẫn giữ follow — chỉ khác ở copy + flag riêng để BE sau phân biệt).
- Unblock/unmute từ dialog (không cần màn settings riêng ở F6).
- Entry points: `PostCard` menu `...` + user/profile header menu `...` (wiring ở từng feature screen, gọi `router.push("/report?...")` hoặc dialog — code 3 dòng mỗi chỗ, không import moderation).
- Analytics `logReportOpen/Submit/Block/Mute`.

**Non-goals (để sau):**
- Settings screens (`account/privacy/notifications-settings`), appeal/kháng nghị, mod queue/admin, shadow-ban, filter từ khóa, report history list.
- Realtime sync block qua socket; BE production thật (`POST /reports` mock là đủ).
- App-icon badge hay push khi bị report (không gửi gì cho người bị report ở client).

## 3. Contract API + mock (chốt trước khi code UI)

```text
POST /reports
req: { targetType: "post" | "user", targetId: string (min 1), reason: Reason, details?: string (<=500) }
res: { ok: true, reportId: string }   # reportId: "r-<ts36>"

GET /users/:id/relationship
res: { userId, blockedByMe: boolean, mutedByMe: boolean, updatedAt: ISO }

POST /users/:id/block    → res: Relationship (blockedByMe: true)
POST /users/:id/unblock  → res: Relationship (blockedByMe: false)
POST /users/:id/mute     → res: Relationship (mutedByMe: true)
POST /users/:id/unmute   → res: Relationship (mutedByMe: false)
```

- `endpoints.ts` thêm: `reports()`, `userRelationship(id)`, `blockUser(id)`, `unblockUser(id)`, `muteUser(id)`, `unmuteUser(id)`.
- `entities/user/relationship.ts` (mới, thuộc entity user): `Relationship` type + zod schema + `parseRelationship` (fail → `null` + warn). Không sửa `userSchema` (fixtures cũ vẫn pass).
- `entities/user/api-relationship.ts` (hoặc mở rộng `api.ts`): 5 hàm trên, pattern y `likePostRemote` (transport throw, schema fail → `null`).
- `mock-handlers.ts`: map relationship in-memory default `{ false, false }`; `POST /reports` validate reason enum + targetId → 201 echo, sai → 400; block/mute/unblock/unmute update map + echo; id lạ (`nope`) → 404 để test rollback.

## 4. Cache + boundary strategy (quan trọng nhất)

```ts
// query-keys.ts thêm:
userRelationship: (id: string) => ["users", id, "relationship"] as const

// entities/user/relationship-cache.ts (file duy nhất chạm keys relationship):
getRelationship(qc, userId): Relationship | undefined   // default { false,false } khi chưa có
setRelationship(qc, rel): void
blockUser(qc, userId, opts): Promise<void>   // optimistic blockedByMe:true → server wins → rollback + invalidateVisibleLists
unblockUser / muteUser / unmuteUser: tương tự
isBlockedByMe(qc, userId): boolean
isMutedByMe(qc, userId): boolean
invalidateVisibleLists(qc): void  // invalidate homeFeed/search/userPosts keys (1 lần, sau block/mute/un-*)
```

- **Vì sao không nhét flag vào `User`:** fixtures + schema + mọi test user hiện tại (4 fields) sẽ vỡ; key relationship riêng giữ tương thích, default `false` khi chưa fetch.
- **Vì sao block dùng invalidate thay vì patch từng list:** số lượng list vô hạn (feed/search/profile); sự kiện hiếm nên chấp nhận mất scroll hơn là patch sót. Ghi rõ trong PR.
- **Entry point không vi phạm boundary:** `PostCard` thêm props optional `safetyTarget?: { targetType: "post"; postId: string; authorId: string }` (entity không import feature/router — chỉ render nút `...` và gọi `onSafetyPress?.()`). Mỗi feature screen (feed/search/profile) truyền `onSafetyPress={() => router.push("/report?...")}` — 3 dòng glue, không import `features/moderation`. `docs-writing-guide.md:352` yêu cầu đúng kiểu này.
- Grep gate sau F6: `rg "setQueryData.*relationship" src` chỉ hit entity; `rg "from '@/features/moderation" src/features` → 0; `rg "from '@/features/feed" src/features/moderation` → 0.

## 5. File map (tạo / sửa)

```text
SỬA:
 src/shared/query/query-keys.ts      += userRelationship(id)
 src/shared/api/endpoints.ts         += reports/block/mute/unblock/unmute/relationship
 src/shared/api/mock-handlers.ts     += fixtures relationship + 6 routes
 src/shared/api/__tests__/endpoints.test.ts += cases mới
 src/app/(modals)/_layout.tsx        += Stack.Screen name="report" formSheet
 src/entities/post/ui/post-card.tsx  += props safetyTarget? + onSafetyPress? (dumb, ≤10 dòng)
 src/entities/user/index.ts          += exports relationship (type/fns, không export raw zod)
 src/entities/user/cache.ts          += KHÔNG sửa (relationship có file cache riêng)

TẠO:
 src/app/(modals)/report.tsx                          # thin re-export ReportScreen
 src/entities/user/relationship.ts                    # type + schema + parse
 src/entities/user/api-relationship.ts                # 5 remote fns
 src/entities/user/relationship-cache.ts              # 8 helpers §4
 src/entities/user/__tests__/relationship-cache.test.ts
 src/features/moderation/model.ts                     # ReportReason enum + labels (không Post/User riêng)
 src/features/moderation/validation.ts                # wrap parse + message UI
 src/features/moderation/mutations/use-submit-report.ts
 src/features/moderation/mutations/use-safety-actions.ts  # block/mute/unblock/unmute wrappers
 src/features/moderation/components/report-reason-list.tsx  # radio 6 reasons, testID report-reason-*
 src/features/moderation/components/confirm-safety-dialog.tsx # block/mute confirm, testID safety-confirm-*
 src/features/moderation/screens/report-screen.tsx    # formSheet: reasons + details + Submit/Dismiss
 src/features/moderation/analytics.ts                 # logReportOpen/Submit/Block/Mute
 src/features/moderation/index.ts                     # public API (ReportScreen + hooks)
 src/features/moderation/__tests__/validation.test.ts
 src/features/moderation/mutations/__tests__/safety-actions.test.tsx
 e2e/flows/moderation.yaml                            # boot → login → feed card ... → report → submit → toast; block → bài biến mất
```

## 6. Thứ tự PR (mỗi dòng = 1 PR)

```text
F6.0 Relationship entity + mock (không UI)
  relationship type/schema/api/cache + queryKeys + endpoints + mock 6 routes + tests
  Xong khi: pnpm test entities/user pass, mock block/mute/report trả đúng qua fetch test, User fixtures cũ không vỡ

F6.1 Report modal (ship được ngay)
  report route + layout + reason-list + report-screen + use-submit-report + analytics
  Xong khi: mở /report?targetType=post&targetId=feed-p-1 → chọn reason → Submit → dismiss + toast; thiếu reason → Submit disabled; Zod fail → lỗi inline

F6.2 Block/mute + filtering
  safety-actions + confirm dialog + invalidateVisibleLists + entry wiring ở feed/search/profile (mỗi chỗ 3 dòng router.push)
  Xong khi: block u-feed-3 → feed/search/profile hết bài của họ; unblock → hiện lại sau refetch; API 404 → rollback dialog còn nguyên

F6.3 Polish + e2e
  a11y testIDs (report-input, report-submit-button, safety-confirm-block, safety-confirm-mute), screen-tracking, Maestro flow
  Xong khi: checklist device tương đương F1 pass trên Android dev-client (mock)
```

## 7. UI spec tối thiểu

- Sheet `formSheet`, header: `Dismiss` trái, `Submit` phải (disabled khi chưa chọn reason hoặc `sending`). Counter details `n/500`.
- Reasons radio 6 mục, mỗi mục `testID="report-reason-<key>"`, chọn 1. Details `Input multiline maxLength 500`, `testID="report-input"`.
- Block/mute confirm: dialog destructive (`Block @handle?` / `Mute @handle?`), 2 nút `Cancel` + `Block/Mute`, `testID="safety-confirm-block/mute"`.
- Nút `...` trên PostCard/user header: `testID="safety-menu-<id>"`, hitSlop 8, không lấn nút like (đặt góc phải header row).
- Success report: dismiss + toast/snackbar “Thanks — we received your report”. Block/mute success: dismiss + list invalidate, không toast dài.

## 8. Verify chung mọi PR F6

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm test -- --ci
# tay:
# - greps: rg "from '@/features/moderation" src/features → 0 (ngoài index); rg "from '@/features/feed" src/features/moderation → 0; rg "setQueryData" src/features/moderation → 0
# - device: login mock → feed card ... → Report → submit → toast; block user → bài biến mất cả 3 surfaces; unblock → refetch hiện lại
```

## 9. Rủi ro đã biết

- Fixtures User cũ không có relationship → mọi helper default `false`, không ép migration; đừng thêm fields vào `userSchema` giữa F6.
- Invalidate sau block làm mất scroll — chấp nhận vì hiếm; ghi rõ trong release notes, không cố patch từng page.
- Report spam/false-positive: mock chấp nhận mọi reason hợp lệ; BE thật cần rate-limit — ngoài scope, ghi follow-up.
- Không log `details` nguyên văn ở production (PII) — logger chỉ nhận `{ targetType, reason }`.
- 2 màn Chat placeholder trong `features/inbox` không liên quan F6 — đừng tiện tay sửa, giữ diff sạch.

## 10. DoD F6

- [ ] Report post/user với 6 reasons + details ≤500 lên mock 201, lỗi inline khi thiếu reason.
- [ ] Block/mute optimistic + rollback + ẩn/hiện xuyên feed/search/profile.
- [ ] `PostCard`/`UserRow` vẫn dumb, không import moderation (boundary xanh).
- [ ] Không vi phạm boundaries (CI xanh).
- [ ] `e2e/flows/moderation.yaml` chạy được khi có build + checklist device tick mục moderation.
- [ ] Settings + Chat explicitly KHÔNG làm ở F6.
