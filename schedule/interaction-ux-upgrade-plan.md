# Plan Interaction UX Upgrade — UX1 → UX5

> Trạng thái: **Implementation complete — device QA pending**
> Ngày: 2026-10-30  
> Phạm vi: media viewer, profile tabs, action bottom sheet, Android modal behavior  
> Nền tảng: Expo SDK 57, React Native 0.86, New Architecture, Reanimated 4, Gesture Handler 2, FlashList 2  
> Spec nền: [`docs/feel-spec.md`](../docs/feel-spec.md), [`docs/design-system.md`](../docs/design-system.md)

## 0. Mục tiêu

Đưa ba interaction chính từ mức “có thể thao tác” lên mức phù hợp với ứng dụng social production:

1. Media viewer đóng được bằng vuốt dọc, nhưng vẫn giữ nút Close cho accessibility.
2. Profile chuyển tab được bằng cả tap và swipe ngang.
3. Action sheet có drag-to-dismiss, backdrop, Android back và không còn dùng cấu hình `RN.Modal` gây warning `formSheet + transparent`.

Kế hoạch này không thay đổi backend/API, navigation hierarchy, canonical query cache hoặc testID hiện có.

## 1. Quyết định thư viện

### 1.1 Bottom sheet

Chọn `@expo/ui/community/bottom-sheet` làm lựa chọn đầu tiên.

Lý do:

- Project đã có `@expo/ui`.
- Có implementation native cho Android/iOS và fallback web.
- API tương thích với mô hình `@gorhom/bottom-sheet`.
- Có `enablePanDownToClose`, snap points, backdrop/scrim, Android back và các wrapper cho content/scroll view.
- Tránh tiếp tục duy trì `RN.Modal` thủ công trong [`src/shared/ui/sheet.tsx`](../src/shared/ui/sheet.tsx).

Không cài `@gorhom/bottom-sheet` ở bước đầu. Chỉ dùng nó làm fallback nếu spike cho thấy bản `@expo/ui/community/bottom-sheet` không tương thích với header action hoặc content hiện có.

Dependency phải được căn theo SDK bằng:

```bash
pnpm exec expo install @expo/ui
```

Không tự ghi version mới vào `package.json`.

### 1.2 Profile pager

Chọn `react-native-pager-view` cho native Android/iOS.

Lý do:

- Đây là component native đúng bài toán horizontal paging.
- Có `onPageSelected`, `setPage`, `setPageWithoutAnimation` và `scrollEnabled`.
- Phù hợp để mỗi tab sở hữu một `FlashList` và giữ scroll position riêng.
- Không phải tự xử lý đồng thời horizontal pan, vertical FlashList và nested gesture.

`@expo/ui/community/pager-view` chỉ là phương án thay thế nếu app nâng minimum iOS lên 17. Với SDK 57 và minimum iOS hiện tại, cần tránh phụ thuộc vào behavior iOS 16 không snap page.

Web không render pager native. Web giữ tap tabs hiện tại hoặc dùng fallback horizontal scroll riêng ở phase sau.

### 1.3 Media viewer

Không thêm dependency ở phase đầu.

Giữ:

- `react-native-gesture-handler` cho gesture;
- `react-native-reanimated` cho transform/opacity trên UI thread;
- `expo-image` cho image rendering.

Gesture dismiss dọc là behavior đặc thù của media viewer và nên là một lớp mỏng bên ngoài zoom gesture hiện có. Không đưa behavior này vào Kotlin/Swift.

`react-native-zoom-toolkit` chỉ được đánh giá nếu implementation hiện tại không đáp ứng zoom/pan/gallery sau device QA. Không đưa vào dependency baseline trước khi có spike riêng.

### 1.4 Media pipeline

Không sửa [`modules/media-pipeline/src/MediaPipelineModule.web.ts`](../modules/media-pipeline/src/MediaPipelineModule.web.ts) trong wave này.

Module này chỉ phụ trách graceful degradation cho video metadata trên web. Nó không tham gia vào bottom sheet, profile pager hoặc media gestures.

## 2. Hiện trạng và điểm cần thay đổi

