# Học Vẽ Không Vui — quy chuẩn giao diện

## Nguồn và phạm vi

Áp dụng cho HTML/CSS/JavaScript hiện có. Cấu trúc tài liệu theo [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md); tham khảo [mẫu Pinterest](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/pinterest/DESIGN.md) về cách để hình ảnh dẫn dắt, bề mặt trung tính, nhịp khoảng cách và phân cấp thành phần. UI UX Pro Max hỗ trợ rà điều hướng, accessibility và responsive. Giữ nhận diện B1, màu xanh ultramarine, nền giấy và font tiếng Việt của lớp.

## Chủ đề và cảm giác

Trang giới thiệu như một cuốn sổ phác thảo sáng, tập trung vào bài vẽ thật và kết quả học tập. Khu học tập giữ mật độ thông tin đủ để thao tác nhanh. Ảnh bài vẽ là nội dung chính; khung, bóng và hiệu ứng chỉ giúp đọc hoặc phân biệt trạng thái.

## Bảng màu và vai trò

| Vai trò | Sáng | Tối | Cách dùng |
| --- | --- | --- | --- |
| Nền giấy `--paper` | `#f4f5f2` | `#15171b` | Nền trang |
| Mặt thẻ `--sheet` | `#ffffff` | `#1d2025` | Thẻ, biểu mẫu, bảng |
| Chữ chính `--ink` | `#1f2226` | `#eceef1` | Tiêu đề và nội dung |
| Chữ phụ `--graphite` | `#5b6068` | `#a3a8b1` | Chú giải, mô tả |
| Đường viền `--rule` | `#d9dcd6` | `#30343b` | Phân cách, viền thẻ |
| Điểm nhấn `--accent` | `#2c43b0` | `#93a5ff` | Link, trạng thái chọn, focus |
| Nền trưng bày `--art-stage` | `#101319` | Như sáng | Đặt bài vẽ trên nền ổn định |
| Chú thích ảnh `--art-caption` | `#1b2028` | Như sáng | Tên tác giả và thông tin bài |

Màu trạng thái `--ok` và `--warn` chỉ dùng cho thông báo kết quả tương ứng. Ảnh và nhãn hạng có màu riêng vì đó là nội dung, không phải màu nền chung.

## Chữ và nhịp bố cục

- `--f-display` dùng cho tiêu đề; `--f-body` dùng cho nội dung, biểu mẫu và điều khiển. Tiêu đề lớn dùng `clamp()` để xuống dòng tự nhiên; tránh `line-height` quá chặt làm chạm dấu tiếng Việt.
- Chữ nội dung mặc định 16px với `line-height: 1.6`. Chú giải nhỏ vẫn cần đọc được; không dùng chữ hoa dày đặc trong đoạn dài.
- Khoảng cách cơ sở là 8px; ưu tiên các bước 8, 16, 24, 32 và 56px. Khu trưng bày ảnh có khoảng cách gọn hơn đoạn giới thiệu để người xem tập trung vào bài vẽ.
- Bề rộng nội dung chuẩn là 1080px qua `.wrap`. Trên màn hình nhỏ, giảm số cột trước khi giảm kích thước chữ.

## Thành phần, chiều sâu và ảnh

- Nút chính nổi bật bằng tương phản chữ/nền; nút phụ có viền. Trạng thái hover, focus và disabled cần phân biệt được; vùng bấm chính ít nhất 44px.
- Thẻ thông tin dùng `--sheet` và viền `--rule`. Bóng mạnh chỉ dành cho lớp phủ hoặc thành phần đang nổi; thẻ nội dung mặc định dựa vào viền và khoảng trắng.
- Ảnh bài vẽ nổi bật dùng `object-fit: contain` trên nền `--art-stage`, giữ nguyên tỷ lệ. Chú thích dùng mặt đặc `--art-caption` để đọc rõ mà không làm mờ hay phủ lớp kính lên tác phẩm.
- Ảnh trong lưới dùng khung tỷ lệ ổn định để tránh nhảy bố cục lúc tải. Nút quản lý và nhãn xếp hạng không che phần quan trọng của ảnh.
- Bán kính tiêu chuẩn: 10–12px cho điều khiển nhỏ, 18px cho thẻ ảnh, hình viên thuốc cho nút hoặc chip cần phân biệt. Không tăng bán kính chỉ để trang trông trang trí hơn.

## Responsive và giới hạn thiết kế

- Desktop giữ thanh điều hướng đầy đủ. Tablet thu gọn nhóm phụ. Mobile dùng menu và các khu nội dung một hoặc hai cột theo độ rộng thật của nội dung.
- Kiểm tra tối thiểu ở 320px, 390px, 768px và 1280px; không để tràn ngang, che nút hoặc cắt dấu tiếng Việt.
- Ưu tiên nội dung thật, tương phản đọc được và ảnh nguyên tỷ lệ. Không thêm gradient, bóng sáng, blur hoặc chuyển động lặp để lấp khoảng trống.
- Giữ tiêu đề, nhãn và thông báo bằng tiếng Việt rõ nghĩa ở mọi vai trò học viên, giáo viên và quản trị viên.

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
