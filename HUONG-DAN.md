# Hướng dẫn đưa web Lớp Vẽ Không Vui lên mạng

Thời gian: khoảng 30–45 phút, làm trên máy tính. Chi phí: 0 đồng (gói miễn phí Spark của Firebase, GitHub Pages miễn phí).

Web được lưu trên GitHub và hiển thị bằng GitHub Pages. Cấu trúc thư mục xem ở `README.md`.

---

## Bước 1. Tạo dự án Firebase

1. Vào **console.firebase.google.com**, đăng nhập bằng `binhnguyen172003@gmail.com`.
2. Bấm **Create a project** (Tạo dự án). Đặt tên, ví dụ `lop-ve-khong-vui`.
3. Google Analytics: chọn **tắt** cho gọn. Bấm **Create project**.

## Bước 2. Bật đăng nhập bằng Gmail + mật khẩu

1. Menu trái: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Add new provider** → chọn **Email/Password**.
3. Bật dòng đầu **Email/Password** → **Save**. (Không cần bật dòng "Email link".)

Web chỉ dùng cách này, chạy được cả khi học viên mở link trong Zalo, Facebook, Messenger.
Học viên tự tạo tài khoản, bấm link xác nhận gửi vào Gmail, rồi mới gửi yêu cầu duyệt được.

## Bước 3. Tạo cơ sở dữ liệu Firestore

1. Menu trái: **Build → Firestore Database → Create database**.
2. Location: chọn **asia-southeast1 (Singapore)** cho nhanh ở Việt Nam.
3. Chọn **Start in production mode** → **Create**.

## Bước 4. Dán luật bảo mật

1. Trong Firestore Database, mở tab **Rules**.
2. Xoá hết nội dung cũ, mở file `firestore.rules`, sao chép toàn bộ và dán vào.
3. Bấm **Publish**.

Luật này đảm bảo:
- Chỉ Gmail đã được duyệt mới đọc được giáo trình và bài tập.
- Chỉ Gmail của anh mới sửa được giáo trình, giao bài, duyệt học viên.
- Học viên chỉ gửi được yêu cầu duyệt cho chính Gmail của mình.

## Bước 5. Lấy mã kết nối và dán vào web

1. Bấm bánh răng cạnh **Project Overview** → **Project settings**.
2. Kéo xuống **Your apps** → bấm biểu tượng **`</>`** (Web).
3. Đặt tên app, ví dụ `web`. **Không** tick Firebase Hosting. Bấm **Register app**.
4. Firebase hiện đoạn `const firebaseConfig = { ... }`. Sao chép 6 dòng bên trong dấu `{ }`.
5. Trên GitHub, mở file `config/firebase-config.js` → bấm biểu tượng bút chì (Edit) → thay 6 dòng mẫu bằng 6 dòng vừa chép → **Commit changes**. Hoặc gửi 6 dòng đó cho Claude để Claude sửa giúp.

Mã này không phải mật khẩu, để công khai trên web là bình thường. Bảo mật nằm ở luật bước 4.

## Bước 6. Bật GitHub Pages

1. Mở kho trên GitHub → **Settings → Pages**.
2. Mục **Build and deployment**: Source chọn **Deploy from a branch**, Branch chọn **main** và **/(root)** → **Save**.
3. Chờ 1–2 phút, trang hiện địa chỉ dạng `https://<tên-github>.github.io/<tên-kho>/`.

Từ đó, mỗi lần có thay đổi trên nhánh main, web tự cập nhật sau 1–2 phút.

## Bước 7. Cho phép web dùng địa chỉ mới

