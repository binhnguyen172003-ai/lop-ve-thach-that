// Dữ liệu thử cho Playwright: toàn bộ là tên, Gmail giả (@dreamers.test), không lấy từ dữ liệu thật.
// Chỉ nạp vào Firebase giả lập (tests/support/fake-firebase.js) trong trình duyệt kiểm thử.
import { GIAO_TRINH_MAU } from "../../data/giao-trinh-mau.js";
import { BAN, BAI_HOC } from "../../data/bai-hoc.js";

// Thứ 2, 12/10/2026, 19:30 giờ Việt Nam: đang trong ca tối, có lịch ở Bình Phú
export const GIO_THU = new Date("2026-10-12T19:30:00+07:00");
export const HOM_NAY = "2026-10-12";
export const MAT_KHAU = "matkhau-thu";

export const TK = {
  quanLy2: "quanly2.thu@dreamers.test",
  quanLy: "quanly.thu@dreamers.test",
  giaoVien: "giaovien.thu@dreamers.test",
  troGiang: "trogiang.thu@dreamers.test",
  hocVien: "hocvien.thu@dreamers.test",
  choDuyet: "choduyet.thu@dreamers.test",
  chuaXacNhan: "chuaxacnhan.thu@dreamers.test"
};

// Thứ tự A–Z đúng theo TÊN GỌI tiếng Việt (a < â, d < đ), không theo họ.
export const HOC_VIEN = [
  ["hv-07", "Bùi Quang Đạt"], ["hv-03", "Hoàng Thị Ân"], ["hv-05", "Đỗ Minh Châu"], ["hv-01", "Trần Văn An"],
  ["hv-08", "Vũ Hoàng Yến"], ["hv-02", "Lê Đức Anh"], ["hv-04", "Nguyễn Thị Bình"], ["hv-06", "Phạm Tiến Dũng"]
];
export const THU_TU_AZ = ["Trần Văn An", "Lê Đức Anh", "Hoàng Thị Ân", "Nguyễn Thị Bình", "Đỗ Minh Châu", "Phạm Tiến Dũng", "Bùi Quang Đạt", "Vũ Hoàng Yến"];

const luc = s => new Date(s + "T09:00:00+07:00").getTime();

function giaoTrinh() {
  const gt = {};
  GIAO_TRINH_MAU.forEach(([id, khoa, ten, loai, thutu, buoc, ghichu]) => gt[id] = { khoa, ten, loai, thutu, buoc, ghichu });
  BAI_HOC.forEach(({ id, ...d }) => gt[id] = { ...d, buoc: [], ghichu: "" });
  gt._meta = { ban: BAN, daxoa: [] };
  return gt;
}

