# G1 — Kín Loop Đọc-Viết (làm trước)

> Thuộc: `production-social-functional-roadmap.md` Giai đoạn 1.
> Chạy được với mock, không đợi backend thật.
> Code liên quan: `src/features/profile`, `src/features/post-detail`, `src/features/feed`, `src/features/search`, `src/entities/post`, `src/entities/user`.

## 1. Mục tiêu nghiệp vụ

User làm được chuỗi: `follow -> bình luận -> sửa bài -> lưu bài -> bấm hashtag qua trang tag` trên máy thật bằng 2 user mock A/B.

## 2. User stories + nghiệm thu

### G1.1 Follow / Unfollow + Followers / Following + Private
- A vào profile B bấm Follow -> nút đổi thành Following ngay, số followers B +1 ngay, qua tab followers thấy A.
- A Unfollow -> số -1 ngay.
- B là private: A bấm Follow -> trạng thái Requested, A chưa thấy bài B. B đồng ý -> A thấy bài.
- B block A (kế thừa F6) -> A không thấy bài B, B không thấy bài A.
- Fail mạng khi follow -> nút quay lại trạng thái cũ + báo lỗi inline.

### G1.2 Comment 2 cấp + Like comment
- Mở `/post/[id]` thấy list comment phân trang, reply thụt cấp 1.
- Đăng comment mới hiện ngay đầu/kh cuối rõ ràng, kill app mở lại còn (mock persist tối thiểu trong session).
- Like comment đổi số ngay, fail rollback.
- Chưa login bấm comment -> về sign-in, không crash.

### G1.3 Edit / Delete bài của mình
- Chỉ chủ bài thấy menu `... -> Sửa / Xóa`.
- Sửa xong feed + detail + profile cùng đổi nội dung.
- Xóa xong bài biến khỏi feed/profile/search, vào link cũ báo `Bài không còn` không crash.
- Bài người khác không thấy menu.

### G1.4 Save + Share
- Bấm Save từ feed/detail -> vào profile tab Saved thấy ngay. Unsaved mất ngay.
- Share mở sheet hệ thống, copy link dạng `social-dev://post/<id>` mở được khi đã login.

### G1.5 Mention / Hashtag / Link bấm được
- Bấm @handle -> qua `/user/[handle]`. Handle lạ -> báo `User không tồn tại`.
- Bấm #tag -> qua trang tag (tạm dùng list search lọc theo tag cũng được ở G1, trang đẹp để G2).
- Bấm link -> hỏi xác nhận mở browser.
- Text thường không bấm nhầm, không vỡ dòng.

## 3. Mock cần (không cần backend)
- `users`: thêm `isPrivate, followersCount, followingCount, followStatus (none/following/requested)`.
- `posts`: thêm `commentCount`.
- `comments`: `{ id, postId, authorId, body, parentId|null, likeCount, likedByMe, createdAt }`.
- `saves`: set `savedIds` theo user hiện tại.
- `hashtags`: map `tag -> postIds`.

## 4. Không làm ở G1
- Group, stories, chat typing, recommendation, admin duyệt, video upload.

## 5. Checklist ra máy thật
- [ ] 2 user A/B follow chéo, private request, block chéo đều đúng.
- [ ] Comment + reply + like comment + fail rollback.
- [ ] Edit/delete chỉ chủ bài, save/share đúng.
- [ ] Bấm mention/hashtag/link qua đúng đích.
- [ ] Tắt mạng có lỗi + retry, không double-comment/double-follow.
- [ ] Maestro: login -> follow -> comment -> save -> mở hashtag.