| Khu vực | Hiện trạng | File chính | Vấn đề |
|---|---|---|---|
| Sheet | `RN.Modal`, iOS `formSheet`, Android `overFullScreen` | [`src/shared/ui/sheet.tsx`](../src/shared/ui/sheet.tsx) | Không drag, chưa có snap point, warning có thể xuất hiện từ cấu hình modal stale/khác |
| Profile tabs | Tabs chỉ gọi `onChange` khi press | [`src/shared/ui/components/tabs.tsx`](../src/shared/ui/components/tabs.tsx) | Không có horizontal pager |
| Profile list | Chỉ một list active, đổi tab thì reset offset về 0 | [`src/features/profile/screens/profile-screen.tsx`](../src/features/profile/screens/profile-screen.tsx) | Mất scroll position và không có swipe |
| Sticky profile tabs | Overlay dọc đã có | [`src/features/profile/components/profile-sticky-tabs.tsx`](../src/features/profile/components/profile-sticky-tabs.tsx) | Chưa liên kết với pager state/active list |
| Media image | Pinch/pan khi zoom, double tap | [`src/features/post-detail/components/media-viewer-image.tsx`](../src/features/post-detail/components/media-viewer-image.tsx) | Pan ở scale 1 không dismiss |
| Media screen | Có close button, route đã tắt native gesture | [`src/features/post-detail/screens/media-viewer-screen.tsx`](../src/features/post-detail/screens/media-viewer-screen.tsx) | Chưa nhận dismiss progress từ ảnh |
| Overflow callers | Profile/post overflow dùng `Sheet` | [`src/features/profile/components/profile-overflow-sheet.tsx`](../src/features/profile/components/profile-overflow-sheet.tsx), [`src/entities/post/ui/post-owner-menu.tsx`](../src/entities/post/ui/post-owner-menu.tsx) | Cần migrate qua adapter mới |

## 3. Thứ tự phụ thuộc

```text
UX0 — contract + dependency spike
  ├── UX1 — Native action sheet adapter
  ├── UX2 — Profile pager
  └── UX3 — Media viewer swipe dismiss

UX1 + UX2 + UX3
  └── UX4 — Android/iOS/web device QA + regression repair
        └── UX5 — docs/spec update + release checklist
```

Mỗi mục UX là một PR độc lập. Không gộp migration bottom sheet và profile pager vào cùng một PR.

## 4. UX0 — Interaction contract và spike

### Mục tiêu

Chốt API nội bộ và xác nhận dependency trên SDK 57 trước khi đổi component dùng chung.

### Việc cần làm

- Xác nhận `@expo/ui` version sau `expo install`.
- Tạo một screen dev-only hoặc mở rộng Design Lab để render:
  - action sheet với RN `Text`, `Pressable`, `ListItem`;
  - drag-to-close;
  - Android back;
  - snap points;
  - dark mode;
  - web fallback.
- Xác nhận `react-native-pager-view` render được hai page chứa `FlashList`.
- Kiểm tra `GestureHandlerRootView` hiện tại vẫn bao phủ pager và media viewer.
- Ghi nhận behavior trên Android máy thật và iOS máy thật, không chỉ emulator.
- Không sửa `MediaPipelineModule`.

### Exit criteria

- [ ] Bottom sheet mở/đóng được bằng tap backdrop, swipe down và Android back.
- [ ] RN children hiện đúng trong sheet.
- [ ] Pager swipe được giữa hai page và `onPageSelected` trả đúng index.
- [ ] Web không crash khi import native pager/sheet; có fallback hoặc platform file.
- [ ] Không có warning `formSheet` + `transparent` trong spike.

## 5. UX1 — Native action sheet

### Mục tiêu

Thay implementation `RN.Modal` của [`Sheet`](../src/shared/ui/sheet.tsx) bằng adapter có cùng public API để không phải sửa business caller hàng loạt.

### Thiết kế adapter

Giữ public API hiện tại:

```ts
type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
};
```

Implementation target:

- Native sheet dùng `@expo/ui/community/bottom-sheet`.
- `visible=false` tương ứng sheet đóng.
- `visible=true` mở tại content height hoặc snap point phù hợp.
- `enablePanDownToClose` bật mặc định cho action sheet.
- `onDismiss` gọi đúng một lần `onClose`.
- Android back gọi `onClose`.
- Backdrop tap gọi `onClose`.
- Giữ `testID` ở wrapper ổn định.
- Giữ title và `SheetAction` là content React Native.
- Không sử dụng `transparent`/`presentationStyle` của `RN.Modal` trong adapter mới.
- Không thay route `formSheet` của composer/report/edit-post/edit-profile; các route này vẫn là native Stack presentation theo spec.

