// =====================================================================
//  NỘI DUNG HAY THAY ĐỔI CỦA WEB  —  sửa file này là đủ cho đa số việc
// ---------------------------------------------------------------------
//  Quy tắc an toàn khi sửa:
//   • Chỉ sửa chữ nằm GIỮA hai dấu ngoặc kép "…".
//   • Giữ nguyên dấu phẩy , ở cuối mỗi dòng và các dấu { } [ ].
//   • Ngày viết theo dạng "năm-tháng-ngày", ví dụ "2027-05-23".
//   • Muốn ẩn một dòng: thêm // ở đầu dòng đó.
// =====================================================================


// ---------- 1. LIÊN HỆ (hiện ở mục Đăng ký và trang Tài khoản) ----------
export const LIEN_HE = {
  sdt: "0328 193 134",                      // số hiện trên web
  zalo: "0328193134",                       // số Zalo, viết liền
  email: "lopvedreamerstt@gmail.com",
  coSo: [
    { ten: "Cơ sở 1 · Bình Phú", diaChi: "Nủa, Bình Phú, Thạch Thất, Hà Nội" },
    { ten: "Cơ sở 2 · Kim Quan", diaChi: "162 Kim Quan, Thạch Thất, Hà Nội" },
  ],
  instagram: { ten: "@lop_ve_thach_that", link: "https://www.instagram.com/lop_ve_thach_that/" },
  pinterest: { link: "https://pin.it/YkmIUW1tr" },
};


// ---------- 2. LỊCH THI NĂNG KHIẾU ----------
// truong: mã trường để lọc (phải có trong BO_LOC_TRUONG bên dưới), hoặc "THPT".
// ngay:   ngày bắt đầu thi, dùng để đếm ngược.
// hienThi: chữ hiện trên web.
export const NAM_THI = 2027;

export const LICH_THI = [
  { truong: "XD",   ten: "ĐH Xây dựng Hà Nội",                          dot: "Đợt 1 · thủ tục 28/3", ngay: "2027-03-29", hienThi: "29/3" },
  { truong: "QG",   ten: "ĐHQG Hà Nội · Trường KH Liên ngành & Nghệ thuật", dot: "Đợt 1",            ngay: "2027-04-04", hienThi: "4–5/4" },
  { truong: "QG",   ten: "ĐHQG Hà Nội · Trường KH Liên ngành & Nghệ thuật", dot: "Đợt 2",            ngay: "2027-05-09", hienThi: "9–10/5" },
  { truong: "XD",   ten: "ĐH Xây dựng Hà Nội",                          dot: "Đợt 2",                ngay: "2027-05-09", hienThi: "9–10/5" },
  { truong: "SP",   ten: "ĐH Sư phạm Nghệ thuật TW",                    dot: "Đợt 1",                ngay: "2027-05-16", hienThi: "16–17/5" },
  { truong: "MTCN", ten: "ĐH Mỹ thuật Công nghiệp",                     dot: "Hình hoạ, bố cục màu", ngay: "2027-05-23", hienThi: "23–24/5" },
  { truong: "HAU",  ten: "ĐH Kiến trúc Hà Nội",                         dot: "Khối V",               ngay: "2027-05-23", hienThi: "23–24/5" },
  { truong: "QG",   ten: "ĐHQG Hà Nội · Trường KH Liên ngành & Nghệ thuật", dot: "Đợt 3",            ngay: "2027-05-23", hienThi: "23–24/5" },
  { truong: "HAU",  ten: "ĐH Kiến trúc Hà Nội",                         dot: "Khối H",               ngay: "2027-05-30", hienThi: "30–31/5" },
  { truong: "THPT", ten: "Thi tốt nghiệp THPT",                         dot: "Toàn quốc",            ngay: "2027-06-11", hienThi: "11–12/6" },
  { truong: "SP",   ten: "ĐH Sư phạm Nghệ thuật TW",                    dot: "Đợt 2",                ngay: "2027-06-15", hienThi: "15–16/6" },
];

// Các nút lọc theo trường, theo thứ tự hiện trên web.
export const BO_LOC_TRUONG = [
  { truong: "HAU",  ten: "ĐH Kiến trúc HN" },
  { truong: "MTCN", ten: "ĐH MTCN" },
  { truong: "XD",   ten: "ĐH Xây dựng" },
  { truong: "QG",   ten: "ĐHQG HN" },
  { truong: "SP",   ten: "SP Nghệ thuật TW" },
];


// ---------- 3. THỜI GIAN BIỂU ----------
// Môn học viết đúng một trong ba chữ: "Hình hoạ", "Màu", "Mỹ thuật 2".
// Ngày viết: "T2", "T3", "T4", "T5", "T6", "T7", "CN".
export const CA_HOC = [
  { ma: "sang",  ten: "Sáng",  gio: "9h00–12h30" },
  { ma: "chieu", ten: "Chiều", gio: "14h30–17h30" },
  { ma: "toi",   ten: "Tối",   gio: "18h15–21h00" },
];

