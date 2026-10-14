# G3 — Kín Loop Nhắn Tin 1-1 (làm sau G2)

> Thuộc: `production-social-functional-roadmap.md` Giai đoạn 3.
> Điều kiện mở: G1+G2 pass. Vẫn mock-first, socket thật để sau.
> Code liên quan: `src/features/chat`, `src/features/inbox`, `src/shared/notifications`.

## 1. Mục tiêu nghiệp vụ

2 user A/B nhắn nhau như app thật: gửi được, biết đã xem, biết đang gõ, offline không mất, bấm push vào đúng hội thoại.

## 2. User stories + nghiệm thu

### G3.1 Nhắn text + ảnh 1-1
- A gửi text/ảnh cho B: hiện `Đang gửi -> Đã gửi -> Đã xem` khi B mở.
- B đang ở trong chat thì tin mới hiện ngay không cần kéo refresh, không trùng tin.
- Ảnh quá nặng/sai định dạng báo lỗi inline, giữ text đã gõ.

### G3.2 Typing + Online + Seen
- A gõ -> B thấy `A đang nhập...` tắt sau vài giây khi A dừng.
- Vào list chat thấy preview tin cuối + giờ + ai chưa đọc.
- Mở chat thì mark-read hết tin trong đó, badge unread ngoài list giảm ngay.

### G3.3 Offline + Push đúng hội thoại
- A offline bấm gửi -> badge `Queued`, online tự đi 1 lần duy nhất, không trùng.
- B offline nhận push bấm vào -> mở đúng `chats/[id]`, chưa login thì queue push flush sau login không crash.
- User bị block (G1/G2) không nhắn được nhau, báo rõ không im lặng mất tin.

## 3. Mock cần
- `conversations`: `{ id, peerId, lastMessage, unreadCount, updatedAt }`.
- `messages`: `{ id, convId, senderId, body, imageUrl|null, status (queued/sent/seen), createdAt }`.
- `presence`: `{ userId, online, typingInConvId|null }` mock đơn giản.

## 4. Không làm ở G3
- Group chat, voice/video call, gửi video/file lớn, E2E,.unsend/sửa tin nhắn (để G3.1 sau nếu cần).

## 5. Checklist ra máy thật
- [ ] A<->B nhắn text+ảnh 2 chiều seen đúng.
- [ ] Typing/online hiện/tắt đúng.
- [ ] Offline queue 1 lần không trùng.
- [ ] Push vào đúng chat, chưa login không crash.
- [ ] Blocked không nhắn được, báo rõ.
- [ ] Maestro: login -> inbox -> chat -> gửi -> seen.
