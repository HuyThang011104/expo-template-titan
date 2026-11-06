# Roadmap Chức Năng Production — Mạng Xã Hội (Expo SDK 57)

> Tài liệu này nói về **nghiệp vụ người dùng**, không nói kỹ thuật.
> Backend thật / API thật để sau. Mọi phase trong file này chạy được với mock hiện tại.
> Đọc cùng: `production-social-foundation.md` (kernel kỹ thuật) + code thật trong `expo-sdk-57-template/src`.

## 0. Nguyên tắc

1. User story trước, API sau. Chưa cần backend vẫn nghiệm thu được bằng mock + hành vi trên máy thật.
2. Mỗi phase = dùng được thật, không phase treo. Không mở phase mới khi phase cũ chưa đạt nghiệm thu.
3. Không thêm tab mới khi chưa kín vòng cũ. 5 tabs hiện tại là đủ tới khi lên Stories/Reels.
4. Chặn scope: file này KHÔNG yêu cầu chat realtime socket, recommendation ML, video upload backend, admin duyệt. Những cái đó thuộc giai đoạn sau.

---

## 1. Hiện trạng nghiệp vụ (đối chiếu code thật ngày 2026-10-14)

| Vòng nghiệp vụ | Route / màn hiện tại | Dùng được gì | Còn thiếu nghiệp vụ |
|---|---|---|---|
| Auth | `(auth)/sign-in, sign-up` | Đăng nhập mock, giữ login, logout, chặn tab khi chưa login | Quên pass, OTP, đổi pass, 2FA, xóa/vô hiệu hóa tài khoản |
| Home Feed | `(home)/index` | Lướt 40 bài mock, refresh, like/unlike, mở detail | Comment, repost/quote, save, share, hashtag/mention bấm được |
| Đăng bài | `(modals)/composer` + tab Create | Text 1-280 + 0-4 ảnh, nháp qua kill-app, queue khi offline | Đăng video, sửa/xóa bài, nhiều nháp, hẹn giờ |
| Chi tiết bài | `(shared)/post/[id]` | Xem lại 1 bài | Thread bình luận, reply, like comment |
| Profile | `(profile)/index`, `(shared)/user/[handle]` | Xem avatar + tên + list bài | Follow/unfollow, đếm followers, bio/cover/link, sửa profile |
| Search | `(search)/index` | Gõ >=2 ký tự ra user + post | Trending, trang hashtag, lịch sử, gợi ý |
| Inbox | `(inbox)/index` | List 25 thông báo mock, mark-read, bấm vào bài/user | Nhóm thông báo, lọc, cài đặt bật/tắt, badge ngoài icon |
| Chat | `(inbox)/chats, chats/[id]` | Xem list + detail mock | Gửi ảnh/voice, seen/typing/online, group |
| Kiểm duyệt | `(modals)/report` | Report 6 lý do, block/mute ẩn bài | Khiếu nại, lịch sử report, admin duyệt |
| Video | Trong feed | Phát mp4 demo, 1 video/lúc | Quay/upload, reels/stories |
| Settings | Chưa có | Trống | Toàn bộ account/privacy/notification/language |

Kết luận 1 câu: **vào được, lướt được, like được, đăng text+ảnh được. Kết bạn, bình luận, nhắn tin, chỉnh sửa, khám phá thì chưa.**

---

## 2. Chuẩn production là gì (theo mắt người dùng)

Một mạng xã hội ra store phải kín 4 vòng. Thiếu vòng nào là user rời đi.

### Vòng 1 — Loop cốt lõi (bắt buộc, không có là không phải social)
- Tôi follow được người khác, xem được ai đang follow tôi.
- Tôi bình luận được, reply được, like comment được.
- Tôi sửa/xóa bài của mình được.
- Tôi lưu bài để xem sau, chia sẻ ra ngoài được.
- Tôi bấm vào @mention / #hashtag / link trong bài được.
- Profile sửa được tên, bio, avatar, cover.

### Vòng 2 — Giữ chân
- Tôi tìm được người/bài/hashtag đang hot, có gợi ý kết bạn.
- Tôi nhắn 1-1 được: gửi text + ảnh, biết đã gửi/đã xem, biết对方 đang gõ, có push tới đúng hội thoại.
- Thông báo được nhóm gọn, tắt được từng loại ồn.

### Vòng 3 — An toàn + Tài khoản
- Tôi đổi pass, bật 2FA, xem phiên đăng nhập, khóa/xóa tài khoản, tải dữ liệu của tôi.
- Tôi chỉnh privacy: ai xem bài, ai nhắn tin, ai tag tôi.
- Tôi report xong biết kết quả, khiếu nại được nếu bị xử sai.

### Vòng 4 — Tăng trưởng (làm sau cùng)
- Onboarding, mời bạn, tick xanh, công cụ creator, ads/IAP.

---

## 3. Gap so với hiện tại (ưu tiên nghiệp vụ)

