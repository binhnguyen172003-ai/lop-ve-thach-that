# Đóng gói web thành app Android / iPhone

Web đã cài được như app ngay (PWA): Android bấm **Cài ứng dụng lên điện thoại** trong menu ☰; iPhone mở bằng Safari → Chia sẻ → **Thêm vào MH chính**. Cách này miễn phí, không cần cửa hàng.
Muốn có mặt trên **Google Play / App Store** thì đóng gói bằng Capacitor theo các bước dưới (làm trên máy tính).

## Chuẩn bị một lần
- Cài **Node.js 20+**.
- Android: cài **Android Studio** (có sẵn SDK). Phí đăng ký Google Play: 25 USD, trả một lần.
- iPhone: cần **máy Mac** có **Xcode** và tài khoản **Apple Developer** (99 USD/năm). Không có Mac thì chỉ làm Android, iPhone dùng PWA.

## Làm bản Android
```sh
cd app
npm install
npm run them:android      # tạo thư mục android/ (chỉ lần đầu)
npm run mo:android        # mở Android Studio → Build → Generate Signed Bundle (.aab)
```
Mỗi lần web đổi: `npm run dong-bo` rồi build lại.

## Làm bản iPhone
```sh
cd app
npm install
npm run them:ios
npm run mo:ios            # mở Xcode → Product → Archive → Distribute App
```

## Trước khi nộp lên cửa hàng
1. Thay biểu tượng và màn hình khởi động bằng bản đủ kích thước (`assets/img/icon-512.png` là nguồn).
2. Chuẩn bị: chính sách quyền riêng tư (web thu họ tên, Gmail, ảnh bài vẽ), ảnh chụp màn hình, mô tả.
3. Đăng nhập Google trong app: thêm tên miền `localhost` và địa chỉ app vào Firebase → Authentication → Authorized domains. Đăng nhập Gmail + mật khẩu chạy bình thường.
4. Thử trên máy thật theo bảng kiểm thử trong lộ trình (đăng nhập, nộp bài, mất mạng, cập nhật).

> Apple có thể từ chối app chỉ là "bọc web". Giữ các tính năng thật của app (đăng nhập, nộp ảnh, lịch học, thông báo) và ghi rõ trong mô tả.
