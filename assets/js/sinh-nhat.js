// =====================================================================
//  SINH NHẬT HỌC VIÊN, GIÁO VIÊN — tính ngày theo giờ Việt Nam, soạn lời chúc.
//  Chỉ là các hàm tính toán (không đọc/ghi máy chủ); app.js lo phần dữ liệu và giao diện.
//  Dữ liệu công khai (Firestore: sinhnhat/<gmail>) chỉ có tên, ngày-tháng (MM-DD), cơ sở,
//  vai trò và cờ đồng ý; KHÔNG có năm sinh nên lời chúc không lộ tuổi.
// =====================================================================

export const MAU_SN = {
  hv: "Dreamers chúc mừng sinh nhật bạn {ten}!\nChúc bạn tuổi mới thật nhiều niềm vui, học tập tốt và ngày càng có thêm nhiều bài vẽ đẹp nhé! 🎨🎉",
  gv: "Dreamers chúc mừng sinh nhật {ten}!\nChúc bạn tuổi mới nhiều sức khỏe, niềm vui và tiếp tục đồng hành cùng các học viên trên hành trình học vẽ! 🎨",
  chung: "Dreamers chúc mừng sinh nhật {ten}!\nChúc các bạn tuổi mới thật nhiều niềm vui, sức khỏe và thêm thật nhiều bài vẽ đẹp! 🎨🎉"
};
export const ANH_SN = "assets/img/sinh-nhat.svg";
// Cài đặt mặc định khi quản lý chưa chỉnh (Firestore: cauhinh/sinhnhat)
export const CFG_SN = { bat: true, phamVi: "chung", gop: true, ngay2902: "2802", mauHV: "", mauGV: "", mauChung: "", anh: true };
export const cfgSN = c => ({ ...CFG_SN, ...(c || {}) });

// Hôm nay theo múi giờ Asia/Ho_Chi_Minh, dạng YYYY-MM-DD (không phụ thuộc giờ trên máy người xem)
export function homNayVN(now = new Date()) {
  try { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
  catch (e) { const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000); return `${vn.getFullYear()}-${String(vn.getMonth() + 1).padStart(2, "0")}-${String(vn.getDate()).padStart(2, "0")}`; }
}
const namNhuan = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Ngày sinh hợp lệ: YYYY-MM-DD có thật, từ 1940 đến hôm nay
export function hopLeNgaySinh(iso, hom = homNayVN()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3]; if (y < 1940 || mo < 1 || mo > 12 || d < 1) return false;
  const soNgay = [31, namNhuan(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= soNgay && iso <= hom;
}
export const mmddCua = iso => String(iso || "").slice(5, 10);
// Ngày tổ chức sinh nhật trong năm `nam`; người sinh 29/02 năm không nhuận theo quy tắc quản lý chọn (28/02 hoặc 01/03)
export function ngaySNTrongNam(mmdd, nam, quy = "2802") {
  if (mmdd === "02-29" && !namNhuan(nam)) return `${nam}-${quy === "0103" ? "03-01" : "02-28"}`;
  return `${nam}-${mmdd}`;
}
const ms = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
// Còn bao nhiêu ngày tới sinh nhật kế tiếp (0 = hôm nay)
export function soNgayToiSN(mmdd, hom = homNayVN(), quy = "2802") {
  if (!/^\d{2}-\d{2}$/.test(String(mmdd || ""))) return Infinity;
  const y = +hom.slice(0, 4); let n = ngaySNTrongNam(mmdd, y, quy);
  if (n < hom) n = ngaySNTrongNam(mmdd, y + 1, quy);
  return Math.round((ms(n) - ms(hom)) / 864e5);
}
export const laSNHomNay = (mmdd, hom, quy) => soNgayToiSN(mmdd, hom, quy) === 0;
const dien = (mau, ten) => String(mau).replace(/\{ten\}|\[Tên học viên\]|\[Tên giáo viên\]/g, ten);
const maMail = m => String(m || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

// Danh sách thông báo sinh nhật hôm nay (đã lọc: đồng ý công khai, đúng phạm vi cơ sở).
// ds: [{ id: gmail, ten, ngay: "MM-DD", coSo, vaiTro: "hv"|"gv", congKhai }]
// Mã thông báo cố định theo năm → mỗi người một lời chúc mỗi năm, tải lại trang không sinh trùng.
export function thongBaoSN(ds, cfg, hom = homNayVN(), coSoXem = "") {
  const c = cfgSN(cfg); if (!c.bat) return [];
  const nam = hom.slice(0, 4);
  const hn = (ds || []).filter(p => p && p.congKhai && p.ten && laSNHomNay(p.ngay, hom, c.ngay2902));
  const theoCS = c.phamVi === "coso" ? hn.reduce((o, p) => { (o[p.coSo || "Dreamers"] ||= []).push(p); return o; }, {}) : { "": hn };
  const out = [];
  Object.entries(theoCS).forEach(([cs, nhom]) => {
    if (c.phamVi === "coso" && coSoXem && cs !== coSoXem && cs !== "Dreamers") return;
    if (!nhom.length) return;
    const goc = { loai: "sinhnhat", tuDong: true, gui: "tatca", coSo: cs, ngaySN: hom, luc: ms(hom) - 7 * 3600e3 + 6 * 3600e3 }; // 06:00 sáng giờ VN
    if (c.gop && nhom.length > 1) {
      const ten = nhom.map(p => p.ten).join(", ");
      out.push({ ...goc, id: `sn-${hom}-${maMail(cs) || "chung"}`, tieuDe: "🎂 CHÚC MỪNG SINH NHẬT!", nd: dien(c.mauChung || MAU_SN.chung, ten), nguoi: nhom.map(p => p.id), tenNguoi: ten });
    } else nhom.forEach(p => out.push({ ...goc, id: `sn-${nam}-${maMail(p.id)}`, tieuDe: p.vaiTro === "gv" ? "🎉 CHÚC MỪNG SINH NHẬT!" : "🎂 CHÚC MỪNG SINH NHẬT!",
      nd: dien((p.vaiTro === "gv" ? c.mauGV || MAU_SN.gv : c.mauHV || MAU_SN.hv), p.ten), nguoi: [p.id], tenNguoi: p.ten }));
  });
  return out;
}
// Sinh nhật sắp tới (quản lý): mỗi người kèm số ngày còn lại
export function sapToi(ds, hom = homNayVN(), quy = "2802") {
  return (ds || []).filter(p => /^\d{2}-\d{2}$/.test(String(p.ngay || ""))).map(p => ({ ...p, con: soNgayToiSN(p.ngay, hom, quy) })).sort((a, b) => a.con - b.con || String(a.ten).localeCompare(String(b.ten), "vi"));
}