### File dự kiến

Sửa:

- [`src/shared/ui/sheet.tsx`](../src/shared/ui/sheet.tsx)
- [`src/shared/ui/index.ts`](../src/shared/ui/index.ts)
- [`src/app/_layout.tsx`](../src/app/_layout.tsx), nếu provider của community implementation yêu cầu root provider
- [`package.json`](../package.json), chỉ qua `expo install`

Kiểm tra caller, chỉ sửa khi adapter không giữ được contract:

- [`src/features/profile/components/profile-overflow-sheet.tsx`](../src/features/profile/components/profile-overflow-sheet.tsx)
- [`src/entities/post/ui/post-owner-menu.tsx`](../src/entities/post/ui/post-owner-menu.tsx)
- [`src/entities/post/ui/post-body.tsx`](../src/entities/post/ui/post-body.tsx)

### Test

- Unit test `visible` mở/đóng.
- Unit test `onDismiss` không gọi lặp.
- Unit test giữ `testID` và title.
- Test caller profile sign-out vẫn giữ `profile-sign-out-button`.
- Test web fallback không import native-only implementation.

### Device QA

- Android physical device: open, backdrop close, swipe close, back button.
- Android 3-button navigation và gesture navigation.
- iOS physical device: swipe close, safe area, dark mode.
- Action sheet có content dài: scroll không bị khóa.
- Overflow sheet mở từ native `headerRight` không bị cắt bởi header.

### Rollback

Nếu community bottom sheet không render ổn định trong native header context, giữ adapter API và đổi implementation sang `@gorhom/bottom-sheet` v5 sau một spike riêng. Không quay lại thêm behavior vào `RN.Modal` hiện tại ngoài hotfix warning.

## 6. UX2 — Profile horizontal pager

### Mục tiêu

Profile Posts/Saved chuyển được bằng tap và swipe, không mất scroll position từng tab.

### Thiết kế state

```text
tab: "posts" | "saved"
pageIndex: 0 | 1
postsListRef
savedListRef
postsScrollY
savedScrollY
activeScrollY → title transition + sticky tabs
```

### Quy tắc UX

- Tap tab gọi `pagerRef.setPage(index)`.
- Swipe pager gọi `onPageSelected` và cập nhật `tab`.
- Không gọi `scrollToOffset(0)` khi đổi tab.
- Mỗi tab giữ offset riêng trong lúc user chuyển qua lại.
- Header identity và tabs xuất hiện nhất quán trên mỗi page.
- Sticky tabs chỉ có một bản accessibility-visible tại một thời điểm.
- Swipe ngang không được làm hỏng vertical scroll của `FlashList`.
- Khi đang loading/error/empty, pager vẫn giữ kích thước ổn định.
- `Posts` và `Saved` vẫn dùng canonical `PostCard` và callback hiện có.

### Cấu trúc dự kiến

```text
ProfileScreen
├── ProfileStickyTabs
└── PagerView
    ├── ProfilePostsPage
    │   └── ProfilePostsList (posts, own ref, own scrollY)
    └── ProfileSavedPage
        └── ProfilePostsList (saved, own ref, own scrollY)
```

Có thể dùng cùng component `ProfilePostsPage`, không copy business logic giữa hai tab.

### File dự kiến

Tạo hoặc sửa:

- [`src/features/profile/components/profile-pager.tsx`](../src/features/profile/components/profile-pager.tsx) — wrapper pager và page selection
- [`src/features/profile/components/profile-posts-list.tsx`](../src/features/profile/components/profile-posts-list.tsx) — hỗ trợ ref/scroll state cho từng page
- [`src/features/profile/screens/profile-screen.tsx`](../src/features/profile/screens/profile-screen.tsx) — bỏ mô hình `active` một list
- [`src/features/profile/components/profile-sticky-tabs.tsx`](../src/features/profile/components/profile-sticky-tabs.tsx) — liên kết active page
- [`src/features/profile/hooks/use-profile-title-transition.tsx`](../src/features/profile/hooks/use-profile-title-transition.tsx) — nhận scroll value của page đang active
- [`src/shared/ui/components/tabs.tsx`](../src/shared/ui/components/tabs.tsx) — chỉ sửa nếu cần expose `onPress`/selected transition; không đưa pager logic vào shared Tabs
- [`package.json`](../package.json), chỉ qua `expo install`

### Test

