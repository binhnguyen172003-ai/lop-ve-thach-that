# Học Vẽ Không Vui — quy chuẩn giao diện

## Nguồn và phạm vi

Áp dụng cho HTML/CSS/JavaScript hiện có. Dùng Awesome DESIGN.md (VoltAgent) để tham khảo phân nhóm và bề mặt; UI UX Pro Max để rà điều hướng, accessibility và responsive. Giữ nhận diện B1 và hệ màu/font hiện có; các nguồn tham khảo không thay thế quy tắc dự án.

## Token và thành phần dùng chung

- Nguồn màu nằm trong `assets/css/style.css`: nền `--paper`, mặt thẻ `--sheet`, chữ `--ink`, chữ phụ `--graphite`, đường phân cách `--rule`, điểm nhấn `--accent`. Mỗi token có biến thể sáng/tối; thành phần mới không tự tạo bảng màu khác.
- Chữ hiển thị dùng `--f-display`; chữ nội dung và biểu mẫu dùng `--f-body`. Chữ tiếng Việt cần dòng đủ cao để dấu không bị cắt, tiêu đề dài được xuống dòng tự nhiên.
- Nút và ô tương tác chính cao ít nhất 44px; trạng thái focus luôn nhìn thấy. Giữ nhãn rõ nghĩa bên cạnh icon.
- Ảnh bài vẽ dùng `object-fit: contain` khi cần thấy trọn bài; luôn khai báo kích thước hoặc khung có tỷ lệ để tránh bố cục nhảy lúc tải.

## Chuyển động và tải trang

- Nội dung đầu màn hình phải hiện ngay; ảnh bìa được ưu tiên tải. Ảnh ở xa màn hình không tranh băng thông với ảnh bìa.
- Chuyển động chỉ hỗ trợ nhận biết trạng thái; không dùng blur hoặc hiệu ứng lặp trên nhiều ảnh lớn. Khi thiết bị chọn giảm chuyển động, vòng xoay không tự chạy.
- Lưu biểu mẫu báo kết quả ngay tại nơi bấm và giữ vị trí đọc. Điều hướng tới mục cần chừa khoảng cho menu cố định.
- Chỉ thêm GSAP nếu một tương tác có nhu cầu cụ thể mà CSS/JavaScript sẵn có không đáp ứng; đo lại trước và sau khi thêm thư viện.

## Các trang độc lập

| URL | Nội dung |
| --- | --- |
| #tong-quan | Việc hôm nay, tiến độ, ô đi nhanh, hạng/thành tựu |
| #tai-khoan | Đăng nhập/đăng ký, thông tin cá nhân, đổi ảnh và đăng xuất |
| #khoa-hoc | Lộ trình các khóa; video tham khảo dành cho tài khoản đã được duyệt |
| #giao-trinh | Môn học, danh sách bài, nội dung bài và tiến độ học |
| #ebook | Sách/tài liệu đã đăng; thiếu đường dẫn thì báo đang cập nhật |

Chỉ hiển thị một main mỗi lần. Mọi trang có URL mở trực tiếp. Liên kết #nang-cao cũ vẫn mở mục video trong Khóa học. Tài khoản không chứa dashboard; Giáo trình không chứa danh sách khóa hay video. Không tạo link tài liệu giả.

## Nhất quán bố cục

- Dùng .wrap, .page-head và các token spacing/color hiện có.
- Phân biệt tiêu đề trang và tiêu đề khối; giữ tiếng Việt đọc tự nhiên, khoảng cách đủ cho dấu.
- Dùng màu theo theme, tránh cố định màu chữ/nền làm mất chữ khi đổi sáng/tối.
- Nhóm nội dung cùng chức năng vào một card; không trộn hồ sơ, học tập và quản lý trong một khối dài.
- Giữ ảnh bài vẽ và logo đúng tỷ lệ, không vẽ lại hay kéo méo.

## Điều hướng và tương tác

- Hiển thị nhãn đầy đủ và aria-current cho mục đang mở.
- Menu trên cùng, thanh khu học tập và menu điện thoại phải dẫn tới cùng URL.
- Trang mới mở từ đầu nội dung; Back/Forward giữ lịch sử và vị trí đọc.
- Chừa khoảng trống cho header, thanh học tập và dock cố định; không che tiêu đề hoặc nút đang focus.
- Dùng focus ring, nhãn form và trạng thái loading/error rõ ràng; giữ nội dung người dùng đã nhập khi có lỗi.
- Giữ quyền hiện có khi di chuyển nội dung giữa trang; không coi ẩn UI là kiểm soát quyền phía máy chủ.

## Rà trước khi phát hành

Kiểm tra từng URL, liên kết menu, Back/Forward, khóa nội dung khi chưa duyệt, dấu tiếng Việt và giao diện sáng/tối. Kiểm tra mobile/desktop theo khả năng trình duyệt có sẵn; ghi rõ phần chưa kiểm tra thay vì khẳng định đã đạt. Không dùng dữ liệu thật để thử thao tác ghi, duyệt, xóa hoặc gửi thông báo.
