/* ================= PHÂN QUYỀN NỘI DUNG (Video YouTube · Ebook Canva · Giáo trình · Khoá học) =================
   Bản sao phía trình duyệt của luật trong firestore.rules (phanquyen / noidung / thuvien) để:
     - hiện / ẩn nút đúng quyền và giải thích lý do bị chặn,
     - "Xem trước quyền thực tế" trong Phân quyền hệ thống,
     - dựng đúng dữ liệu cho từng bước (sửa, gửi duyệt, duyệt, xuất bản…) mà luật máy chủ chấp nhận.
   Máy chủ (luật Firestore) mới là nơi quyết định; sửa file này trên trình duyệt không mở thêm được quyền nào.
   Không phụ thuộc Firebase → chạy được cả trong Node để kiểm thử. */

export const LOAI = { video: "Video YouTube", ebook: "Ebook Canva", giaotrinh: "Giáo trình", khoahoc: "Khoá học" };
export const CO_SO = ["Bình Phú", "Kim Quan"];
// Danh mục cố định (luật máy chủ chỉ nhận đúng các giá trị này) = các khoá học của lớp + Chung
export const DANH_MUC = ["Hình hoạ cơ bản", "Hình hoạ người", "Hình hoạ tượng", "Màu & bố cục màu", "Mỹ thuật 2", "Ôn thi cấp tốc", "Chung"];
export const CS_TAI_LIEU = { "Bình Phú": "Bình Phú", "Kim Quan": "Kim Quan", chung: "Chung 2 cơ sở" };
export const HANH_DONG = ["VIEW", "CREATE", "EDIT", "SOURCE", "APPROVE", "REVOKE", "PUBLISH", "MANAGE_ACCESS", "ARCHIVE", "RESTORE", "DELETE"];
export const TEN_HD = {
  VIEW: "Xem", CREATE: "Tạo", EDIT: "Chỉnh sửa", SOURCE: "Thay link nguồn", APPROVE: "Phê duyệt", REVOKE: "Thu hồi duyệt",
  PUBLISH: "Xuất bản", MANAGE_ACCESS: "Quản lý quyền xem", ARCHIVE: "Lưu trữ", RESTORE: "Khôi phục", DELETE: "Xoá"
};
export const VAI_TRO = { qlcs: "Quản lý cơ sở", gv: "Giáo viên" };
// Quyền kế thừa theo vai trò (mức 2). Phê duyệt / xuất bản / thu hồi / quản lý quyền xem luôn phải cấp riêng.
export const KE_THUA = { qlcs: ["VIEW", "CREATE", "EDIT"], gv: [] };
export const TT = { nhap: "Bản nháp", cho: "Chờ duyệt", duyet: "Đã duyệt", sua: "Cần sửa", tuchoi: "Từ chối" };
export const PHAM_VI = { tatca: "Học viên cả 2 cơ sở", "Bình Phú": "Học viên Bình Phú", "Kim Quan": "Học viên Kim Quan" };

const khoaPV = (l, dm, cs) => [l + "|" + dm + "|" + cs, l + "|" + dm + "|*", l + "|*|" + cs, l + "|*|*"];
const conHan = (g, now) => !g.het || now < g.het;
export const trongCs = (p, cs) => cs === "chung" ? CO_SO.every(c => (p.coSo || []).includes(c)) : (p.coSo || []).includes(cs);
export const phamViMacDinh = cs => cs === "chung" ? "tatca" : cs;
export const phamViCho = cs => cs === "chung" ? ["tatca", "Bình Phú", "Kim Quan"] : [cs];

/* Xét một hành động theo đúng 8 mức. Trả { ok, muc, ly, nguon } — nguon cho biết quyền đến từ đâu (kế thừa / cấp riêng).
   p: hồ sơ phanquyen của người đó (null nếu chưa có); d: { loai, dm, cs, id }; o: { laQL, laGV, now } */
