# Thư viện và trợ lý Dreamers

Video và Ebook dùng cùng bộ xét quyền với Phân quyền hệ thống. Quyền cũ `quyenTV` tiếp tục hoạt động cho giáo viên chưa có hồ sơ `phanquyen`; khi cấp hồ sơ mới, hồ sơ đó quyết định quyền nội dung. Cơ sở của tài liệu giữ nguyên sau khi tạo. Quyền duyệt, xuất bản, thay nguồn và quản lý người xem được cấp riêng.

Người soạn không tự duyệt, kể cả quản lý. Bản sửa được duyệt chưa thay thế bản đang công bố; cần thao tác Xuất bản. Học viên chỉ đọc `tv_video_public` / `tv_ebook_public`, không đọc document nội bộ chứa bản nháp. Ẩn, lưu trữ và thu hồi xoá bản công bố trong cùng giao dịch.

Xuất bản theo lịch được máy chủ giới hạn bằng thời gian; trang đang mở cần tải lại khi tới giờ. Thời hạn quyền được kiểm tra tại thời điểm thao tác xuất bản/lên lịch. Việc thu hồi quyền người lên lịch không tự huỷ một lịch đã tạo; quản lý dùng Ẩn hoặc Thu hồi để huỷ.

Trợ lý Bé Chì giữ Firebase AI hiện có. Giao diện hội thoại được triển khai riêng, tham khảo tính năng của Niek/chatgpt-web, không chép mã GPL. Lịch sử tối đa 20 hội thoại, 80 tin mỗi hội thoại được lưu trên trình duyệt theo từng tài khoản; có Trò chuyện mới, Hội thoại và tải Markdown. Đổi tài khoản xoá hội thoại khỏi giao diện và ngăn phản hồi cũ ghi sang tài khoản mới.

Impeccable được cài tại `.agents/skills/impeccable`. Phần mới dùng màu và kiểu chữ hiện có của Dreamers, hỗ trợ chế độ tối, nút chạm và bảng cuộn trên điện thoại. Đây là công cụ hướng dẫn thiết kế cho tác nhân, không phải thư viện JavaScript chạy trên web.

## Triển khai

Workflow Firebase triển khai cả `firestore.rules` và `firestore.indexes.json`; cần secret `FIREBASE_SERVICE_ACCOUNT` đã cấu hình. Chỉ mục có thể cần thời gian xây dựng trước khi truy vấn thư viện hoạt động. Workflow Pages triển khai giao diện sau khi hợp nhất vào main.

Nếu đã có document `tv_video` / `tv_ebook` từ bản thử nghiệm trước, quản lý cần duyệt và xuất bản chúng qua giao diện để tạo bản công bố. 17 video tham khảo gốc vẫn hiện trước khi quản lý chọn Nạp dữ liệu mẫu; thao tác đó tạo cả document nội bộ và bản công bố, giữ mã tiến độ cũ.

## Kiểm tra

`npm run test:unit`, `npm run test:rules`, `npx firebase emulators:exec --only firestore --project demo-pq "node tests/emulator/phan-quyen.rules.test.mjs"`, `npx playwright test --project=desktop-chromium --project=mobile-chromium`.

Kiểm thử dùng tài khoản giả và Firebase giả lập; không gửi biểu mẫu hoặc thao tác dữ liệu thật.
