# Lớp Vẽ Không Vui — website

Web tuyển sinh và khu học viên của lớp luyện thi vẽ Khối H, V tại Thạch Thất, Hà Nội.
Chạy trên **GitHub Pages** (giao diện) và **Firebase** (đăng nhập Gmail + mật khẩu, giáo trình, bài tập).
Cài đặt lần đầu: xem [`HUONG-DAN.md`](HUONG-DAN.md).

---

## Muốn sửa gì → mở file nào

| Muốn sửa | File cần mở | Ghi chú |
|---|---|---|
| Số điện thoại, email, địa chỉ cơ sở, link Instagram/Pinterest | `data/noi-dung.js` → mục 1 | Tự cập nhật mọi chỗ trên web |
| Lịch thi năng khiếu, thêm/bớt trường, đổi năm thi | `data/noi-dung.js` → mục 2 | Đếm ngày tự tính |
| Thời gian biểu, ca học, thêm cơ sở mới | `data/noi-dung.js` → mục 3 | |
| Ảnh bài vẽ trên trang chủ | ảnh vào `assets/img/bai-ve/`, khai báo ở `data/noi-dung.js` → mục 4 | Để trống thì mục ảnh tự ẩn |
| Chữ giới thiệu, khoá học, quyền lợi, câu hỏi phụ huynh | `index.html` | Tìm đúng câu chữ cũ rồi thay |
| Màu sắc, cỡ chữ, khoảng cách | `assets/css/style.css` | Màu ở đầu file (`:root`) |
| Giáo trình, bài tập, duyệt học viên | **Làm ngay trên web** khi đăng nhập Gmail giáo viên | Không sửa file |
| Kết nối Firebase | `config/firebase-config.js` | Chỉ một lần khi cài đặt |
| Ai được xem/sửa dữ liệu | `firestore.rules` | Sửa xong phải dán lại vào Firebase Console |
| Cách web hoạt động (đăng nhập, đếm ngày…) | `assets/js/app.js` | Thường không cần đụng |

Nguyên tắc: **mỗi việc chỉ sửa đúng một file**. Nội dung hay đổi đã gom hết vào `data/noi-dung.js`, nên đổi số điện thoại hay lịch thi không phải chạm vào giao diện hay logic.

---

## Cấu trúc thư mục

```
├── index.html              Khung trang: chữ, các mục, menu
├── assets/
│   ├── css/style.css       Giao diện (màu, chữ, bố cục)
│   ├── js/app.js           Logic: đếm ngày, đăng nhập, giáo trình, bài tập
│   └── img/                Biểu tượng ứng dụng + bai-ve/ (ảnh bài vẽ học viên)
├── data/
│   ├── noi-dung.js         ★ NỘI DUNG HAY ĐỔI: liên hệ, lịch thi, thời gian biểu, bài vẽ, bảng vàng, mục tiêu giờ học
│   └── giao-trinh-mau.js   Giáo trình có sẵn, dùng một lần khi nạp
├── config/
│   └── firebase-config.js  Mã kết nối Firebase
├── firestore.rules         Luật bảo mật dữ liệu (dán vào Firebase Console)
├── HUONG-DAN.md            Hướng dẫn cài đặt và dùng hằng ngày
├── sw.js                   Bộ nhớ đệm: mở tức thì lần sau, xem được khi mất mạng
├── manifest.webmanifest    Cho phép "Thêm vào màn hình chính" như một ứng dụng
├── app/                    Đóng gói thành app Android/iPhone (xem app/HUONG-DAN-APP.md)
├── robots.txt              Cho phép Google đọc web
├── sitemap.xml             Danh sách trang gửi Google Search Console
├── 404.html                Gõ sai địa chỉ → tự đưa về trang chủ
└── .nojekyll               Giữ GitHub Pages phục vụ file nguyên trạng
```

---

## Sửa nhanh trên GitHub (không cần cài gì)

1. Mở file cần sửa trên GitHub → bấm biểu tượng **bút chì** (Edit this file).
2. Sửa chữ. Với `data/noi-dung.js`: chỉ sửa chữ giữa hai dấu ngoặc kép, giữ nguyên dấu phẩy.
3. Bấm **Commit changes**, ghi ngắn gọn đã sửa gì, ví dụ "Đổi lịch thi HAU 2027".
4. Chờ 1–2 phút, tải lại web bằng **Ctrl + F5** (máy tính) hoặc kéo xuống làm mới (điện thoại).

Sửa sai? Vào tab **Commits**, mở lần sửa trước đó để xem lại nội dung cũ, hoặc nhờ Claude khôi phục.

## Thêm ảnh bài vẽ

1. Nén ảnh dưới 300KB (dùng squoosh.app hoặc gửi Claude nén giúp). Đặt tên không dấu, không cách: `hinh-hoa-01.jpg`.
2. Vào thư mục `assets/img/bai-ve/` → **Add file → Upload files**.
3. Mở `data/noi-dung.js`, mục 4, thêm một dòng:
   ```js
   { anh: "assets/img/bai-ve/hinh-hoa-01.jpg", moTa: "Hình hoạ người toàn thân · Khối H" },
   ```

## Lưu ý

- Kho để chế độ **Public** thì GitHub Pages mới miễn phí. Không đưa danh sách học viên, học phí cá nhân hay file nội bộ vào kho này: những dữ liệu đó nằm trong Firebase, chỉ giáo viên đọc được.
- `firestore.rules` trên GitHub chỉ là bản lưu. Luật có hiệu lực là bản đã dán trong Firebase Console.
