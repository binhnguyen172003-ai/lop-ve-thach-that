# Kiểm thử Dreamers

```bash
npm install
npm run test:unit                 # kiểm thử đơn vị (Node)
npx playwright test               # kiểm thử giao diện: máy tính + điện thoại
```

Máy đã có sẵn Chromium (môi trường cloud): `PW_CHROMIUM_PATH=/đường/dẫn/chrome PW_SKIP_WEBKIT=1 npx playwright test`.
Máy thường: `npx playwright install chromium webkit` một lần.

## Không đụng dữ liệu thật

Mọi trang mở qua `tests/support/fixtures.mjs`:

- `www.gstatic.com/firebasejs/*` được thay bằng **Firebase giả lập** (`tests/support/fake-firebase.js`), dữ liệu nằm trong bộ nhớ trình duyệt kiểm thử.
- Mọi kết nối khác ra ngoài máy kiểm thử bị chặn và ghi lại (kiểm thử "không gửi dữ liệu ra ngoài").
- Tài khoản và dữ liệu thử ở `tests/support/du-lieu-mau.mjs` (Gmail `@dreamers.test`, tên giả). Giờ cố định 19:30 ngày 12/10/2026, giờ Việt Nam.

Tài khoản thử: quản lý, giáo viên, trợ giảng, học viên, người chờ duyệt, người chưa xác nhận Gmail (mật khẩu `matkhau-thu`).

## Các bộ kiểm thử

| File | Kiểm tra |
|---|---|
| `bo-cuc.spec.mjs` | Chữ chạm khung, tràn ngang, nút nổi che nút, bảng công/lương, lịch phân công trên điện thoại |
| `thong-bao.spec.mjs` | Bấm thông báo → Duyệt tài khoản: đúng chỗ, không bị menu che, không tụt khi dữ liệu tải thêm |
| `diem-danh.spec.mjs` | Sắp xếp A–Z tiếng Việt, điểm danh không mất dữ liệu cũ, đồng bộ sang trang học viên |
| `luong.spec.mjs` | Số tiền lương đúng, ca trùng không tính hai lần, giáo viên chỉ thấy lương mình |
| `dieu-huong.spec.mjs` | Tab giáo trình/khoá học/Ebook, đăng nhập, phân quyền theo vai trò |
| `public.spec.mjs` | Trang công khai không tràn ngang ở 320–1366px |

Khi lỗi: ảnh chụp, trace ở `test-results/`, báo cáo HTML ở `playwright-report/` (`npx playwright show-report`).

Giới hạn: Firebase giả lập **không** chạy luật `firestore.rules`; phân quyền phía máy chủ phải kiểm bằng Firebase Emulator.