export function xet(p, act, d, o = {}) {
  const now = o.now ?? Date.now();
  if (o.laQL) return { ok: true, muc: 2, ly: "Quản lý: toàn quyền (vẫn không được tự duyệt bản của mình)", nguon: "vai trò" };
  if (!o.laGV) return { ok: false, muc: 2, ly: "Không phải nhân sự (học viên / khách không có quyền nội bộ)" };
  if (!p) return { ok: false, muc: 2, ly: "Chưa được cấp quyền nội dung nào (mặc định từ chối)" };
  if (p.khoa) return { ok: false, muc: 1, ly: "Tài khoản đang bị khoá" };
  const cap = p.cap || {}, kd = "doc:" + d.id, ks = khoaPV(d.loai, d.dm, d.cs);
  const cam = [kd, ...ks].find(k => (cap[k]?.cam || []).includes(act));
  if (cam) return { ok: false, muc: 1, ly: "Bị cấm rõ ràng ở " + moTaKhoa(cam) };
  const g = cap[kd];
  if (g && (g.a || []).includes(act)) {
    if (!conHan(g, now)) return xetPV(p, act, d, now, "Quyền riêng tài liệu đã hết hạn");
    if (g.vuot || trongCs(p, d.cs)) return { ok: true, muc: 6, ly: "Cấp riêng cho tài liệu này" + (g.vuot && !trongCs(p, d.cs) ? " (uỷ quyền vượt cơ sở)" : ""), nguon: "cấp riêng", het: g.het || 0 };
    return xetPV(p, act, d, now, "Quyền riêng tài liệu không vượt được giới hạn cơ sở");
  }
  return xetPV(p, act, d, now);
}
function xetPV(p, act, d, now, truoc) {
  if (!trongCs(p, d.cs)) return { ok: false, muc: 3, ly: (truoc ? truoc + "; " : "") + "Ngoài cơ sở được giao (" + ((p.coSo || []).join(", ") || "chưa có cơ sở") + ")" };
  const cap = p.cap || {};
  let hetHan = "";
  for (const k of khoaPV(d.loai, d.dm, d.cs)) {
    const g = cap[k];
    if (!g || !(g.a || []).includes(act)) continue;
    if (!conHan(g, now)) { hetHan = k; continue; }
    return { ok: true, muc: k.split("|")[1] === "*" ? 4 : 5, ly: "Cấp riêng: " + moTaKhoa(k), nguon: "cấp riêng", het: g.het || 0 };
  }
  if ((KE_THUA[p.vaiTro || "gv"] || []).includes(act)) return { ok: true, muc: 2, ly: "Kế thừa từ vai trò " + VAI_TRO[p.vaiTro], nguon: "kế thừa" };
  if (hetHan) return { ok: false, muc: 1, ly: "Quyền đã hết hạn: " + moTaKhoa(hetHan) };
  return { ok: false, muc: 7, ly: (truoc ? truoc + "; " : "") + "Chưa được cấp quyền " + TEN_HD[act] + " cho " + (LOAI[d.loai] || d.loai) };
}
export function moTaKhoa(k) {
  if (k.startsWith("doc:")) return "tài liệu " + k.slice(4);
  const [l, dm, cs] = k.split("|");
  return (LOAI[l] || l) + " · " + (dm === "*" ? "mọi danh mục" : dm) + " · " + (cs === "*" ? "mọi cơ sở được giao" : CS_TAI_LIEU[cs] || cs);
}

