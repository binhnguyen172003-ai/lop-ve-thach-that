// =====================================================================
//  THƯ VIỆN VIDEO & EBOOK — LUẬT NGHIỆP VỤ (không đụng giao diện, không đụng Firebase)
//  Dùng chung cho trang (assets/js/thu-vien.js) và kiểm thử (tests/thu-vien-luat.unit.test.mjs).
//  Ba yếu tố tách riêng, không gộp một trường:
//    duyet   (phê duyệt): nhap · cho · sua · daduyet · tuchoi
//    hienThi (hiển thị) : chua · xuatban · an · luutru
//    phạm vi (ai xem)   : phamViKieu congkhai · hocvien · khoa · taikhoan (+ phamViKhoa, phamViMail)
//  phienDuyet = số lần nội dung chính đã được duyệt (0 = chưa từng duyệt, không được xuất bản).
//  Sửa tài liệu đã duyệt: nội dung mới nằm ở banSua, bản cũ vẫn hiển thị tới khi quản lý duyệt bản sửa.
//  Luật Firestore (firestore.rules, mục tv_*) chặn lại đúng các điều này ở máy chủ.
// =====================================================================
export const THU_VIEN = {
  video: { col: "tv_video", ten: "Video", tenNho: "video", icon: "🎬", nen: "YouTube" },
  ebook: { col: "tv_ebook", ten: "Ebook", tenNho: "ebook", icon: "📘", nen: "Canva" }
};
export const DUYET = { nhap: "Bản nháp", cho: "Chờ duyệt", sua: "Cần chỉnh sửa", daduyet: "Đã duyệt", tuchoi: "Từ chối" };
export const HIEN_THI = { chua: "Chưa xuất bản", xuatban: "Đã xuất bản", an: "Đã ẩn", luutru: "Lưu trữ" };
export const PHAM_VI = { congkhai: "Công khai", hocvien: "Học viên đã duyệt", khoa: "Theo khoá học", taikhoan: "Tài khoản cụ thể" };
export const NOI_DUNG = ["tieuDe", "moTa", "danhMuc", "link", "anh", "thoiLuong", "pdf", "ytId"];
export const QUYEN_GV = [["them", "Thêm mới"], ["sua", "Chỉnh sửa"], ["danhMuc", "Quản lý danh mục"], ["sapXep", "Sắp xếp"], ["thongKe", "Xem thống kê"], ["an", "Ẩn nội dung"]];

// Tab quản lý: một tài liệu có thể nằm ở hai tab (ví dụ đã xuất bản và đang có bản sửa chờ duyệt)
export const TAB_QL = [
  ["tat", "Tất cả", () => true],
  ["nhap", "Bản nháp", d => d.duyet === "nhap"],
  ["cho", "Chờ duyệt", d => d.duyet === "cho"],
  ["sua", "Cần chỉnh sửa", d => d.duyet === "sua"],
  ["daduyet", "Đã duyệt", d => d.duyet === "daduyet" && d.hienThi === "chua"],
  ["xuatban", "Đã xuất bản", d => d.hienThi === "xuatban"],
  ["an", "Đã ẩn", d => d.hienThi === "an"],
  ["tuchoi", "Từ chối", d => d.duyet === "tuchoi"],
  ["luutru", "Lưu trữ", d => d.hienThi === "luutru"]
];

/* ---------------- Link ---------------- */
export function ytId(link) {
  let u; try { u = new URL(String(link || "").trim()); } catch (e) { return ""; }
  if (u.protocol !== "https:") return "";
  const host = u.hostname.replace(/^(www\.|m\.)/, ""), ok = id => /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : "";
  if (host === "youtu.be") return ok(u.pathname.slice(1).split("/")[0]);
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return "";
  if (u.pathname === "/watch") return ok(u.searchParams.get("v"));
  const m = /^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(u.pathname);
  return m ? ok(m[2]) : "";
}
export const ytLink = id => `https://www.youtube.com/watch?v=${id}`;
export const ytAnh = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const ytNhung = id => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;