export const THOI_GIAN_BIEU = {
  "Cơ sở Bình Phú": {
    sang:  { CN: "Hình hoạ" },
    chieu: {},
    toi:   { T2: "Hình hoạ", T3: "Hình hoạ", T4: "Màu", T5: "Hình hoạ", T6: "Màu", T7: "Hình hoạ", CN: "Hình hoạ" },
  },
  "Cơ sở Kim Quan": {
    sang:  {},
    chieu: { CN: "Hình hoạ" },
    toi:   { T3: "Màu", T5: "Màu", T6: "Hình hoạ", T7: "Hình hoạ", CN: "Hình hoạ" },
  },
};


// ---------- 4. BÀI VẼ HỌC VIÊN (trang chủ) ----------
// Bước 1: đưa ảnh vào thư mục  assets/img/bai-ve/  (nên dưới 300KB).
// Bước 2: thêm một dòng bên dưới.
// loai: viết đúng một trong: "Cơ bản", "Hình hoạ người", "Tượng", "Màu", "Mỹ thuật 2"
// Khi chưa có ảnh nào, web hiện hình minh hoạ cho từng phần học.
// Ví dụ:
//   { anh: "assets/img/bai-ve/an-chan-dung.jpg", loai: "Hình hoạ người", hocVien: "Nguyễn Văn An", moTa: "Chân dung · 3 giờ" },
export const BAI_VE = [
];


// ---------- 5. BẢNG VÀNG THI NĂNG KHIẾU (trang chủ) ----------
// Mỗi dòng = một kết quả của một học viên ở một trường. Cùng một bạn đỗ nhiều trường thì viết nhiều dòng,
// web tự gộp lại, lấy điểm vẽ cao nhất để xếp hạng (điểm Phỏng vấn chỉ hiện, không dùng để xếp).
//   truong: mã trường, phải có trong TRUONG bên dưới.
//   diem:   { "Tên môn": điểm, ... }   — để trống {} nếu chỉ báo đỗ, chưa có điểm.
//   anh:    (không bắt buộc) ảnh chân dung, ví dụ "assets/img/bang-vang/ten.jpg"
export const TRUONG = {
  MTCN: { ten: "ĐH Mỹ thuật Công nghiệp", mau: "#d6332a" },
  HAU:  { ten: "ĐH Kiến trúc Hà Nội", mau: "#1f5fbf" },
  HUCE: { ten: "ĐH Xây dựng Hà Nội", mau: "#2a9d6f" },
  SIS:  { ten: "Trường KH Liên ngành & Nghệ thuật – ĐHQGHN", mau: "#e08a1e" },
  NUAE: { ten: "ĐH Sư phạm Nghệ thuật TW", mau: "#8a3fb5" },
};