/* Mức 8: điều kiện trạng thái cho từng thao tác trên tài liệu nd (kèm tv = bản thư viện nếu có). */
export function xetTrangThai(hd, nd, me, tv) {
  const t = nd.tt, ra = (ok, ly) => ({ ok, ly });
  switch (hd) {
    case "sua": return nd.luuTru ? ra(false, "Tài liệu đang lưu trữ") : ra(true, "");
    case "gui": return nd.luuTru ? ra(false, "Tài liệu đang lưu trữ") : ["nhap", "sua", "tuchoi"].includes(t) ? ra(true, "") : ra(false, "Chỉ gửi duyệt được bản nháp / cần sửa / bị từ chối");
    case "duyet": case "yeucausua": case "tuchoi":
      if (nd.luuTru) return ra(false, "Tài liệu đang lưu trữ");
      if (t !== "cho") return ra(false, "Tài liệu chưa ở trạng thái Chờ duyệt");
      if ((nd.nguoi || []).includes(me)) return ra(false, "Không được tự duyệt phiên bản do mình tạo / chỉnh sửa");
      return ra(true, "");
    case "thuhoi": return nd.duyet ? ra(true, "") : ra(false, "Tài liệu chưa có bản được duyệt");
    case "xuatban": case "lichxb":
      if (nd.luuTru) return ra(false, "Tài liệu đang lưu trữ");
      if (!nd.duyet) return ra(false, "Chưa có phiên bản được duyệt — không thể xuất bản");
      return ra(true, nd.tt !== "duyet" ? "Sẽ xuất bản phiên bản đã duyệt v" + nd.duyet.ban + " (bản đang sửa v" + nd.ban + " chưa duyệt không bị đưa lên)" : "");
    case "an": return tv && (tv.hien || tv.hd === "lichxb") ? ra(true, "") : ra(false, "Không có bản đang hiện / đang hẹn giờ");
    case "phamvi": return tv ? ra(true, "") : ra(false, "Chưa xuất bản");
    case "luutru": return nd.luuTru ? ra(false, "Đã lưu trữ") : ra(true, tv && tv.hien ? "Bản đang hiện sẽ bị ẩn" : "");
    case "khoiphuc": return nd.luuTru ? ra(true, "") : ra(false, "Tài liệu không ở lưu trữ");
    case "xoa": return !nd.luuTru ? ra(false, "Phải lưu trữ trước khi xoá") : tv && tv.hien ? ra(false, "Đang hiện trong thư viện") : ra(true, "");
  }
  return ra(false, "Thao tác không rõ");
}
// Hành động phân quyền tương ứng từng thao tác
export const QUYEN_CUA = { sua: "EDIT", gui: "EDIT", duyet: "APPROVE", yeucausua: "APPROVE", tuchoi: "APPROVE", thuhoi: "REVOKE",
  xuatban: "PUBLISH", lichxb: "PUBLISH", an: "PUBLISH", phamvi: "MANAGE_ACCESS", luutru: "ARCHIVE", khoiphuc: "RESTORE", xoa: "DELETE" };

/* ---------- Dựng dữ liệu đúng như luật máy chủ yêu cầu ---------- */
export const maHd = luc => luc + "-" + Math.random().toString(36).slice(2, 8);
const dau = (hd, me, luc, ma) => ({ hd, hdBoi: me, hdLuc: luc, hdMa: ma });
export function taoMoi(id, f, me, luc, ma) {
  return { ma: id, loai: f.loai, dm: f.dm, cs: f.cs, tacGia: me, tieuDe: f.tieuDe, moTa: f.moTa || "", nguon: f.nguon || "", ban: 1,
    nguoi: [me], lq: [me], tt: "nhap", duyet: null, luuTru: false, taoLuc: luc, suaLuc: luc, ...dau("tao", me, luc, ma) };
}
// Sửa: luôn về Bản nháp; sửa sau khi đã gửi duyệt / đã duyệt → phiên bản mới, bản đã duyệt (và bản đang xuất bản) giữ nguyên
export function sua(o, f, me, luc, ma) {
  const goc = o.tt === "duyet" ? [] : o.nguoi || [];
  return { ...o, tieuDe: f.tieuDe, moTa: f.moTa || "", nguon: f.nguon ?? o.nguon, ban: o.tt === "nhap" ? o.ban : o.ban + 1,
    nguoi: goc.includes(me) ? goc : [...goc, me], lq: (o.lq || []).includes(me) ? o.lq : [...(o.lq || []), me],
    tt: "nhap", suaLuc: luc, ...dau("sua", me, luc, ma) };
}
export function chuyen(o, hd, me, luc, ma, nx = "") {
  const n = { ...o, ...dau(hd, me, luc, ma) };
  if (hd === "gui") { n.tt = "cho"; n.guiLuc = luc; }
  else if (hd === "duyet") { n.tt = "duyet"; n.duyet = { ban: o.ban, tieuDe: o.tieuDe, moTa: o.moTa, nguon: o.nguon, boi: me, luc }; if (nx) Object.assign(n, { nx, nxBoi: me, nxLuc: luc }); }
  else if (hd === "yeucausua" || hd === "tuchoi") Object.assign(n, { tt: hd === "tuchoi" ? "tuchoi" : "sua", nx, nxBoi: me, nxLuc: luc });
  else if (hd === "thuhoi") Object.assign(n, { duyet: null, tt: o.tt === "duyet" ? "sua" : o.tt, nx, nxBoi: me, nxLuc: luc });
  else if (hd === "luutru") n.luuTru = true;
  else if (hd === "khoiphuc") n.luuTru = false;
  return n;
}
// Bản thư viện = sao y bản đã duyệt hiện hành
export function banXuatBan(nd, f, me, luc, ma) {
  const d = nd.duyet, lich = f.tu && f.tu > luc;
  return { loai: nd.loai, dm: nd.dm, cs: nd.cs, ban: d.ban, tieuDe: d.tieuDe, moTa: d.moTa, nguon: d.nguon, duyetBoi: d.boi,
    phamVi: f.phamVi || phamViMacDinh(nd.cs), hien: !lich, tu: lich ? f.tu : luc, xbBoi: me, xbLuc: luc, ...dau(lich ? "lichxb" : "xuatban", me, luc, ma) };
}
export const nhatKy = (n, me, luc, nx = "") => ({ ai: me, luc, hd: n.hd, ban: n.ban, tieuDe: String(n.tieuDe || "").slice(0, 150), ...(nx ? { nx: String(nx).slice(0, 500) } : {}) });
export const TEN_THAO_TAC = { tao: "Tạo bản nháp", sua: "Chỉnh sửa", gui: "Gửi duyệt", duyet: "Phê duyệt", yeucausua: "Yêu cầu sửa", tuchoi: "Từ chối",
  thuhoi: "Thu hồi phê duyệt", xuatban: "Xuất bản", lichxb: "Lên lịch xuất bản", an: "Ẩn khỏi thư viện", phamvi: "Đổi phạm vi xem",
  kichhoat: "Tự xuất bản theo lịch", luutru: "Lưu trữ", khoiphuc: "Khôi phục" };

