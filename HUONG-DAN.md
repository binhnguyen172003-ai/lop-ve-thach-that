# Hướng dẫn đưa web Lớp Vẽ Không Vui lên mạng

Thời gian: khoảng 30–45 phút, làm trên máy tính. Chi phí: 0 đồng (gói miễn phí Spark của Firebase, GitHub Pages miễn phí).

Web được lưu trên GitHub và hiển thị bằng GitHub Pages. Cấu trúc thư mục xem ở `README.md`.

---

## Bước 1. Tạo dự án Firebase

1. Vào **console.firebase.google.com**, đăng nhập bằng `binhnguyen172003@gmail.com`.
2. Bấm **Create a project** (Tạo dự án). Đặt tên, ví dụ `lop-ve-khong-vui`.
3. Google Analytics: chọn **tắt** cho gọn. Bấm **Create project**.

## Bước 2. Bật đăng nhập bằng Google

1. Menu trái: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → chọn **Google** → bật **Enable**.
3. Chọn email hỗ trợ là Gmail của anh → **Save**.

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

## Bước 7. Cho phép đăng nhập Google trên địa chỉ mới

1. Quay lại Firebase → **Authentication → Settings → Authorized domains**.
2. Bấm **Add domain**, nhập `<tên-github>.github.io` (không có https://, không có tên kho) → **Add**.

Bỏ qua bước này, nút "Đăng nhập bằng Google" sẽ báo lỗi.

## Bước 8. Kiểm tra và nạp giáo trình

1. Mở web, vào **Đăng nhập / Đăng ký** → **Đăng nhập bằng Google** bằng Gmail của anh.
2. Trang hiện nhãn **Giáo viên**. Kéo xuống cuối, bấm **Nạp giáo trình có sẵn** để đưa 13 bài vào.
3. Thử bằng một Gmail khác (hoặc nhờ một học viên): đăng nhập → gửi yêu cầu duyệt. Yêu cầu hiện ở bảng **Yêu cầu chờ duyệt** của anh → bấm **Duyệt**. Học viên tải lại trang là vào học được.

## Bước 9. Để Google tìm thấy web

1. Vào **search.google.com/search-console** → **Add property** → **URL prefix** → dán địa chỉ web.
2. Chọn cách xác minh **HTML tag**, gửi đoạn mã cho Claude để thêm vào `index.html`, chờ 2 phút rồi bấm **Verify**.
3. Mục **URL inspection** → dán địa chỉ → **Request indexing**.
4. Gắn địa chỉ web vào fanpage, bio Instagram, TikTok và **Google Business Profile** của 2 cơ sở để Google tin cậy web hơn.

---

## Dùng hằng ngày

| Việc | Làm ở đâu |
|---|---|
| Duyệt học viên mới | Đăng nhập / Đăng ký → Yêu cầu chờ duyệt → **Duyệt** |
| Duyệt nhanh không cần học viên gửi | Đăng nhập / Đăng ký → **Thêm học viên trực tiếp** |
| Học viên nghỉ học | Bảng Học viên đã duyệt → **Thu hồi** |
| Giao bài tập | Bài tập → khung **Giao bài tập mới** |
| Thêm bài giáo trình | Giáo trình → khung **Thêm bài vào giáo trình** |
| Xem ai đã nộp bài | Bài tập → mỗi bài hiện "x/y học viên đã nộp" |
| Xem tiến độ học | Bảng Học viên đã duyệt → cột **Đã học** |
| Thêm giáo viên quản lý | Firestore → tạo collection `admins`, document ID là Gmail giáo viên (chữ thường), thêm 1 trường bất kỳ |

## Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Trang báo "Web chưa kết nối Firebase" | Chưa làm bước 5, hoặc web chưa cập nhật (chờ 2 phút rồi tải lại trang bằng Ctrl+F5) |
| Bấm đăng nhập báo lỗi `unauthorized-domain` | Chưa làm bước 7 |
| Học viên đã duyệt vẫn bị khoá | Học viên đăng nhập sai Gmail. Gmail duyệt phải trùng Gmail đăng nhập |
| Bấm "Nạp giáo trình" báo chưa nạp được | Chưa dán luật ở bước 4, hoặc đang đăng nhập không phải Gmail giáo viên |
| Mở web trong Facebook/Zalo không đăng nhập được | Bấm "Mở bằng trình duyệt" (Chrome/Safari) rồi đăng nhập lại |