1. Quay lại Firebase → **Authentication → Settings → Authorized domains**.
2. Bấm **Add domain**, nhập `<tên-github>.github.io` (không có https://, không có tên kho) → **Add**.

Bỏ qua bước này, link xác nhận Gmail sẽ không quay về đúng web.

## Bước 8. Kiểm tra và nạp giáo trình

1. Mở web, vào **Đăng nhập** → mục **Lần đầu: Tạo tài khoản** → điền họ tên, Gmail của anh, mật khẩu → **Tạo tài khoản** → bấm link xác nhận trong Gmail.
   (Nếu báo "Gmail này đã có tài khoản" vì trước đây anh vào bằng nút Google: bấm nút **Gửi thư đặt mật khẩu cho Gmail này** ngay bên dưới, đặt mật khẩu trong thư, rồi vào mục **Đăng nhập**.)
2. Vào trang **Duyệt học viên**: dòng trên cùng phải báo **✓ Máy chủ hoạt động tốt**. Nếu hiện khung cam "luật bảo mật bản CŨ", bấm theo 3 bước trong khung.
2. Trang hiện nhãn **Giáo viên**. Kéo xuống cuối, bấm **Nạp giáo trình có sẵn** để đưa 13 bài vào.
3. Thử bằng một Gmail khác (hoặc nhờ một học viên): đăng nhập → gửi yêu cầu duyệt. Yêu cầu hiện ở bảng **Yêu cầu chờ duyệt** của anh → bấm **Duyệt**. Màn hình học viên tự mở khoá, không cần tải lại.

## Bước 9. Để Google tìm thấy web

1. Vào **search.google.com/search-console** → **Add property** → **URL prefix** → dán địa chỉ web.
2. Chọn cách xác minh **HTML tag**, gửi đoạn mã cho Claude để thêm vào `index.html`, chờ 2 phút rồi bấm **Verify**.
3. Mục **URL inspection** → dán địa chỉ → **Request indexing**.
4. Gắn địa chỉ web vào fanpage, bio Instagram, TikTok và **Google Business Profile** của 2 cơ sở để Google tin cậy web hơn.

---

## Dùng hằng ngày

Mọi việc quản lý nằm trong nút **Tài khoản** (góc trên bên phải). Vào đó sẽ thấy thanh công cụ: Tổng quan · Làm việc · Giáo trình · Bài tập · Điểm danh · Duyệt. Số đỏ trên nút Tài khoản = tin nhắn / thông báo / yêu cầu mới.

| Việc | Làm ở đâu |
|---|---|
| Duyệt học viên mới | Tài khoản → **Duyệt** → Yêu cầu chờ duyệt |
| Duyệt nhanh không cần học viên gửi | Tài khoản → Duyệt → **Duyệt trực tiếp một Gmail** |
| Học viên nghỉ học | Duyệt → bảng Học viên đã duyệt → **Thu hồi** |
| Nhắn tin riêng với học viên / giáo viên | Tài khoản → **Làm việc** → Tin nhắn (ô "Nhắn tin mới cho…" để bắt đầu) |
| Đăng thông báo (nghỉ học, đổi lịch…) | Làm việc → **Thông báo** → chọn gửi tới Tất cả hoặc Chỉ giáo viên |
| Giao việc cho giáo viên | Làm việc → **Việc cần làm** → giao cho một người hoặc tất cả, có hạn |
| Điểm danh | Tài khoản → **Điểm danh** |
| Giao bài tập | Tài khoản → Bài tập → khung **Giao bài tập mới** |
| Thêm bài giáo trình | Tài khoản → Giáo trình → khung **Thêm bài vào giáo trình** |
| Thêm / sửa giáo viên trên trang chủ | File `data/noi-dung.js` → danh sách `GIAO_VIEN`, ảnh đặt trong `assets/img/giao-vien/` |
| Thêm video nền trang chủ | Đặt video (10–20 giây, dưới 6 MB) vào `assets/video/`, điền tên file vào `VIDEO_BIA` trong `data/noi-dung.js` |
| Thêm giáo viên quản lý | Firestore → tạo collection `admins`, document ID là Gmail giáo viên (chữ thường), thêm 1 trường bất kỳ |

Ai thấy gì trong khu Làm việc:
- **Học viên:** nhắn riêng với thầy cô (chỉ thầy cô đọc), xem thông báo chung.
- **Giáo viên:** nhắn với mọi học viên, nhắn riêng quản lý, đăng thông báo chung, tick xong việc được giao.
- **Quản lý:** thấy tất cả, đăng thông báo nội bộ chỉ giáo viên đọc, giao và xoá việc.

## Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Trang báo "Web chưa kết nối Firebase" | Chưa làm bước 5, hoặc web chưa cập nhật (chờ 2 phút rồi tải lại trang bằng Ctrl+F5) |
| Bấm đăng nhập báo lỗi `unauthorized-domain` | Chưa làm bước 7 |
| Học viên đã duyệt vẫn bị khoá | Học viên đăng nhập sai Gmail. Gmail duyệt phải trùng Gmail đăng nhập |
| Bấm "Nạp giáo trình" báo chưa nạp được | Chưa dán luật ở bước 4, hoặc đang đăng nhập không phải Gmail giáo viên |
| Mở web trong Facebook/Zalo không đăng nhập được | Bấm "Mở bằng trình duyệt" (Chrome/Safari) rồi đăng nhập lại |
