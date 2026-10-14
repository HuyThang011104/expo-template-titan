# G2 — Kín Loop Cá Nhân (làm sau G1)

> Thuộc: `production-social-functional-roadmap.md` Giai đoạn 2.
> Điều kiện mở: G1 pass checklist máy thật.
> Code liên quan: `src/features/profile`, `src/features/search`, `src/app/(shared)`, settings mới.

## 1. Mục tiêu nghiệp vụ

User nhận diện được mình, tìm được cái hot, và tự bảo vệ mình khỏi ồn/quấy rối. QA cầm 2 user A/B kiểm tra `chặn nhau + tắt notif` là xong.

## 2. User stories + nghiệm thu

### G2.1 Sửa profile
- Sửa tên/bio/avatar/cover/link xong: header profile + search + comment + inbox cùng đổi, không chỗ cũ chỗ mới.
- Avatar/cover sai định dạng/quá nặng -> báo lỗi inline, giữ ảnh cũ.
- Xem profile người khác không thấy nút sửa.

### G2.2 Trang hashtag + Trending + Lịch sử search
- Trang `/hashtag/[tag]`: có header tag + đếm bài + list bài bấm vào được.
- Chưa gõ gì trong Search thấy Trending (tag hot + user gợi ý).
- Lịch sử search: lưu câu đã bấm, xóa từng câu + xóa hết được.
- Bấm kết quả qua đúng user/post/tag, handle/tag lạ không crash.

### G2.3 Cài đặt thông báo + Privacy
- Tắt `Ai like bài tôi` -> hết notif like nhưng vẫn nhận follow.
- Privacy: `Ai được nhắn tin (mọi người / đang follow / không ai)`, `Ai xem bài (public / followers)`, `Ai tag tôi`.
- Block/mute kế thừa F6 nhưng phải thực thi khắp feed/search/profile/comment, không sót mặt.

### G2.4 Settings tài khoản (ra store bắt buộc)
- Đổi pass, xem phiên đăng nhập + đăng xuất xa, ngôn ngữ vi/en, theme sáng/tối.
- Vô hiệu hóa (ẩn tạm, login lại mở) và Xóa tài khoản (xác nhận 2 bước, mock xóa local + về sign-in).
- Xuất dữ liệu của tôi (mock xuất JSON tối thiểu: profile + bài của tôi).

## 3. Mock cần
- `users`: thêm `bio, coverUrl, link, privacySettings`.
- `hashtags`: `{ tag, postCount, updatedAt }` + trending list.
- `searchHistory`: lưu local theo user.
- `notifPrefs`: `{ like, follow, comment, mention, message } on/off`.
- `sessions`: list phiên mock.

## 4. Không làm ở G2
- Chat group, call, stories, recommendation ML, admin web.

## 5. Checklist ra máy thật
- [ ] Sửa profile lan khắp app.
- [ ] Hashtag/trending/lịch sử chạy đúng, xóa được.
- [ ] Tắt notif like hết ồn, privacy chặn đúng.
- [ ] Đổi pass/phiên/vô hiệu/xóa/xuất mock đúng flow xác nhận.
- [ ] A block B ->互相 không thấy nhau ở feed/search/comment/profile.