/* ---------- Kiểm tra link nguồn giống luật máy chủ ---------- */
export function nguonHopLe(l, u) {
  u = String(u || "");
  if (u.length > 500) return false;
  if (l === "video") return /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[A-Za-z0-9_-]{6,}[^ "<>]*$/.test(u);
  if (l === "ebook") return /^https:\/\/(www\.)?canva\.(com|link)\/[^ "<>]+$/.test(u);
  return u === "" || /^https:\/\/[^ "<>]+$/.test(u);
}
export function maYoutube(u) {
  const m = String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : "";
}

/* ---------- Cảnh báo xung đột khi quản lý cấp quyền ---------- */
export function canhBao(p) {
  const w = [], cap = p.cap || {}, now = Date.now();
  for (const [k, g] of Object.entries(cap)) {
    const a = g.a || [], c = g.cam || [];
    const trung = a.filter(x => c.includes(x));
    if (trung.length) w.push(moTaKhoa(k) + ": vừa cho phép vừa cấm " + trung.map(x => TEN_HD[x]).join(", ") + " → cấm được ưu tiên");
    if (g.het && g.het <= now) w.push(moTaKhoa(k) + ": quyền đã hết hạn, không còn hiệu lực");
    if (!k.startsWith("doc:")) {
      const cs = k.split("|")[2];
      if (cs !== "*" && !trongCs(p, cs)) w.push(moTaKhoa(k) + ": nằm ngoài cơ sở của tài khoản → không có hiệu lực");
    } else if (g.vuot) w.push(moTaKhoa(k) + ": được uỷ quyền vượt giới hạn cơ sở");
    if (a.includes("SOURCE") && !a.includes("EDIT")) w.push(moTaKhoa(k) + ": có Thay link nguồn nhưng chưa có Chỉnh sửa → không dùng được");
    if (a.includes("MANAGE_ACCESS") && !a.includes("PUBLISH")) w.push(moTaKhoa(k) + ": có Quản lý quyền xem nhưng không có Xuất bản → chỉ đổi được phạm vi bản đã xuất bản");
  }
  if (p.khoa) w.unshift("Tài khoản đang bị khoá: mọi quyền nội bộ ngừng hiệu lực");
  if ((p.camXem || []).length > 10) w.push("Chỉ cấm xem riêng được tối đa 10 tài liệu");
  return w;
}
// Danh sách tài liệu bị cấm xem riêng (dùng để loại khỏi truy vấn danh sách)
export const camXemCua = cap => Object.entries(cap || {}).filter(([k, g]) => k.startsWith("doc:") && (g.cam || []).includes("VIEW")).map(([k]) => k.slice(4));

/* ---------- Truy vấn danh sách mà luật máy chủ chứng minh được ----------
   Firestore chỉ cho liệt kê khi biết chắc mọi tài liệu trả về đều được xem → nhóm các ô (loại, danh mục, cơ sở) được VIEW
   thành truy vấn: loai == L, cs == C, dm in [...]. Tài khoản có tài liệu bị cấm xem riêng thì truy vấn từng ô kèm ma not-in. */
export const danhMucCua = (p, them=[]) => [...new Set([...DANH_MUC,'Hình họa chân dung','Hình họa cơ bản','Hình họa tượng','Màu',...them,...Object.keys(p?.cap || {}).filter(k => !k.startsWith('doc:')).map(k => k.split('|')[1]).filter(k => k && k !== '*')])];
export function oDuocXem(p, now = Date.now(), them = []) {
  const ra = [];
  for (const loai of Object.keys(LOAI)) for (const cs of ["Bình Phú", "Kim Quan", "chung"]) {
    const dm = danhMucCua(p,them).filter(d => xet(p, "VIEW", { loai, dm: d, cs, id: "" }, { laGV: true, now }).ok);
    if (dm.length) ra.push({ loai, cs, dm });
  }
  return ra;
}
// Ghi lịch sử phân quyền dễ đọc: so sánh bản cũ / mới
export function moTaThayDoi(cu, moi) {
  cu = cu || { cap: {}, coSo: [], khoa: false, vaiTro: "gv" };
  const d = [], ten = a => (a || []).map(x => TEN_HD[x] || x).join(", ") || "—";
  if (!cu.hdMa) d.push("Tạo bảng quyền");
  if ((cu.vaiTro || "gv") !== moi.vaiTro) d.push(`Vai trò: ${VAI_TRO[cu.vaiTro || "gv"]} → ${VAI_TRO[moi.vaiTro]}`);
  if ((cu.coSo || []).join() !== moi.coSo.join()) d.push(`Cơ sở: ${(cu.coSo || []).join(", ") || "—"} → ${moi.coSo.join(", ") || "—"}`);
  if (!!cu.khoa !== !!moi.khoa) d.push(moi.khoa ? "KHOÁ tài khoản" : "Mở khoá tài khoản");
  const ks = new Set([...Object.keys(cu.cap || {}), ...Object.keys(moi.cap || {})]);
  for (const k of ks) {
    const a = (cu.cap || {})[k], b = (moi.cap || {})[k];
    if (!b) { d.push(`Thu hồi ${moTaKhoa(k)} (cho phép: ${ten(a.a)}; cấm: ${ten(a.cam)})`); continue; }
    if (!a) { d.push(`Cấp ${moTaKhoa(k)}: cho phép ${ten(b.a)}${(b.cam || []).length ? "; cấm " + ten(b.cam) : ""}${b.het ? "; hết hạn " + new Date(b.het).toLocaleString("vi-VN") : ""}${b.vuot ? "; uỷ quyền vượt cơ sở" : ""}`); continue; }
    const thay = [];
    if (ten(a.a) !== ten(b.a)) thay.push(`cho phép ${ten(a.a)} → ${ten(b.a)}`);
    if (ten(a.cam) !== ten(b.cam)) thay.push(`cấm ${ten(a.cam)} → ${ten(b.cam)}`);
    if ((a.het || 0) !== (b.het || 0)) thay.push(`hạn ${a.het ? new Date(a.het).toLocaleString("vi-VN") : "không hạn"} → ${b.het ? new Date(b.het).toLocaleString("vi-VN") : "không hạn"}`);
    if (!!a.vuot !== !!b.vuot) thay.push(b.vuot ? "bật uỷ quyền vượt cơ sở" : "tắt uỷ quyền vượt cơ sở");
    if (thay.length) d.push(`Sửa ${moTaKhoa(k)}: ${thay.join("; ")}`);
  }
  if ((cu.ghiChu || "") !== (moi.ghiChu || "")) d.push("Ghi chú: " + (moi.ghiChu || "—"));
  return d;
}
export function loaiThayDoi(cu, moi) {
  if (!cu || !cu.hdMa) return "cap";
  if (!!cu.khoa !== !!moi.khoa) return moi.khoa ? "khoa" : "mokhoa";
  const a = Object.keys(cu.cap || {}), b = Object.keys(moi.cap || {});
  if (b.length < a.length && b.every(k => a.includes(k))) return "thuhoi";
  return b.some(k => !a.includes(k)) ? "cap" : "sua";
}