- Tap Posts/Saved gọi đúng `setPage`.
- `onPageSelected(1)` chọn Saved; `onPageSelected(0)` chọn Posts.
- Chuyển qua lại không reset scroll offset.
- Sticky tabs và native title dùng đúng active scroll value.
- Accessibility selected state đúng sau swipe.
- Existing profile tests không mất testID.
- Web fallback vẫn chuyển tab bằng tap.

### Device QA

- Android máy thật: swipe trái/phải nhanh, swipe chậm, swipe ngược chiều.
- iOS máy thật: interactive pager và native back không xung đột.
- Scroll dọc ở đầu và cuối list.
- PostCard media press, long press, like, save vẫn hoạt động bên trong pager.
- Dynamic type 130% và TalkBack/VoiceOver.

### Rollback

Nếu pager gây nested-scroll regression, giữ `Tabs` tap-only trên web và native tạm thời, không tự thêm custom pan vào `ProfileScreen`. Pager phải được bật qua feature flag hoặc component boundary để rollback không sửa query layer.

## 7. UX3 — Media viewer swipe-to-dismiss

### Mục tiêu

Ảnh ở scale 1 có thể kéo xuống để đóng; ảnh đang zoom vẫn pan bình thường.

### Gesture contract

#### Scale 1

- Vertical pan được phép.
- `translateY` theo ngón tay.
- Backdrop opacity giảm theo khoảng cách.
- Ảnh scale nhẹ theo khoảng cách để tạo cảm giác kéo ra khỏi viewer.
- Dismiss nếu vượt threshold hoặc velocity đủ lớn.
- Nếu chưa đủ threshold, spring về vị trí ban đầu.

#### Scale lớn hơn 1

- Pan chỉ di chuyển ảnh trong bounds.
- Không dismiss bằng pan.
- Pinch/double tap giữ behavior hiện có.

#### Reduce motion

- Không spring/scale transition phức tạp.
- Có thể snap theo ngưỡng và giữ opacity feedback tối thiểu.

### API dự kiến

`MediaViewerImage` nhận thêm:

```ts
onDismiss: () => void;
onDismissProgress?: SharedValue<number>;
```

Nếu backdrop nằm ở screen thay vì image component, dùng shared value để screen animate opacity mà không setState mỗi frame.

### File dự kiến

Sửa:

- [`src/features/post-detail/components/media-viewer-image.tsx`](../src/features/post-detail/components/media-viewer-image.tsx)
- [`src/features/post-detail/screens/media-viewer-screen.tsx`](../src/features/post-detail/screens/media-viewer-screen.tsx)
- [`src/features/post-detail/components/__tests__/media-viewer-image.test.tsx`](../src/features/post-detail/components/__tests__/media-viewer-image.test.tsx), nếu test fixture hiện có hoặc cần tạo

Giữ:

- [`src/app/(modals)/_layout.tsx`](../src/app/(modals)/_layout.tsx) với `gestureEnabled: false` cho media viewer;
- `media-viewer-close` làm fallback accessibility;
- route params `{ postId, index }`;
- canonical cache lookup và `usePost` fallback.

### Test

- Render image/video không crash.
- Close button vẫn dismiss.
- Gesture at scale 1 gọi dismiss sau threshold.
- Gesture dưới threshold reset.
- Pan ở scale > 1 không dismiss.
- Reduced motion không tạo animation không mong muốn.
- Missing post/media giữ error state hiện tại.

### Device QA

- Android: kéo xuống chậm, kéo nhanh, kéo ngang, pinch rồi pan.
- iOS: swipe down không bị native Stack dismiss gesture cạnh tranh.
- Ảnh dọc, ảnh ngang, ảnh rất lớn, dark mode.
- TalkBack/VoiceOver đọc được close button và image label.

### Phase sau, không làm trong UX3

- Swipe ngang qua nhiều ảnh trong cùng post.
- Double-tap ảnh để like.
- Video viewer gesture parity.
- Shared-element transition từ PostCard vào viewer.

## 8. UX4 — Android warning và regression sweep

### Kiểm tra cấu hình

- `rg` toàn repo các `Modal`, `presentationStyle`, `transparent`.
- Đảm bảo không còn caller dùng `presentationStyle="formSheet"` cùng `transparent`.
- `Sheet` mới không dùng `RN.Modal`.
- Route formSheet của composer/report/edit-post/edit-profile vẫn là route native, không bị thay nhầm thành action sheet.
- Rebuild dev client sau khi thêm/sửa native dependency.

