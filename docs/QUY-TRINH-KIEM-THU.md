# Quy trình sửa Dreamers

Áp dụng cho kho mã hiện tại: GitHub Pages phục vụ HTML/CSS/JS; Firebase lưu tài khoản và dữ liệu vận hành. Dùng quy trình **yêu cầu → luồng dữ liệu → nguyên nhân → thay đổi nhỏ nhất → kiểm thử → rà soát → triển khai thử → quay lại nếu lỗi**.

## Trước khi sửa

1. Ghi lại đường dẫn, vai trò tài khoản, kích thước màn hình, dữ liệu thử, bước tái hiện và ảnh lỗi.
2. Xác định chức năng liên quan qua `index.html`, `assets/js/app.js`, `assets/js/van-hanh.js`, `assets/css/style.css`, `firestore.rules` và `storage.rules`. Đọc cả luồng đọc/ghi Firebase trước khi sửa một màn hình.
3. Chỉ dùng Firebase Emulator hoặc bản thử nghiệm cho thao tác thêm, sửa, duyệt, chấm công, điểm danh, lương. Sao lưu dữ liệu thử và ghi mã commit để có thể quay lại.
4. Viết tiêu chí nghiệm thu cụ thể: hành vi đúng, quyền đúng, không ghi trùng, không tràn ở 320–430 px, và chức năng liên quan vẫn chạy.

## Khi sửa

- Tận dụng cấu trúc và API sẵn có. Không thêm thư viện cho việc trình duyệt hoặc mã hiện tại đã giải quyết được.
- Giữ kiểm tra quyền phía Firestore/Storage; giao diện ẩn nút không thay thế luật máy chủ.
- Với lịch, điểm danh và lương, kiểm tra khóa định danh, múi giờ, trùng thao tác và tính nhất quán trước khi đổi giao diện.
- Mọi thay đổi logic có nhánh, tính tiền, quyền hoặc dữ liệu học viên cần kiểm thử tình huống đúng, thiếu dữ liệu và thao tác lặp.
- Ghi rõ nguồn cho từng nguyên tắc tham khảo; chỉ áp dụng nếu có cơ chế cụ thể và kiểm chứng được trên Dreamers. Đây là cách dùng bước xác minh nguồn, khả năng thực thi và lợi ích của `cangjie-skill` để lọc ý tưởng từ tài liệu các repo.

## Kiểm thử và nghiệm thu

1. Chạy `pnpm test:unit` và `pnpm test:e2e` trên bản thử nghiệm. Playwright lưu ảnh và trace khi lỗi.
2. Kiểm tra thủ công trên Chrome Android và Safari iPhone thật cho bàn phím, menu, cuộn, tải PDF và xoay màn hình.
3. Dùng ba tài khoản thử: quản lý, giáo viên, học viên. Kiểm tra cả truy cập bị từ chối ở Firestore/Storage, không chỉ trạng thái giao diện.
4. Chụp ảnh trước/sau cùng kích thước; ghi kết quả từng bước, commit, dữ liệu thử, và rủi ro còn lại.
5. Chỉ chuyển bản thử sang chính thức sau khi đối chiếu dữ liệu và có điểm quay lại (commit trước triển khai, bản sao lưu Firebase phù hợp).

## Phạm vi tự động hóa hiện tại

`tests/public.spec.mjs` kiểm tra phần công khai không cần đăng nhập và không ghi dữ liệu. `tests/ten-hoc-vien.unit.test.mjs` kiểm tra tên gọi tiếng Việt. Các luồng quản lý chưa được đánh dấu đạt cho đến khi có môi trường thử và tài khoản thử. Không tự động chạy kiểm thử ghi trên trang GitHub Pages chính thức.