export function duLieuMau({ soYeuCau = 3, hocVienThem = 0 } = {}) {
  const hocvien = {}, diemdanh = {};
  HOC_VIEN.forEach(([id, ten], i) => {
    hocvien[id] = { ten, gmail: id + "@dreamers.test", coso: i % 2 ? "Kim Quan" : "Bình Phú", chuongTrinh: "Luyện thi Khối H", khoi: "H", namThi: 2027,
      sdt: "09000000" + String(i).padStart(2, "0"), duyetLuc: luc("2026-09-0" + (i + 1)) };
    diemdanh[id] = { "2026-10-05_toi": "co", "2026-10-06_toi": i % 3 ? "co" : "vang" };
  });
  // Học viên có Gmail đăng nhập được (để kiểm thử phía học viên)
  hocvien[TK.hocVien] = { ten: "Học Viên Thử", gmail: TK.hocVien, coso: "Bình Phú", chuongTrinh: "Luyện thi Khối H", khoi: "H", namThi: 2027, duyetLuc: luc("2026-09-15"),
    khoaHoc: ["Hình hoạ cơ bản", "Hình hoạ người", "Màu & bố cục màu"] };
  for (let i = 0; i < hocVienThem; i++) hocvien["hv-them-" + i] = { ten: `Học Viên Phụ ${String(i).padStart(3, "0")}`, gmail: `phu${i}@dreamers.test`, coso: "Bình Phú", duyetLuc: luc("2026-08-01") + i };

  const yeucau = {};
  for (let i = 0; i < soYeuCau; i++) {
    const id = i ? `choduyet${i}.thu@dreamers.test` : TK.choDuyet;
    yeucau[id] = { ten: i ? `Người Chờ Duyệt ${i}` : "Người Chờ Duyệt", gmail: id, vaiTro: "hocvien", coso: "Bình Phú", chuongTrinh: "Luyện thi Khối H",
      khoi: "H", namThi: 2027, sdt: "0911111111", sdtPh: "0922222222", guiLuc: luc("2026-10-1" + Math.min(i, 2)) };
  }

  const giaovien = {
    [TK.giaoVien]: { ten: "Giáo Viên Thử", gmail: TK.giaoVien, chucVu: "Giáo viên", mon: "Hình hoạ", coso: "Bình Phú", duyetLuc: luc("2026-08-01"), kpiCong: 12,
      quyenTV: { video: { them: true }, ebook: {} } }, // chỉ được thêm Video, không có quyền Ebook
    [TK.troGiang]: { ten: "Trợ Giảng Thử Có Họ Tên Rất Dài Để Kiểm Tra Tràn Chữ", gmail: TK.troGiang, chucVu: "Trợ giảng", mon: "Màu", coso: "Kim Quan", duyetLuc: luc("2026-08-02") }
  };

  // Ca dạy tháng 10/2026: đủ dày để bảng công / lương có nhiều cột, có ca trùng giờ và ca thiếu chấm
  const caday = {};
  const them = (id, ngay, ca, coSo, gv, x = {}) => caday[id] = { ngay, ca, coSo, gv, gvTen: giaovien[gv]?.ten || gv, ...x };
  for (let d = 1; d <= 12; d++) {
    const ngay = `2026-10-${String(d).padStart(2, "0")}`, t = new Date(ngay + "T12:00:00+07:00");
    const vao = new Date(ngay + "T18:55:00+07:00").getTime(), ra = new Date(ngay + "T21:02:00+07:00").getTime();
    if (d < 12) them("ca-gv-" + d, ngay, "toi", "Bình Phú", TK.giaoVien, { vao: d === 3 ? vao + 20 * 60000 : vao, ra });
    if (t.getDay() % 2 && d < 12) them("ca-tg-" + d, ngay, "toi", "Kim Quan", TK.troGiang, d === 5 ? { vao } : { vao, ra });
  }
  them("ca-gv-hom-nay", HOM_NAY, "toi", "Bình Phú", TK.giaoVien);
  them("ca-tg-trung", "2026-10-07", "toi", "Bình Phú", TK.troGiang); // trùng ca với ca-tg-7 ở Kim Quan → không tính tiền 2 lần

  const thongbao = {
    "tb-1": { tieuDe: "Thông báo thử nghiệm", nd: "Lớp nghỉ Chủ nhật tuần này.", gui: "tatca", luc: luc("2026-10-11"), ai: TK.quanLy }
  };

  return {
    admins: { [TK.quanLy2]: {ten:"Quản Lý Hai"}, [TK.quanLy]: { ten: "Quản Lý Thử" } },
    giaovien, hocvien, yeucau, diemdanh, caday, thongbao,
    giaotrinh: giaoTrinh(),
    baitap: { "bt-1": { ten: "Bài tập thử: khối hộp", han: "2026-10-14", mon: "Hình hoạ", nd: "Vẽ 3 khối hộp", luc: luc("2026-10-10") } },
    luongdc: { "dc-1": { gv: TK.giaoVien, thang: "2026-10", loai: "thuong", muc: "Chuyên cần", tien: 200000, lyDo: "Đi đủ buổi", luc: luc("2026-10-11") } },
    tiendo: {}, nhanxet: {}, xephang: {}, baive: {}, bantin: {}, doiten: {}
  };
}

export const TAI_KHOAN = Object.fromEntries([
  [TK.quanLy2, {pass:MAT_KHAU,ten:"Quản Lý Hai"}],
  [TK.quanLy, { pass: MAT_KHAU, ten: "Quản Lý Thử" }],
  [TK.giaoVien, { pass: MAT_KHAU, ten: "Giáo Viên Thử" }],
  [TK.troGiang, { pass: MAT_KHAU, ten: "Trợ Giảng Thử" }],
  [TK.hocVien, { pass: MAT_KHAU, ten: "Học Viên Thử" }],
  [TK.choDuyet, { pass: MAT_KHAU, ten: "Người Chờ Duyệt" }],
  [TK.chuaXacNhan, { pass: MAT_KHAU, ten: "Chưa Xác Nhận", verified: false }]
]);