### Device matrix

| Target | Bắt buộc |
|---|---|
| Android physical, gesture navigation | Sheet swipe/back, profile pager, media dismiss |
| Android physical, 3-button navigation | Sheet scrim/navigation bar, warning check |
| iOS physical | Sheet/pager/media gesture, safe area |
| Web | Tap tabs, media close/button fallback, no native import crash |

### Log acceptance

- Không có warning `formSheet` + `transparent`.
- Không có “gesture handler root missing”.
- Không có duplicate accessibility tabs.
- Không có unhandled promise từ native sheet/pager.

## 9. UX5 — Documentation và release gate

Sau khi code pass, cập nhật:

- [`docs/feel-spec.md`](../docs/feel-spec.md): thêm interaction contract cho swipe dismiss, profile pager, action sheet.
- [`docs/design-system.md`](../docs/design-system.md): cập nhật rule Sheet và platform matrix.
- [`schedule/feel-plan.md`](feel-plan.md): đánh dấu phần media viewer cũ và ghi dependency mới nếu đã chốt.
- [`schedule/device-run-checklist.md`](device-run-checklist.md): thêm checklist profile swipe, sheet drag/back, media swipe dismiss.

Không sửa spec trong cùng PR feature nếu thay đổi là quyết định UX mới. Tạo docs PR riêng hoặc ghi rõ migration decision trong PR.

## 10. Definition of Done

- [ ] Bottom sheet có swipe-to-dismiss trên Android/iOS (chờ device QA).
- [ ] Backdrop tap và Android back đóng sheet đúng một lần (chờ device QA).
- [x] Không còn warning `formSheet` + `transparent` trong `Sheet` adapter.
- [x] Profile tabs chuyển được bằng tap và native pager swipe (device QA còn chờ).
- [x] Mỗi profile tab có list/ref/scroll value riêng, không reset offset khi đổi tab.
- [x] Sticky tabs/title transition dùng active page scroll value, không setState theo frame.
- [x] Media viewer có gesture kéo xuống ở scale 1; route gesture vẫn tắt.
- [x] Media viewer zoom/pan ở scale > 1 giữ nguyên nhánh xử lý.
- [x] Close button và accessibility labels vẫn tồn tại.
- [x] Web fallback không import native pager.
- [x] Focused unit tests liên quan pass.
- [x] Typecheck, focused lint và token check pass.
- [ ] Device QA Android/iOS pass.
- [ ] Dev client được rebuild sau native dependency change.
- [ ] Không sửa `MediaPipelineModule.web.ts` ngoài phạm vi media metadata.

## 11. Lệnh verify dự kiến

Chạy từ root project:

```bash
pnpm typecheck
pnpm lint
pnpm exec eslint .
pnpm check:tokens
pnpm test -- --ci
```

Focused tests trong lúc phát triển:

```bash
pnpm test -- --runInBand \
  src/shared/ui/__tests__/sheet.test.tsx \
  src/features/profile/components/__tests__/profile-sticky-tabs.test.tsx \
  src/features/post-detail/components/__tests__/media-viewer-image.test.tsx
```

Nếu thêm native dependency:

```bash
pnpm exec expo install <package>
pnpm exec expo prebuild
pnpm exec expo run:android
pnpm exec expo run:ios
```

Hoặc tạo EAS development build theo workflow trong [`schedule/device-run-checklist.md`](device-run-checklist.md).

## 12. Rủi ro và cách xử lý

| Rủi ro | Cách giảm thiểu |
|---|---|
| `@expo/ui` community sheet chưa tương thích hoàn toàn với content hiện tại | Spike riêng; giữ adapter API; fallback có kiểm soát sang Gorhom |
| Pager và FlashList tranh gesture | Dùng native pager; mỗi page sở hữu list riêng; không custom pan |
| Mất scroll position khi chuyển tab | Ref và scroll state riêng cho từng page; không reset offset |
| Media pan xung đột với dismiss | Chỉ dismiss khi scale 1; scale > 1 ưu tiên zoom pan |
| Web import native pager | Platform fallback; không render native pager trên web |
| Native dependency làm dev client stale | Rebuild dev client ngay sau install, ghi trong PR |
| Spec cũ nói Sheet hiện tại/formSheet | Cập nhật docs sau khi implementation đã pass device QA |