| P | Chức năng | Vì sao ưu tiên | Nghiệm thu nghiệp vụ (pass/fail rõ) |
|---|---|---|---|
| P0 | Follow / Unfollow + Followers/Following + Private account | Không có là không phải social graph | Follow từ profile user -> số tăng ngay, unfollow giảm ngay. Private: người lạ chỉ thấy xin-follow, không thấy bài. Vào followers list bấm qua profile khác được. |
| P0 | Comment 2 cấp + Like comment | Tương tác giữ chân số 1 sau like | Mở post detail thấy list comment phân trang, reply thụt cấp, like comment đổi số ngay, fail rollback. Chưa login bấm comment -> về sign-in, không crash. |
| P0 | Edit / Delete bài của mình | Niềm tin tối thiểu để dám đăng | Chỉ chủ bài thấy menu sửa/xóa. Sửa xong feed + detail cùng đổi. Xóa xong bài biến khỏi feed/profile/search. Bài người khác không thấy menu. |
| P0 | Save + Share | Giữ user quay lại | Save từ feed/detail -> tab Saved trong profile thấy ngay. Share mở sheet hệ thống được. Unsaved mất ngay. |
| P0 | Mention / Hashtag / Link bấm được | Điều hướng cơ bản | Bấm @handle -> qua user. Bấm #tag -> qua trang tag list bài. Bấm link -> mở browser xác nhận. Text thường không bấm nhầm. |
| P1 | Sửa profile + Bio/Cover/Avatar | Nhận diện cá nhân | Đổi tên/bio/avatar xong header + search + comment cùng đổi. Ảnh lỗi dung lượng sai báo lỗi inline, không crash. |
| P1 | Trang hashtag + Trending + Lịch sử search | Khám phá tối thiểu | Trang tag có header + list bài. Trending hiện khi chưa gõ gì. Xóa lịch sử được. Bấm kết quả qua đúng đích. |
| P1 | Cài đặt thông báo + Privacy cơ bản | Chống ồn, chống quấy rối | Tắt like -> không nhận like nữa nhưng vẫn nhận follow. Chặn người lạ nhắn tin. Blocked user không thấy bài tôi, tôi không thấy bài họ. |
| P1 | Settings tài khoản | Ra store bắt buộc | Đổi pass, xem phiên, vô hiệu hóa, xóa + xuất dữ liệu. Thiếu là store review + pháp lý hỏi. |
| P2 | Chat 1-1 gửi ảnh + Seen/Typing + Push đúng hội thoại | Nhắn tin thật | Gửi text/ảnh hiện sent->seen. Thấy typing. Offline gửi -> queued, online tự đi 1 lần không trùng. Push bấm vào đúng chat. |
| P3 | Stories/Reels 24h | Tốn nhất, để cuối | Đăng story tồn tại 24h, có viewer list, hết hạn tự ẩn. Không làm khi P0-P2 chưa xong. |

Non-goals trong file này: group chat, voice/video call, livestream, recommendation ML, ads, kiếm tiền creator, admin web duyệt.

---

## 4. Lộ trình 4 giai đoạn (mock-first, không đợi backend)

Chi tiết implement ở từng file, file này chỉ giữ bản đồ:

- `functional-g1-core-loop.md` — Giai đoạn 1, làm trước
- `functional-g2-personal.md` — Giai đoạn 2, mở khi G1 pass
- `functional-g3-chat.md` — Giai đoạn 3, mở khi G2 pass
- `functional-g4-stories.md` — Giai đoạn 4, chưa mở

### Giai đoạn 1 — Kín loop đọc-viết (2-3 tuần, 1 dev)
1. Follow/unfollow + followers/following + private xin-duyệt
2. Comment 2 cấp + like comment trong post detail
3. Edit/delete bài + save/share + mention/hashtag/link
- Xong khi: làm được chuỗi `follow -> comment -> sửa bài -> save -> bấm hashtag qua trang tag` trên máy thật bằng mock, không cần mạng backend.

### Giai đoạn 2 — Kín loop cá nhân (1-2 tuần)
1. Sửa profile (tên/bio/avatar/cover)
2. Trang hashtag + trending + lịch sử search
3. Settings: đổi pass, phiên, privacy ai-nhắn-tin/ai-xem, notif bật/tắt từng loại, xóa tài khoản (mock xác nhận)
- Xong khi: QA cầm máy tạo 2 user mock A/B kiểm tra `A block B ->互相 không thấy nhau`, `tắt notif like -> hết ồn`.

### Giai đoạn 3 — Kín loop nhắn tin (2 tuần)
1. Chat 1-1 text + ảnh + seen/typing + offline queue
2. Push tới đúng hội thoại + queue khi chưa login (kế thừa Phase 10 cũ)
- Xong khi: A nhắn B khi B offline -> B online nhận 1 lần đúng 1 tin, bấm push vào đúng chat.

### Giai đoạn 4 — Mới tới video/stories (để sau)
- Không mở khi Giai đoạn 1-3 chưa pass checklist device.

---

## 5. Checklist nghiệm thu chung (mọi phase)

- [ ] 2 user mock A/B kiểm tra chéo được, không chỉ test 1 user.
- [ ] Kill app mở lại không mất trạng thái quan trọng (follow/comment/save/draft).
- [ ] Tắt mạng có thông báo + retry rõ, không treo, không double-post/double-chat.
- [ ] Chưa login bấm vào deep-link/comment/chat -> về sign-in, không crash, login xong quay lại được thì tốt, tối thiểu không mất app.
- [ ] Mọi lỗi validate hiện tiếng Việt/Anh inline, không alert trắng, không crash.
- [ ] Maestro 1 flow happy-path cho phase đó (mở từ login -> làm hành động -> thấy kết quả).

---

## 6. Đề xuất việc tiếp theo

1. Chốt Giai đoạn 1 mục 1 (Follow) làm trước vì nó mở khóa mọi màn khác.
2. Viết mock `follow/comment/save/hashtag` theo đúng shape đã có của `post/user`, không đổi schema giữa chừng.
3. Không nối backend thật cho tới khi Giai đoạn 1 pass trên máy thật. Nối sớm chỉ nhân bug mạng vào bug nghiệp vụ.
