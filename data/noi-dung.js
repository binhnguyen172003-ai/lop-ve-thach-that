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
  { ma: "sang",  ten: "Sáng",  gio: "8h30–11h30" },
  { ma: "chieu", ten: "Chiều", gio: "14h30–17h30" },
  { ma: "toi",   ten: "Tối",   gio: "18h15–21h00" },
];

export const THOI_GIAN_BIEU = {
  "Cơ sở Bình Phú": {
    sang:  { CN: "Màu" },
    chieu: { CN: "Hình hoạ" },
    toi:   { T2: "Hình hoạ", T4: "Màu", T6: "Mỹ thuật 2", T7: "Hình hoạ" },
  },
  "Cơ sở Kim Quan": {
    sang:  {},
    chieu: { CN: "Hình hoạ" },
    toi:   { T2: "Hình hoạ", T3: "Hình hoạ", T5: "Hình hoạ", T6: "Màu", T7: "Màu" },
  },
};


// ---------- 4. ẢNH BÀI VẼ TRÊN TRANG CHỦ ----------
// Bước 1: đưa ảnh vào thư mục  assets/img/bai-ve/  (nên dưới 300KB, ảnh dọc).
// Bước 2: thêm một dòng bên dưới. Để trống [] thì mục ảnh tự ẩn.
// Ví dụ:  { anh: "assets/img/bai-ve/hinh-hoa-01.jpg", moTa: "Hình hoạ người toàn thân · Khối H" },
export const BAI_VE = [
];
