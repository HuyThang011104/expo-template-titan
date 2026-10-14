# G4 — Stories / Reels 24h (để sau cùng, chưa mở)

> Thuộc: `production-social-functional-roadmap.md` Giai đoạn 4.
> Điều kiện mở: G1+G2+G3 pass checklist máy thật. Đây là phase tốn nhất, không mở sớm.

## 1. Vì sao để cuối
Stories/Reels nhân đôi pipeline media + moderation + feed ranking + seen-tracking. Mở sớm khi core chưa kín sẽ vỡ.

## 2. Khi nào mở
- Follow/comment/save + profile/settings + chat 1-1 đã dùng được với mock.
- Đã chốt được backend media (HLS signed URL, TTL, PROCESSING/FAILED như `f7b-video-backend-plan.md`), nếu không story video sẽ kẹt.

## 3. Scope dự kiến (khóa trước khi code)
- Đăng story ảnh/video tồn tại 24h, tự ẩn khi hết hạn.
- Viewer list: ai đã xem story của tôi.
- Highlights giữ lại story đã hết hạn (tối đa N).
- Reply story -> đi vào chat 1-1 (kế thừa G3).
- Report story như report post (kế thừa F6).

## 4. Không làm
- Live,Shop, ads, kiếm tiền creator. Thuộc vòng tăng trưởng sau G4.

## 5. Checklist mở G4
- [ ] G1+G2+G3 pass.
- [ ] Có 2 URL HLS staging PUBLIC + RESTRICTED test được trên device.
- [ ] Chốt giữ tối đa mấy story/user/ngày + giới hạn 90s như backend yêu cầu.