// Canva: chỉ nhận link XEM (…/view). Link chỉnh sửa (…/edit) cho phép người khác sửa thiết kế gốc nên bị từ chối.
export function kiemCanva(link) {
  let u; try { u = new URL(String(link || "").trim()); } catch (e) { return { loi: "Link chưa đúng dạng. Dán link bắt đầu bằng https://www.canva.com/design/…" }; }
  if (u.protocol !== "https:" || !/^(www\.)?canva\.com$/.test(u.hostname)) return { loi: "Chỉ nhận link Canva (https://www.canva.com/design/…)." };
  const m = /^\/design\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/(view|edit|watch)\/?$/.exec(u.pathname);
  if (!m) return { loi: "Link Canva chưa đúng. Trong Canva bấm Chia sẻ → Xem công khai (link xem) rồi sao chép." };
  if (m[3] === "edit") return { loi: "Đây là link CHỈNH SỬA Canva — học viên có thể sửa thiết kế gốc. Dùng link chỉ xem (…/view)." };
  const xem = `https://www.canva.com/design/${m[1]}/${m[2]}/view`;
  return { link: xem, nhung: xem + "?embed" };
}
export function kiemLink(loai, link) {
  if (loai === "video") { const id = ytId(link); return id ? { link: ytLink(id), ytId: id, anh: ytAnh(id), nhung: ytNhung(id) } : { loi: "Không nhận ra link YouTube. Dán link dạng youtube.com/watch?v=… hoặc youtu.be/…" }; }
  return kiemCanva(link);
}
export const httpsHopLe = s => !s || /^https:\/\/[^\s"<>]+$/.test(String(s));
// Hai link cùng một video / cùng một thiết kế thì coi là trùng
export const khoaTrung = (loai, link) => loai === "video" ? ytId(link) : (kiemCanva(link).link || String(link || "").trim());

/* ---------------- Quyền ---------------- */
// ai: { admin, gv, quyen: {them, sua, ...} (quyền thư viện này, do quản lý cấp), mail }
export const coQuyen = (ai, k) => !!ai.admin || (!!ai.gv && !!(ai.quyen || {})[k]);
export const coTheQuanLy = ai => !!ai.admin || (!!ai.gv && Object.values(ai.quyen || {}).some(Boolean));
const laChu = (ai, d) => !!ai.mail && d.nguoiTao === ai.mail;
export const duocSua = (ai, d) => !!ai.admin || (!!ai.gv && (laChu(ai, d) ? coQuyen(ai, "them") || coQuyen(ai, "sua") : coQuyen(ai, "sua")));

/* ---------------- Ai xem được (phía trang; máy chủ chặn lại ở firestore.rules) ---------------- */
// nguoi: { mail, hocVien (đã duyệt), khoa: [các khoá được cấp] }; luc: giờ hiện tại (ms)
export function hocVienXem(d, nguoi, luc = Date.now()) {
  if (d.hienThi !== "xuatban" || !(d.phienDuyet > 0)) return false;
  if (d.lichXuatBan && d.lichXuatBan > luc) return false;
  switch (d.phamViKieu) {
    case "congkhai": return true;
    case "hocvien": return !!nguoi.hocVien;
    case "khoa": return !!nguoi.hocVien && (d.phamViKhoa || []).some(k => (nguoi.khoa || []).includes(k));
    case "taikhoan": return !!nguoi.mail && (d.phamViMail || []).includes(nguoi.mail);
    default: return false;
  }
}

/* ---------------- Thao tác hợp lệ theo trạng thái + quyền ---------------- */
// Trả về danh sách thao tác được hiện. chinh: nút chính; xacNhan: phải bấm xác nhận; lyDo: bắt buộc nhập lý do.
export function thaoTac(ai, d) {
  const ds = [], them = (k, nhan, o = {}) => ds.push({ k, nhan, ...o });
  const sua = duocSua(ai, d);
  if (sua && ["nhap", "sua"].includes(d.duyet)) { them("gui", "Gửi duyệt", { chinh: true }); them("sua", "Sửa"); }
  if (sua && d.duyet === "tuchoi") { them("sua", "Tạo bản sửa", { chinh: !ai.admin }); }
  if (sua && d.duyet === "daduyet" && d.hienThi !== "luutru") them("sua", "Chỉnh sửa (tạo bản sửa)");
  if (sua && d.duyet === "cho" && !ai.admin) them("sua", "Sửa bản đang chờ");
  if (ai.admin) {
    if (d.duyet === "cho") { them("duyet", d.banSua ? "Duyệt bản sửa" : "Phê duyệt", { chinh: true }); them("yeucausua", "Yêu cầu sửa", { lyDo: true }); them("tuchoi", "Từ chối", { lyDo: true, xacNhan: true }); }
    if (d.duyet === "daduyet" && ["chua", "an"].includes(d.hienThi) && d.phienDuyet > 0 && d.hienThi === "chua") { them("xuatban", "Xuất bản", { chinh: true }); them("lich", "Lên lịch xuất bản"); }
    if (d.duyet === "daduyet" && d.hienThi === "chua") them("thuhoi", "Thu hồi phê duyệt", { xacNhan: true });
    if (d.hienThi === "xuatban") { them("an", "Ẩn", { xacNhan: true }); }
    if (d.hienThi === "an") them("khoiphuc", "Khôi phục hiển thị", { chinh: !ds.some(x => x.chinh) });
    if (d.hienThi === "luutru") { them("khoiphuc", "Khôi phục từ lưu trữ", { chinh: true }); them("xoa", "Xoá vĩnh viễn", { xacNhan: true }); }
    else them("luutru", "Lưu trữ", { xacNhan: true });
    them("phamvi", "Phạm vi xem");
    if (sua && d.duyet === "cho") them("sua", "Sửa trước khi duyệt");
  } else if (coQuyen(ai, "an") && d.hienThi === "xuatban") them("an", "Ẩn", { xacNhan: true });
  if (!ds.some(x => x.chinh) && ds.length) ds[0].chinh = true;
  return ds;
}

// Trạng thái mới sau một thao tác. Trả về { loi } nếu không hợp lệ (giao diện cũ, bấm trùng, người khác vừa xử lý…).
export function chuyen(ai, d, k, them = {}) {
  const co = thaoTac(ai, d).some(x => x.k === k) || (k === "luunhap" && duocSua(ai, d)) || (k === "sapxep" && coQuyen(ai, "sapXep"));
  if (!co) return { loi: "Thao tác này không còn hợp lệ (có thể người khác vừa xử lý). Danh sách đã được tải lại." };
  const luc = them.luc || Date.now();
  if ((k === "tuchoi" || k === "yeucausua") && !String(them.lyDo || "").trim()) return { loi: "Cần nhập lý do." };
  switch (k) {
    case "gui": return { duyet: "cho", guiLuc: luc, lyDo: "" };
    case "duyet": {
      const moi = { duyet: "daduyet", phienDuyet: (d.phienDuyet || 0) + 1, banSua: null, xuLyBoi: ai.mail, xuLyLuc: luc, lyDo: "" };
      if (d.banSua) NOI_DUNG.forEach(f => { if (f in d.banSua) moi[f] = d.banSua[f]; });
      return moi;
    }
    case "yeucausua": return { duyet: "sua", lyDo: String(them.lyDo).trim().slice(0, 500), xuLyBoi: ai.mail, xuLyLuc: luc };
    case "tuchoi": return { duyet: "tuchoi", lyDo: String(them.lyDo).trim().slice(0, 500), xuLyBoi: ai.mail, xuLyLuc: luc };
    case "xuatban": return { hienThi: "xuatban", lichXuatBan: 0, xuLyBoi: ai.mail, xuLyLuc: luc };
    case "lich": return them.lichXuatBan > luc ? { hienThi: "xuatban", lichXuatBan: them.lichXuatBan, xuLyBoi: ai.mail, xuLyLuc: luc } : { loi: "Chọn thời điểm trong tương lai." };
    case "thuhoi": return { duyet: "cho", hienThi: "chua", xuLyBoi: ai.mail, xuLyLuc: luc };
    case "an": return { hienThi: "an", xuLyBoi: ai.mail, xuLyLuc: luc };
    // Khôi phục chỉ đưa lại hiển thị khi nội dung đã từng được duyệt; chưa duyệt thì về "chưa xuất bản"
    case "khoiphuc": return { hienThi: d.hienThi === "an" && d.phienDuyet > 0 ? "xuatban" : "chua", xuLyBoi: ai.mail, xuLyLuc: luc };
    case "luutru": return { hienThi: "luutru", xuLyBoi: ai.mail, xuLyLuc: luc };
    case "phamvi": return phamViMoi(them);
    default: return { loi: "Thao tác không hỗ trợ." };
  }
}
export function phamViMoi({ kieu, khoa = [], mail = [] }) {
  if (!PHAM_VI[kieu]) return { loi: "Chọn phạm vi xem." };
  const sach = a => [...new Set(a.map(x => String(x).trim()).filter(Boolean))].slice(0, 50);
  const k = kieu === "khoa" ? sach(khoa) : [], m = kieu === "taikhoan" ? sach(mail).map(x => x.toLowerCase()) : [];
  if (kieu === "khoa" && !k.length) return { loi: "Chọn ít nhất một khoá học." };
  if (kieu === "taikhoan" && (!m.length || m.some(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))) return { loi: "Nhập Gmail hợp lệ, mỗi dòng một Gmail." };
  return { phamViKieu: kieu, phamViKhoa: k, phamViMail: m };
}

// Lưu nội dung soạn: chưa từng duyệt thì sửa thẳng; đã duyệt thì vào banSua (bản cũ vẫn chạy tới khi duyệt bản sửa)
export function luuNoiDung(ai, d, nd, guiLuon, luc = Date.now()) {
  const sach = {}; NOI_DUNG.forEach(f => { if (f in nd) sach[f] = nd[f]; });
  const vaoBanSua = d && d.phienDuyet > 0;
  const moi = vaoBanSua ? { banSua: sach } : { ...sach };
  if (guiLuon) Object.assign(moi, { duyet: "cho", guiLuc: luc, lyDo: "" }); else if (!d) moi.duyet = "nhap";
  else if (vaoBanSua && d.duyet === "daduyet") Object.assign(moi, { duyet: "nhap" }); // bản sửa chưa gửi duyệt
  return moi;
}
export function taiLieuMoi(ai, loai, nd, guiLuon, luc = Date.now()) {
  return { ...luuNoiDung(ai, null, nd, guiLuon, luc), thuTu: luc, duyet: guiLuon ? "cho" : "nhap", hienThi: "chua", phamViKieu: "hocvien", phamViKhoa: [], phamViMail: [],
    phienDuyet: 0, banSua: null, lyDo: "", nguoiTao: ai.mail, tenNguoiTao: ai.ten || "", tao: luc, guiLuc: guiLuon ? luc : 0, xuLyBoi: "", xuLyLuc: 0, lichXuatBan: 0, capNhat: luc, v: 1 };
}
