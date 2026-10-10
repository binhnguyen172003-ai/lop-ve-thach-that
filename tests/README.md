# Kiểm thử Dreamers

Chạy `pnpm install`, `pnpm exec playwright install chromium webkit`, rồi `pnpm test:unit` và `pnpm test:e2e`. Bộ E2E khởi động web tĩnh trên `127.0.0.1:4173`; không đăng nhập và không ghi Firebase. Khi lỗi, xem `test-results/` (ảnh và trace) cùng `playwright-report/`.

Các luồng điểm danh, phê duyệt, lịch giáo viên, lương và phân quyền cần Firebase Emulator hoặc môi trường thử nghiệm cùng tài khoản thử được phân quyền. Chưa chạy các thao tác ghi trên dữ liệu thật.