export const BANG_VANG = [
  // Mùa thi 2026 — theo bộ thẻ "Vinh danh học viên xuất sắc"
  { nam: 2026, ten: "Nguyễn Hạnh Liên", truong: "MTCN", diem: { "Bố cục màu": 8.92, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Lê Công Nghiêm", truong: "MTCN", diem: {  } },
  { nam: 2026, ten: "Nguyễn Thanh Trúc", truong: "MTCN", diem: { "Bố cục màu": 9.0, "Hình hoạ": 7.0 } },
  { nam: 2026, ten: "Nguyễn Trọng Khôi", truong: "MTCN", diem: { "Bố cục màu": 7.0, "Hình hoạ": 8.75 } },
  { nam: 2026, ten: "Kiều Bá Dũng", truong: "MTCN", diem: { "Bố cục màu": 8.0, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Bùi Anh Đức", truong: "MTCN", diem: { "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Lâm Hữu Dũng", truong: "MTCN", diem: { "Hình hoạ": 8.25 } },
  { nam: 2026, ten: "Nguyễn Bá Khánh Duy", truong: "MTCN", diem: { "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Nguyễn Bảo Châu", truong: "MTCN", diem: { "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Phạm Ngọc Đông", truong: "MTCN", diem: { "Hình hoạ": 8.25 } },
  { nam: 2026, ten: "Kiều Phương Nhài", truong: "MTCN", diem: { "Bố cục màu": 8.5 } },
  { nam: 2026, ten: "Nguyễn Hạnh Liên", truong: "HAU", diem: { "Bố cục màu": 8.5, "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Nguyễn Thảo Chi", truong: "HAU", diem: { "Bố cục màu": 7.5, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Đặng Tú Tâm", truong: "HAU", diem: { "Bố cục màu": 7.5, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Nguyễn Thị Hồng Hạnh", truong: "HAU", diem: { "Bố cục màu": 8.0, "Hình hoạ": 7.0 } },
  { nam: 2026, ten: "Kiều Nguyễn Hoàng Lan", truong: "HAU", diem: { "Bố cục màu": 7.5, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Đỗ Hữu Trường", truong: "HAU", diem: { "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Nguyễn Duy Cường", truong: "HAU", diem: { "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Nguyễn Đạt Hoàng", truong: "HAU", diem: { "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Nguyễn Thảo Chi", truong: "NUAE", diem: { "Bố cục màu": 7.0, "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Nguyễn Ngân Thương", truong: "NUAE", diem: { "Bố cục màu": 7.0, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Kiều Bá Dũng", truong: "NUAE", diem: { "Bố cục màu": 7.5, "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Nguyễn Thanh Trúc", truong: "SIS", diem: { "Bố cục màu": 8.6, "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Ngô Kiều Trang", truong: "SIS", diem: { "Bố cục màu": 8.5, "Hình hoạ": 8.7 } },
  { nam: 2026, ten: "Phùng Khánh Ly", truong: "SIS", diem: { "Bố cục": 8.2, "Phỏng vấn": 9.5 } },
  { nam: 2026, ten: "Đỗ Đăng Sơn", truong: "SIS", diem: { "Bố cục": 7.4, "Phỏng vấn": 9.3 } },
  { nam: 2026, ten: "Đỗ Hữu Trường", truong: "HUCE", diem: { "Ký hoạ": 7.0, "Hình hoạ": 9.0 } },
  { nam: 2026, ten: "Nguyễn Đăng Khôi", truong: "HUCE", diem: { "Ký hoạ": 7.5, "Hình hoạ": 9.0 } },
  { nam: 2026, ten: "Nguyễn Hữu Nguyên", truong: "HUCE", diem: { "Ký hoạ": 7.0, "Hình hoạ": 8.75 } },
  { nam: 2026, ten: "Nguyễn Đạt Hoàng", truong: "HUCE", diem: { "Ký hoạ": 7.75, "Hình hoạ": 8.5 } },
  { nam: 2026, ten: "Nguyễn Duy Cường", truong: "HUCE", diem: { "Ký hoạ": 7.0, "Hình hoạ": 8.25 } },
  { nam: 2026, ten: "Nguyễn Đức Hưng", truong: "HUCE", diem: { "Ký hoạ": 7.25, "Hình hoạ": 8.0 } },
  { nam: 2026, ten: "Nguyễn Ngân Thương", truong: "HUCE", diem: { "Ký hoạ": 8.25, "Hình hoạ": 8.25 } },
  { nam: 2026, ten: "Nguyễn Mạnh Nguyên", truong: "HUCE", diem: { "Ký hoạ": 8.75, "Hình hoạ": 8.0 } },

  // Mùa thi 2025 — theo bộ thẻ "Khoá 2025"
  { nam: 2025, ten: "Hiệp Nguyễn", truong: "MTCN", diem: { "Hình hoạ": 8.25 } },
  { nam: 2025, ten: "Ngọc Toàn", truong: "MTCN", diem: { "Hình hoạ": 8.5 } },
  { nam: 2025, ten: "Vũ Minh Tuyến", truong: "MTCN", diem: { "Hình hoạ": 9.5 } },
  { nam: 2025, ten: "Lê Thị Hoài", truong: "MTCN", diem: { "Bố cục màu": 9.5 } },
  { nam: 2025, ten: "Hoàng Đình Tùng Dương", truong: "MTCN", diem: { "Hình hoạ": 8.5, "Bố cục màu": 8.5 } },
  { nam: 2025, ten: "Hữu Phước", truong: "MTCN", diem: { "Hình hoạ": 8.0 } },
  { nam: 2025, ten: "Nguyễn Thị Hải Yến", truong: "MTCN", diem: { "Hình hoạ": 8.25 } },
  { nam: 2025, ten: "Nguyễn Thị Hải Yến", truong: "HAU", diem: { "Hình hoạ": 8.0 } },
  { nam: 2025, ten: "Nguyễn Thị Tú", truong: "MTCN", diem: { "Hình hoạ": 8.0 } },
  { nam: 2025, ten: "Ngọc Huyền", truong: "HAU", diem: { "Hình hoạ": 8.0 } },
  { nam: 2025, ten: "Quỳnh Diễm", truong: "HAU", diem: { "Bố cục màu": 8.5 } },
  { nam: 2025, ten: "Khánh Linh", truong: "HAU", diem: { "Bố cục màu": 8.5 } },
  { nam: 2025, ten: "Kiều Xuân Thơ", truong: "HAU", diem: { "Hình hoạ": 9.0 } },
  { nam: 2025, ten: "Bùi Hải Vy", truong: "HAU", diem: { "Hình hoạ": 9.0, "Bố cục màu": 8.0 } },
  { nam: 2025, ten: "Trần Phương Anh", truong: "HAU", diem: { "Khối V": 8.5 } },
  { nam: 2025, ten: "Hoàng Khánh Linh", truong: "HAU", diem: { "Khối V": 8.0 } },
  { nam: 2025, ten: "Phùng Thị Thuỳ", truong: "HAU", diem: { "Khối V": 8.0 } },
  { nam: 2025, ten: "Nguyễn Văn Trọng Tấn", truong: "HUCE", diem: { "Khối V": 9.0 } },
];
