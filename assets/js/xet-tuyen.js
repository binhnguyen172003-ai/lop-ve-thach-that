// =====================================================================
//  XÉT TUYỂN ĐẠI HỌC — nguyện vọng, học bạ, điểm thi, điểm năng khiếu, tính điểm theo cấu hình từng trường.
//  app.js gọi batDau(ctx) sau khi đăng nhập, dung() khi đăng xuất.
//  Firestore: xtcauhinh (công thức, quản lý nhập), xettuyen/<gmail> (hồ sơ học viên, có lichsu),
//             nangkhieu (điểm năng khiếu), xtnoibo/<gmail> (đánh giá nội bộ: chỉ giáo viên, quản lý).
//  Quyền đọc/ghi kiểm tra ở máy chủ (firestore.rules), giao diện chỉ ẩn bớt cho gọn.
// =====================================================================
import * as T from "./xet-tuyen-tinh.js?v=20261011a";

let C = null, huy = [], xem = "", sua = false, loc = { q: "", cs: "", truong: "", nganh: "", khoi: "", tt: "", sx: "can" }, moCH = false;
const D = { cfg: [], ho: {}, nk: [], nb: {}, ls: [], lsMail: "", loi: "", taiHo: false };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
const ngayVN = iso => { const [y, m, d] = String(iso || "").split("-"); return y && d ? `${+d}/${+m}/${y}` : ""; };
const luc = t => { if (!t) return ""; const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const F = T.fmt, CO_SO = ["Bình Phú", "Kim Quan", "Online"];
const NHAP = m => `xt-nhap-${C.mail}-${m}`;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ================= Khởi động ================= */
export function batDau(ctx) {
  dung(); C = ctx;
  const { db, fs: { collection, doc, query, where, onSnapshot } } = C;
  const nghe = (q, fn) => { const u = onSnapshot(q, s => { fn(s); D.loi = ""; ve(); }, e => { D.loi = (e && e.code) || "loi"; ve(); }); huy.push(u); C.themHuy(u); };
  const ds = s => s.docs.filter(d => d.id[0] !== "_").map(d => ({ id: d.id, ...d.data() }));
  nghe(collection(db, "xtcauhinh"), s => D.cfg = ds(s).sort((a, b) => (b.nam || 0) - (a.nam || 0) || String(a.truong).localeCompare(String(b.truong), "vi")));
  if (C.isTeacher) {
    const pv = phamVi(), q = (col) => C.isAdmin || pv.includes("tatca") ? collection(db, col) : query(collection(db, col), where("coSo", "in", pv.length ? pv : ["—"]));
    nghe(q("xettuyen"), s => { D.ho = Object.fromEntries(ds(s).map(x => [x.id, x])); D.taiHo = true; });
    nghe(q("nangkhieu"), s => D.nk = ds(s));
    nghe(q("xtnoibo"), s => D.nb = Object.fromEntries(ds(s).map(x => [x.id, x])));
  } else {
    nghe(doc(db, "xettuyen", C.mail), d => { D.ho = d.exists() ? { [C.mail]: { id: C.mail, ...d.data() } } : {}; D.taiHo = true; });
    nghe(query(collection(db, "nangkhieu"), where("mail", "==", C.mail)), s => D.nk = ds(s));
  }
  ve();
}
export function dung() {
  huy.forEach(u => { try { u(); } catch (e) {} }); huy = []; xem = ""; sua = false; moCH = false;
  if (lsHuy) { lsHuy(); lsHuy = null; }
  Object.assign(D, { cfg: [], ho: {}, nk: [], nb: {}, ls: [], lsMail: "", loi: "", taiHo: false }); C = null;
  const b = $("#xt-body"); if (b) b.innerHTML = "";
}
let veHen = 0;
function ve() { cancelAnimationFrame(veHen); veHen = requestAnimationFrame(veNgay); }
export const veLai = ve;
// Phạm vi giáo viên: quản lý gán (xtPhamVi), chưa gán thì theo cơ sở của giáo viên
function phamVi() { const g = (C.gvToi && C.gvToi()) || {}; return Array.isArray(g.xtPhamVi) && g.xtPhamVi.length ? g.xtPhamVi : g.coso ? [g.coso] : []; }
const trongPV = cs => C.isAdmin || phamVi().includes("tatca") || phamVi().includes(cs);
const hvDs = () => (C.hocVien() || []).filter(h => trongPV(h.coso || ""));
const hvCua = m => C.isTeacher ? (C.hocVien() || []).find(h => h.id === m) || { id: m, ten: m } : { id: C.mail, ten: C.ten, ...(C.hvToi() || {}) };
const cfgCua = id => D.cfg.find(c => c.id === id) || null;
const tenCfg = c => c ? `${c.truong || "?"} · ${c.nganh || "?"}${c.maNganh ? " (" + c.maNganh + ")" : ""} · ${T.PHUONG_THUC[c.phuongThuc] || c.phuongThuc || ""}${c.toHop ? " · " + c.toHop : ""} · ${c.nam || ""}` : "";

/* ================= Dữ liệu một học viên → đầu vào bộ tính ================= */
function hsCua(m) {
  const ho = D.ho[m] || {}, nb = D.nb[m] || {}, nk = {};
  Object.keys(T.MON_NK).forEach(ma => {
    const tk = T.thongKeNK(D.nk.filter(x => x.mail === m), ma), co = nb.nkCoSo || "tb";
    const duKien = co === "gannhat" ? tk.ganNhat?.diem : co === "caonhat" ? tk.caoNhat : tk.tb;
    const ct = T.coDiem(tk.chinhThuc) ? tk.chinhThuc : (ho.nkChinhThuc || {})[ma];
    nk[ma] = { chinhThuc: T.coDiem(ct) ? ct : null, duKien: T.coDiem(duKien) ? T.lamTron(duKien, 2) : null, nguonDK: { tb: "TB thi thử hợp lệ", gannhat: "thi thử gần nhất", caonhat: "thi thử cao nhất" }[co] };
  });
  return { hocBa: ho.hocBa || {}, thpt: ho.thpt || {}, nk, duKien: C.isTeacher ? nb.duKien || {} : {}, uuTien: ho.uuTien || 0 };
}
const nvCua = m => [1, 2].map(i => ((D.ho[m] || {}).nv || []).find(x => x.stt === i) || null);
// Lớp đang học → những năm học đã xong (để không bắt nhập học bạ của lớp chưa học)
const lopNay = hv => { const m = /(\d{1,2})/.exec(hv.lopHoc || ""); return m ? m[1] : ""; };
function lopXong(hv) { const m = /(\d{1,2})/.exec(hv.lopHoc || ""); if (!m) return ["10", "11", "12"]; const l = +m[1]; return ["10", "11", "12"].filter(x => +x < l); }
// Môn / kỳ học bạ, môn thi, môn năng khiếu mà các nguyện vọng đang chọn cần
function canNhap(m, nvs) {
  const hb = {}, thpt = new Set(), nk = new Set();
  nvs.forEach(nv => { const c = nv && cfgCua(nv.cauHinh); if (!c) return;
    (c.mon || []).concat((c.dieuKien || []).map(d => ({ ma: d.ma, nguon: T.laNK(d.ma) ? "nk" : "thpt" }))).forEach(x => {
      if (x.nguon === "nk") nk.add(x.ma); else if (x.nguon === "thpt") thpt.add(x.ma); else if (T.NGUON[x.nguon]?.ky) (hb[x.ma] ||= new Set()) && T.NGUON[x.nguon].ky.forEach(k => hb[x.ma].add(k)); }); });
  return { hb, thpt, nk, coCfg: nvs.some(nv => nv && cfgCua(nv.cauHinh)) };
}
// Tình trạng hồ sơ: tính từ dữ liệu ĐÃ LƯU trên máy chủ (không báo hoàn thành khi chưa lưu được)
function hoanThanh(m) {
  const ho = D.ho[m], hv = hvCua(m), nvs = nvCua(m), can = canNhap(m, nvs), xong = lopXong(hv), out = [];
  const nvOk = nv => !!nv && (nv.chuaXacDinh || !!nv.cauHinh || !!(nv.truong && nv.nganh));
  out.push(["Năm dự kiến dự thi", !!(ho && ho.namThi)]);
  out.push(["Nguyện vọng 1", nvOk(nvs[0])], ["Nguyện vọng 2", nvOk(nvs[1])]);
  out.push(["Trường và ngành dự kiến", !!nvs[0] && (nvs[0].chuaXacDinh || !!(nvs[0].truong && nvs[0].nganh))]);
  out.push(["Tổ hợp xét tuyển", !!nvs[0] && (nvs[0].chuaXacDinh || !!nvs[0].toHop)]);
  const hb = (ho && ho.hocBa) || {};
  let thieuHB = [];
  if (can.coCfg) Object.entries(can.hb).forEach(([ma, ks]) => [...ks].filter(k => xong.includes(k.split(".")[0])).forEach(k => { if (!T.coDiem((hb[ma] || {})[k])) thieuHB.push(`${T.tenMon(ma)} ${T.TEN_KY(k)}`); }));
  else ["toan", "van", "anh"].forEach(ma => xong.forEach(l => { if (!T.coDiem((hb[ma] || {})[l + ".cn"])) thieuHB.push(`${T.tenMon(ma)} cả năm lớp ${l}`); }));
  out.push([`Điểm học bạ các môn liên quan${thieuHB.length ? ` (thiếu ${thieuHB.length}: ${thieuHB.slice(0, 3).join(", ")}${thieuHB.length > 3 ? "…" : ""})` : ""}`, !thieuHB.length]);
  return { ds: out, xong: out.every(x => x[1]), so: out.filter(x => x[1]).length, tong: out.length, coHo: !!ho };
}
// Nhắc trong khung Nhắc việc của học viên khi hồ sơ còn thiếu
export function nhac() {
  if (!C || C.isTeacher || !D.taiHo) return null;
  const h = hoanThanh(C.mail); if (h.xong) return null;
  return { id: "xt-thieu-" + h.so, icon: "🎓", muc: "", tieuDe: `Bổ sung thông tin xét tuyển (${h.so}/${h.tong} mục)`, nd: "Nguyện vọng, tổ hợp, học bạ… giúp anh chị lên lộ trình ôn phù hợp.", link: "#xet-tuyen", dich: "#xt-body" };
}

/* ================= Vẽ ================= */
function veNgay() {
  const box = $("#xt-body"); if (!box) return;
  if (!C) { box.innerHTML = ""; return; }
  // đang gõ trong form: không vẽ lại (giữ con trỏ, chữ đang nhập)
  const a = document.activeElement;
  if (box.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest("[data-giu]")) return;
  if (D.loi) { box.innerHTML = `<div class="vh-loi"><b>Mục Xét tuyển chưa bật được trên máy chủ.</b><p>${C.isAdmin ? "Vào <b>Quản lý</b> → khung kiểm tra máy chủ → <b>Sao chép luật mới</b> → dán vào Firebase → <b>Publish</b>. Xong tải lại trang." : "Quản lý lớp cần cập nhật luật bảo mật. Báo anh chị giúp nhé."}</p><small class="muted">Mã: ${esc(D.loi)}</small></div>`; return; }
  const cuon = scrollY;
  box.innerHTML = C.isTeacher ? (xem ? chiTiet(xem) : danhSach()) : trangHV();
  ganSuKien(box);
  if (Math.abs(scrollY - cuon) > 2) scrollTo(0, cuon);
}
const CHU_Y = `<p class="xt-chu-y">Đây là đánh giá tham khảo, không phải kết quả tuyển sinh chính thức. Điểm chuẩn năm trước chỉ để tham chiếu, không bảo đảm trúng tuyển năm nay.</p>`;
const chipLoai = l => l === "chinhthuc" ? '<span class="chip ok">Chính thức</span>' : l === "dukien" ? '<span class="chip warn">Dự kiến</span>' : l === "giadinh" ? '<span class="chip line">Giả định</span>' : "";

// ---- Học viên: tình trạng hồ sơ + form + kết quả + công cụ ----
function trangHV() {
  const m = C.mail, h = hoanThanh(m);
  return `${theTinhTrang(h, true)}${formHoSo(m)}${ketQua(m, false)}${nkHV(m)}`;
}
function theTinhTrang(h, laHV) {
  return `<section class="card xt-tt ${h.xong ? "xong" : ""}" aria-label="Tình trạng hồ sơ"><div class="vh-dong"><b>${h.xong ? "✓ Hồ sơ xét tuyển đã đủ" : laHV ? "📝 Yêu cầu bổ sung thông tin xét tuyển" : "Hồ sơ chưa đủ"}</b><span class="chip ${h.xong ? "ok" : "warn"}">${h.so}/${h.tong} mục</span></div>
    ${laHV && !h.xong ? `<p class="muted">Để lớp xây dựng lộ trình ôn tập phù hợp, em cập nhật đủ các mục dưới. Chưa xác định được nguyện vọng thì chọn <b>Chưa xác định</b>.</p>` : ""}
    <ul class="xt-check">${h.ds.map(([t, ok]) => `<li class="${ok ? "ok" : ""}">${ok ? "✓" : "○"} ${esc(t)}</li>`).join("")}</ul>
    ${laHV && !h.xong ? `<a class="btn primary small" href="#xt-form" data-xt="toi-form">Cập nhật thông tin</a>` : ""}</section>`;
}

/* ---- Form hồ sơ (dùng chung: học viên tự điền / giáo viên sửa giúp) ---- */
// Hồ sơ → bảng giá trị theo khoá ô nhập; nháp chưa lưu dùng cùng dạng này
function giaTriTu(ho) {
  const g = { namThi: ho?.namThi ?? "", uuTien: ho?.uuTien ? String(ho.uuTien).replace(".", ",") : "", monThem: (ho?.monThem || []).join(",") };
  [1, 2].forEach(i => { const nv = (ho?.nv || []).find(x => x.stt === i) || {};
    g[`nv${i}.cfg`] = nv.chuaXacDinh ? "chuaxd" : nv.cauHinh ? nv.cauHinh : nv.truong ? "khac" : "";
    ["truong", "nganh", "maNganh", "toHop", "phuongThuc"].forEach(k => g[`nv${i}.${k}`] = nv[k] || ""); g[`nv${i}.trangThai`] = nv.trangThai || (nv.chuaXacDinh ? "chuaxd" : "dukien"); });
  Object.entries(ho?.hocBa || {}).forEach(([ma, o]) => Object.entries(o || {}).forEach(([k, v]) => g[`hb.${ma}.${k}`] = T.coDiem(v) ? String(v).replace(".", ",") : ""));
  Object.entries(ho?.thpt || {}).forEach(([ma, o]) => { g[`thpt.${ma}`] = T.coDiem(o?.v) ? String(o.v).replace(".", ",") : ""; g[`thptLoai.${ma}`] = o?.loai || "dukien"; });
  Object.entries(ho?.nkChinhThuc || {}).forEach(([ma, v]) => g[`nkct.${ma}`] = T.coDiem(v) ? String(v).replace(".", ",") : "");
  return g;
}
const nvTu = (g, i) => { const v = g[`nv${i}.cfg`]; if (!v) return null; if (v === "chuaxd") return { stt: i, chuaXacDinh: true };
  if (v === "khac") return { stt: i, truong: g[`nv${i}.truong`], nganh: g[`nv${i}.nganh`], toHop: g[`nv${i}.toHop`], phuongThuc: g[`nv${i}.phuongThuc`] }; return { stt: i, cauHinh: v }; };
function formHoSo(m) {
  const ho = D.ho[m], nhap = store.get(NHAP(m)), g = nhap ? nhap.g : giaTriTu(ho), hv = hvCua(m);
  const nvs = [nvTu(g, 1), nvTu(g, 2)], can = canNhap(m, nvs), nam = +C.homNay().slice(0, 4), xongLop = lopXong(hv);
  const o = (k, nhan, extra = "") => `<label class="xt-o"><span>${nhan}</span><input data-f="${esc(k)}" inputmode="decimal" autocomplete="off" maxlength="6" value="${esc(g[k] ?? "")}" ${extra}></label>`;
  const sel = (k, ds, nhan, cls = "") => `<label class="${cls}"><span>${nhan}</span><select data-f="${esc(k)}">${ds.map(([v, t]) => `<option value="${esc(v)}"${String(g[k] ?? "") === String(v) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
  const txt = (k, nhan, ph = "", dl = "") => `<label><span>${nhan}</span><input data-f="${esc(k)}" maxlength="120" value="${esc(g[k] ?? "")}" placeholder="${esc(ph)}"${dl ? ` list="${dl}"` : ""}></label>`;
  const nvHTML = i => { const v = g[`nv${i}.cfg`], c = cfgCua(v);
    return `<fieldset class="xt-nv"><legend>Nguyện vọng ${i}</legend>
      ${sel(`nv${i}.cfg`, [["", "— Chọn —"], ["chuaxd", "Chưa xác định"], ...D.cfg.map(c => [c.id, tenCfg(c) + (T.dungDuoc(c) ? "" : " · chưa có công thức xác minh")]), ["khac", "Trường / ngành khác (tự nhập)"]], "Trường · ngành · phương thức", "xt-rong")}
      ${v === "khac" ? `<div class="fgrid">${txt(`nv${i}.truong`, "Trường đại học", "VD: ĐH Kiến trúc Hà Nội")}${txt(`nv${i}.nganh`, "Ngành học", "VD: Kiến trúc")}${txt(`nv${i}.maNganh`, "Mã ngành (nếu có)", "VD: 7580101")}
        ${txt(`nv${i}.toHop`, "Tổ hợp xét tuyển", "VD: V00", "xt-th-ds")}${sel(`nv${i}.phuongThuc`, [["", "— Chọn —"], ...Object.entries(T.PHUONG_THUC)], "Phương thức xét tuyển")}</div>
        <p class="muted"><small>Trường/ngành này chưa có công thức trên web nên chưa tính được điểm. Anh chị sẽ bổ sung khi có đề án chính thức.</small></p>` : ""}
      ${c ? `<p class="muted xt-cfg-tom"><small>${esc(T.PHUONG_THUC[c.phuongThuc] || "")} · tổ hợp ${esc(c.toHop || "—")} · ${(c.mon || []).map(x => `${esc(T.tenMon(x.ma))}${+x.heSo !== 1 ? " ×" + esc(x.heSo) : ""}`).join(" + ")}${T.dungDuoc(c) ? "" : " · <b>chưa có công thức xác minh</b>"}</small></p>` : ""}
      ${v && v !== "chuaxd" ? sel(`nv${i}.trangThai`, Object.entries(T.TRANG_THAI_NV), "Trạng thái nguyện vọng") : ""}</fieldset>`; };
  // Học bạ: chỉ các môn, kỳ nguyện vọng cần; chưa có công thức thì gợi ý Toán, Văn, Anh (không bắt buộc môn khác)
  const monHB = can.coCfg ? Object.keys(can.hb) : ["toan", "van", "anh"];
  const them = String(g.monThem || "").split(",").filter(x => x && T.MON_VH[x] && !monHB.includes(x));
  const kyMon = ma => can.hb[ma] ? T.KY.filter(k => can.hb[ma].has(k)) : ["10.cn", "11.cn", "12.cn"];
  const hbHTML = [...monHB, ...them].map(ma => `<div class="xt-hb-mon"><b>${esc(T.tenMon(ma))}</b><div class="xt-hb-o">${kyMon(ma).map(k => o(`hb.${ma}.${k}`, T.TEN_KY(k) + (xongLop.includes(k.split(".")[0]) ? "" : lopNay(hv) === k.split(".")[0] ? " <small>(năm nay)</small>" : " <small>(chưa tới)</small>"))).join("")}</div></div>`).join("");
  const thptMon = can.thpt.size ? [...can.thpt] : [];
  const nkMon = can.nk.size ? [...can.nk] : ["hinhhoa", "bocucmau"];
  return `<form class="card xt-form" id="xt-form" data-giu novalidate data-mail="${esc(m)}">
    <h2 class="vh-h2">Thông tin xét tuyển đại học${C.isTeacher ? ` · ${esc(hv.ten)}` : ""}</h2>
    ${nhap ? `<p class="xt-nhap">📝 Đang hiện <b>bản nháp chưa lưu</b> (${esc(luc(nhap.luc))}). Bấm <b>Lưu</b> để gửi lên, hoặc <button type="button" class="linkish" data-xt="bo-nhap">bỏ nháp</button>.</p>` : ""}
    <datalist id="xt-th-ds">${Object.entries(T.TO_HOP).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</datalist>
    <details class="xt-nhom" open><summary>1. Nguyện vọng</summary>
      ${sel("namThi", [["", "— Chọn năm —"], ...Array.from({ length: 6 }, (_, i) => [nam + i, String(nam + i)])], "Năm dự kiến dự thi")}
      ${nvHTML(1)}${nvHTML(2)}</details>
    <details class="xt-nhom" open><summary>2. Điểm học bạ <small>(thang 10, ví dụ 7,5)</small></summary>
      <p class="muted"><small>${can.coCfg ? "Chỉ hiện những môn, học kỳ mà nguyện vọng của em cần." : "Chưa chọn được trường có công thức: điền Toán, Văn, Anh các năm đã học (không bắt buộc môn khác)."} Ô để trống = chưa có điểm; điểm 0 vẫn được ghi nhận.</small></p>
      ${hbHTML}
      <label class="xt-them"><span>Thêm môn khác</span><select data-xt="them-mon"><option value="">— Chọn môn —</option>${Object.entries(T.MON_VH).filter(([k]) => !monHB.includes(k) && !them.includes(k)).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label></details>
    <details class="xt-nhom"${thptMon.length ? " open" : ""}><summary>3. Điểm thi tốt nghiệp THPT${thptMon.length ? "" : " <small>(nguyện vọng chưa cần)</small>"}</summary>
      ${(thptMon.length ? thptMon : ["toan", "van", "anh"]).map(ma => `<div class="xt-thpt">${o(`thpt.${ma}`, esc(T.tenMon(ma)))}${sel(`thptLoai.${ma}`, [["dukien", "Dự kiến"], ["chinhthuc", "Chính thức (đã có kết quả)"]], "Loại điểm")}</div>`).join("")}</details>
    <details class="xt-nhom"><summary>4. Điểm thi năng khiếu chính thức <small>(khi có kết quả)</small></summary>
      <p class="muted"><small>Điểm thi thử, kiểm tra trên lớp do anh chị ghi ở mục bên dưới. Ô này chỉ điền khi đã có kết quả thi năng khiếu chính thức của trường.</small></p>
      <div class="xt-hb-o">${nkMon.map(ma => o(`nkct.${ma}`, esc(T.tenMon(ma)))).join("")}</div></details>
    <details class="xt-nhom"><summary>5. Điểm ưu tiên <small>(nếu có)</small></summary>
      ${o("uuTien", "Điểm ưu tiên khu vực + đối tượng (thang 30, VD 0,75)", 'data-max="3"')}
      <p class="muted"><small>Chỉ cộng khi công thức của trường có áp dụng ưu tiên; từ 22,5 điểm trở lên được giảm dần theo quy chế.</small></p></details>
    <p class="status" id="xt-st" role="status"></p>
    <div class="xt-nut"><button type="button" class="btn" data-xt="luu-tam">Lưu tạm</button><button type="submit" class="btn primary" id="xt-luu">Lưu thông tin</button>${C.isTeacher ? `<button type="button" class="btn" data-xt="dong-sua">Đóng</button>` : ""}</div>
  </form>`;
}
// Đọc form → bảng giá trị (giữ nguyên chữ người dùng gõ)
const docForm = f => { const g = { ...(store.get(NHAP(f.dataset.mail))?.g || giaTriTu(D.ho[f.dataset.mail])) }; f.querySelectorAll("[data-f]").forEach(i => g[i.dataset.f] = i.value); return g; };
function luuNhap(f, bao) { const g = docForm(f); store.set(NHAP(f.dataset.mail), { g, luc: Date.now() }); if (bao) C.toast("Đã lưu tạm trên máy này. Bấm Lưu thông tin để gửi lên."); }
// Kiểm tra, chuyển sang dữ liệu lưu; lỗi thì trả danh sách lỗi
function hoTu(g, m) {
  const ho = D.ho[m] || {}, loi = [], so = (k, nhan, max = 10) => { const v = T.soDiem(g[k]); if (Number.isNaN(v)) { loi.push(`${nhan}: “${g[k]}” không phải điểm hợp lệ (chỉ số, dùng dấu phẩy hoặc chấm).`); return undefined; }
    if (v !== null && !(v >= 0 && v <= max)) { loi.push(`${nhan}: điểm phải từ 0 đến ${String(max).replace(".", ",")}.`); return undefined; } return v; };
  const nv = [1, 2].map(i => { const v = g[`nv${i}.cfg`]; if (!v) return null;
    if (v === "chuaxd") return { stt: i, chuaXacDinh: true, trangThai: "chuaxd", cauHinh: "", truong: "", nganh: "", maNganh: "", toHop: "", phuongThuc: "" };
    if (v === "khac") { const truong = String(g[`nv${i}.truong`] || "").trim().slice(0, 120), nganh = String(g[`nv${i}.nganh`] || "").trim().slice(0, 120);
      if (!truong || !nganh) loi.push(`Nguyện vọng ${i}: ghi tên trường và ngành (hoặc chọn Chưa xác định).`);
      return { stt: i, chuaXacDinh: false, cauHinh: "", truong, nganh, maNganh: String(g[`nv${i}.maNganh`] || "").trim().slice(0, 20), toHop: String(g[`nv${i}.toHop`] || "").trim().toUpperCase().slice(0, 10), phuongThuc: g[`nv${i}.phuongThuc`] || "", trangThai: g[`nv${i}.trangThai`] || "dukien" }; }
    const c = cfgCua(v); if (!c) { loi.push(`Nguyện vọng ${i}: lựa chọn không còn trong danh sách, chọn lại.`); return null; }
    return { stt: i, chuaXacDinh: false, cauHinh: c.id, truong: c.truong || "", nganh: c.nganh || "", maNganh: c.maNganh || "", toHop: c.toHop || "", phuongThuc: c.phuongThuc || "", trangThai: g[`nv${i}.trangThai`] || "dukien" }; }).filter(Boolean);
  // Gộp vào dữ liệu cũ: môn, kỳ không hiện trên form vẫn giữ nguyên (đổi nguyện vọng không mất điểm đã nhập)
  const hocBa = JSON.parse(JSON.stringify(ho.hocBa || {})), thpt = JSON.parse(JSON.stringify(ho.thpt || {})), nkct = { ...(ho.nkChinhThuc || {}) };
  Object.keys(g).forEach(k => {
    let p = k.split(".");
    if (p[0] === "hb") { const ma = p[1], ky = p.slice(2).join("."); if (!T.MON_VH[ma] || !T.KY.includes(ky)) return; const v = so(k, `${T.tenMon(ma)} ${T.TEN_KY(ky)}`);
      if (v === undefined) return; hocBa[ma] ||= {}; if (v === null) delete hocBa[ma][ky]; else hocBa[ma][ky] = v; if (!Object.keys(hocBa[ma]).length) delete hocBa[ma]; }
    if (p[0] === "thpt") { const ma = p[1]; if (!T.MON_VH[ma]) return; const v = so(k, `Điểm thi ${T.tenMon(ma)}`); if (v === undefined) return;
      if (v === null) delete thpt[ma]; else thpt[ma] = { v, loai: g[`thptLoai.${ma}`] === "chinhthuc" ? "chinhthuc" : "dukien" }; }
    if (p[0] === "nkct") { const ma = p[1]; if (!T.MON_NK[ma]) return; const v = so(k, `Năng khiếu chính thức ${T.tenMon(ma)}`); if (v === undefined) return; if (v === null) delete nkct[ma]; else nkct[ma] = v; }
  });
  const ut = so("uuTien", "Điểm ưu tiên", 3);
  const namThi = g.namThi ? Number(g.namThi) : null;
  return { loi, data: { nv, hocBa, thpt, nkChinhThuc: nkct, uuTien: ut || 0, namThi, monThem: String(g.monThem || "").split(",").filter(x => T.MON_VH[x]) } };
}
async function luuHoSo(f, btn) {
  const m = f.dataset.mail, g = docForm(f), st = $("#xt-st"), { loi, data } = hoTu(g, m);
  if (loi.length) { st.className = "status err"; st.innerHTML = loi.map(esc).join("<br>"); luuNhap(f); return; }
  if (btn.disabled) return;
  const cu = D.ho[m], hv = hvCua(m), { db, fs: { doc, collection, writeBatch } } = C;
  const doc_ = { ...data, coSo: hv.coso || "", ten: hv.ten || "", phienBan: (cu?.phienBan || 0) + 1, capNhat: Date.now(), capNhatBoi: C.mail, capNhatTen: C.ten };
  const tom = tomTatDoi(cu, doc_);
  if (cu && !tom) { st.className = "status"; st.textContent = "Không có gì thay đổi."; store.set(NHAP(m), null); return; }
  btn.disabled = true; const chu = btn.textContent; btn.textContent = "Đang lưu…"; st.className = "status"; st.textContent = "";
  try {
    const b = writeBatch(db);
    b.set(doc(db, "xettuyen", m), doc_);
    b.set(doc(collection(db, `xettuyen/${m}/lichsu`)), { ai: C.mail, ten: C.ten, luc: Date.now(), tom: (tom || "Tạo hồ sơ").slice(0, 2000) });
    await b.commit();
    store.set(NHAP(m), null); D.ho[m] = { id: m, ...doc_ }; // máy chủ đã nhận: hiện ngay, không chờ cập nhật về
    C.toast("Đã lưu thông tin xét tuyển ✓"); if (C.isTeacher) sua = false; ve();
  } catch (e) {
    luuNhap(f);
    st.className = "status err";
    st.textContent = e && e.code === "permission-denied"
      ? (D.ho[m] && (D.ho[m].phienBan || 0) !== (cu?.phienBan || 0) ? "Có người vừa cập nhật hồ sơ này. Phần em đang nhập đã giữ trong bản nháp; xem bản mới rồi lưu lại." : "Máy chủ chưa cho lưu (quyền hoặc luật bảo mật cũ, hoặc hồ sơ vừa được người khác sửa). Phần đang nhập đã giữ trong bản nháp.")
      : "Chưa lưu được (mạng yếu). Phần đang nhập đã giữ trong bản nháp, có mạng thì bấm Lưu lại.";
    C.toast("Chưa lưu được thông tin xét tuyển.", "err");
  } finally { btn.disabled = false; btn.textContent = chu; }
}
// Tóm tắt thay đổi cho lịch sử
function tomTatDoi(a, b) {
  if (!a) return "Tạo hồ sơ xét tuyển";
  const out = [], nvChu = nv => nv ? (nv.chuaXacDinh ? "Chưa xác định" : `${nv.truong} · ${nv.nganh}${nv.toHop ? " · " + nv.toHop : ""}`) : "—";
  if (a.namThi !== b.namThi) out.push(`Năm thi: ${a.namThi || "—"} → ${b.namThi || "—"}`);
  [1, 2].forEach(i => { const x = (a.nv || []).find(n => n.stt === i), y = (b.nv || []).find(n => n.stt === i);
    if (nvChu(x) !== nvChu(y) || (x || {}).trangThai !== (y || {}).trangThai) out.push(`NV${i}: ${nvChu(x)} → ${nvChu(y)}${y && y.trangThai ? " (" + (T.TRANG_THAI_NV[y.trangThai] || "") + ")" : ""}`); });
  const chu = v => v === undefined || v === null ? "—" : typeof v === "object" ? `${F(v.v)} (${v.loai === "chinhthuc" ? "chính thức" : "dự kiến"})` : F(v);
  const doiDiem = (ten, x, y) => { const k = new Set([...Object.keys(x || {}), ...Object.keys(y || {})]); k.forEach(kk => { const u = (x || {})[kk], v = (y || {})[kk]; if (JSON.stringify(u) !== JSON.stringify(v)) out.push(`${ten(kk)}: ${chu(u)} → ${chu(v)}`); }); };
  Object.keys({ ...(a.hocBa || {}), ...(b.hocBa || {}) }).forEach(ma => doiDiem(k => `${T.tenMon(ma)} ${T.TEN_KY(k)}`, (a.hocBa || {})[ma], (b.hocBa || {})[ma]));
  doiDiem(k => `Thi THPT ${T.tenMon(k)}`, a.thpt, b.thpt); doiDiem(k => `NK chính thức ${T.tenMon(k)}`, a.nkChinhThuc, b.nkChinhThuc);
  if ((a.uuTien || 0) !== (b.uuTien || 0)) out.push(`Ưu tiên: ${a.uuTien || 0} → ${b.uuTien || 0}`);
  return out.join("\n");
}

/* ---- Kết quả từng nguyện vọng + công cụ "cần bao nhiêu điểm" ---- */
function ketQua(m, noiBo) {
  const nvs = nvCua(m), hs = hsCua(m), nb = D.nb[m] || {};
  if (!nvs.some(Boolean)) return `<section class="card"><h2 class="vh-h2">Điểm xét tuyển dự kiến</h2><p class="muted">Chọn nguyện vọng và lưu để xem điểm xét tuyển.</p></section>`;
  return `<section class="xt-kq" aria-label="Điểm xét tuyển theo nguyện vọng"><h2 class="vh-h2">Điểm xét tuyển ${noiBo ? "& đánh giá" : "dự kiến"}</h2>
    ${nvs.map((nv, i) => theNV(m, nv, i + 1, hs, nb, noiBo)).join("")}${CHU_Y}</section>`;
}
function theNV(m, nv, i, hs, nb, noiBo) {
  if (!nv) return `<div class="card xt-nv-kq"><b>Nguyện vọng ${i}</b><p class="muted">Chưa chọn.</p></div>`;
  if (nv.chuaXacDinh) return `<div class="card xt-nv-kq"><b>Nguyện vọng ${i}: Chưa xác định</b><p class="muted">Khi chọn được trường, ngành, web sẽ tính điểm theo công thức của trường đó.</p></div>`;
  const c = cfgCua(nv.cauHinh), kq = T.tinhTong(c, hs), mt = ((nb.mucTieu || {}).tong || {})["nv" + i];
  const md = noiBo ? T.mucDo(kq, T.coDiem(mt) ? mt : undefined) : null;
  const ref = T.coDiem(mt) ? mt : kq.diemChuan ? kq.diemChuan.diem : null;
  const cai = noiBo && kq.ok ? T.monCanCaiThien(c, kq, ref, (nb.mucTieu || {}).mon || {}) : [];
  const dau = `<div class="vh-dong"><b>NV${i}: ${esc(nv.truong || "?")} · ${esc(nv.nganh || "?")}</b>${noiBo && md ? `<span class="chip ${({ nhieu: "bad", gan: "warn", dat: "ok", cao: "ok", chua: "" })[md.ma]}">${esc(md.ten)}</span>` : ""}</div>
    <p class="muted"><small>${esc([nv.maNganh, nv.toHop, T.PHUONG_THUC[nv.phuongThuc] || nv.phuongThuc, T.TRANG_THAI_NV[nv.trangThai]].filter(Boolean).join(" · "))}</small></p>`;
  if (!c) return `<div class="card xt-nv-kq">${dau}<p class="xt-chua">Chưa đủ dữ liệu tính điểm: trường/ngành này chưa có công thức trên web.</p></div>`;
  const ct = (kq.chiTiet || []).map(x => `<tr><td>${esc(x.ten)}${x.heSo !== 1 ? ` <small>×${F(x.heSo)}</small>` : ""}</td><td><small>${esc(T.NGUON[x.nguon]?.ten || "")}${x.nguonDK ? " · " + esc(x.nguonDK) : ""}</small></td><td class="num"><b>${F(x.v)}</b> ${chipLoai(x.loai)}</td></tr>`).join("");
  if (!kq.ok) return `<div class="card xt-nv-kq">${dau}<p class="xt-chua">${esc(kq.ly)}</p>${kq.thieu && kq.thieu.length ? `<p class="muted"><small>Còn thiếu: ${esc(kq.thieu.join(", "))}</small></p>` : ""}${ct ? `<table class="xt-bang">${ct}</table>` : ""}${T.dungDuoc(c) ? congCu(m, c, i, hs, nb, noiBo) : ""}</div>`;
  const dc = kq.diemChuan;
  return `<div class="card xt-nv-kq">${dau}
    <div class="xt-so"><div><small>Tổng điểm xét tuyển${kq.duKien ? " (dự kiến)" : ""}</small><b class="num">${F(kq.tong, c.lamTron ?? 2)}</b><small>thang ${F(kq.thang)}${kq.uuTien ? ` · gồm ưu tiên ${F(kq.uuTien)}` : ""}</small></div>
      <div><small>Điểm chuẩn tham khảo</small><b class="num">${dc ? F(dc.diem) : "—"}</b><small>${dc ? "năm " + dc.nam + (dc.ghiChu ? " · " + esc(dc.ghiChu) : "") : "chưa có số liệu"}</small></div>
      ${noiBo && T.coDiem(mt) ? `<div><small>Mục tiêu giáo viên đặt</small><b class="num">${F(mt)}</b></div>` : ""}
      <div class="${kq.chenh === null ? "" : kq.chenh < 0 ? "thieu" : "du"}"><small>Chênh lệch</small><b class="num">${kq.chenh === null ? "—" : kq.chenh < 0 ? "Thiếu " + F(-kq.chenh) : "Cao hơn " + F(kq.chenh)}</b><small>${kq.chenh === null ? "" : "so với điểm chuẩn tham khảo"}</small></div></div>
    <table class="xt-bang">${ct}</table>
    ${kq.dieuKien.length ? `<ul class="xt-dk">${kq.dieuKien.map(d => `<li class="${d.dat ? "ok" : d.dat === false ? "bad" : ""}">${d.dat ? "✓" : d.dat === false ? "✗" : "•"} Điều kiện ${esc(d.ten)} ≥ ${F(d.toiThieu)}${T.coDiem(d.v) ? ` (hiện ${F(d.v)})` : " (chưa có điểm)"}</li>`).join("")}</ul>` : ""}
    ${noiBo && cai.length ? `<p class="xt-cai">Môn cần cải thiện: <b>${cai.map(x => esc(T.tenMon(x))).join(", ")}</b></p>` : ""}
    ${congCu(m, c, i, hs, nb, noiBo)}</div>`;
}
// "CẦN BAO NHIÊU ĐIỂM ĐỂ ĐẠT MỤC TIÊU?" — mỗi môn: ô điểm + "cố định"; giáo viên lưu mục tiêu từng môn (không đổi điểm gốc)
function congCu(m, c, i, hs, nb, noiBo) {
  const key = `${m}|${i}`, st = CC[key] ||= { mo: false };
  const mt = ((nb.mucTieu || {}).tong || {})["nv" + i], dc = T.diemChuanThamChieu(c);
  if (!st.mo) return `<button type="button" class="btn small xt-cc-mo" data-xt="cc-mo" data-k="${esc(key)}">🎯 Cần bao nhiêu điểm để đạt mục tiêu?</button>`;
  const mtm = (nb.mucTieu || {}).mon || {};
  const dong = c.mon.map(x => { const d = T.diemMon(hs, x.ma, x.nguon), coSan = d.loai === "chinhthuc" && T.coDiem(d.v);
    const v = st.gia && x.ma in st.gia ? st.gia[x.ma] : coSan ? String(d.v).replace(".", ",") : "";
    const cd = st.cd && x.ma in st.cd ? st.cd[x.ma] : coSan;
    return `<tr><td>${esc(T.tenMon(x.ma))}${+x.heSo !== 1 ? ` <small>×${F(x.heSo)}</small>` : ""}</td>
      <td><input class="xt-cc-o" data-cc="gia" data-ma="${x.ma}" data-k="${esc(key)}" inputmode="decimal" maxlength="5" value="${esc(v)}" aria-label="Điểm ${esc(T.tenMon(x.ma))}"></td>
      <td><label class="xt-cd"><input type="checkbox" data-cc="cd" data-ma="${x.ma}" data-k="${esc(key)}"${cd ? " checked" : ""}> cố định</label></td>
      ${noiBo ? `<td><input class="xt-cc-o" data-cc="mtm" data-ma="${x.ma}" data-k="${esc(key)}" inputmode="decimal" maxlength="5" value="${esc(st.mtm && x.ma in st.mtm ? st.mtm[x.ma] : T.coDiem(mtm[x.ma]) ? String(mtm[x.ma]).replace(".", ",") : "")}" aria-label="Mục tiêu ${esc(T.tenMon(x.ma))}"></td>` : ""}</tr>`; }).join("");
  const mucTieu = st.mt ?? (T.coDiem(mt) ? String(mt).replace(".", ",") : dc ? String(dc.diem).replace(".", ",") : "");
  return `<div class="xt-cc" data-giu><b>🎯 Cần bao nhiêu điểm để đạt mục tiêu?</b>
    <label class="xt-cc-mt"><span>Tổng điểm mục tiêu</span><input data-cc="mt" data-k="${esc(key)}" inputmode="decimal" maxlength="5" value="${esc(mucTieu)}"></label>
    <table class="xt-bang xt-cc-bang"><thead><tr><th>Môn</th><th>Điểm</th><th></th>${noiBo ? "<th>Mục tiêu môn</th>" : ""}</tr></thead><tbody>${dong}</tbody></table>
    <p class="muted"><small>Tick <b>cố định</b> cho môn đã có điểm hoặc giữ nguyên; môn không tick là môn cần tính. Đây là phép thử, không đổi điểm đã lưu.</small></p>
    <div class="xt-cc-kq" id="cc-kq-${esc(key.replace(/[^a-z0-9]/gi, ""))}">${ketQuaCC(m, c, i, hs, key)}</div>
    ${noiBo ? `<button type="button" class="btn small primary" data-xt="cc-luu" data-k="${esc(key)}">Lưu mục tiêu cho học viên</button>` : ""}
    <button type="button" class="btn small" data-xt="cc-dong" data-k="${esc(key)}">Thu gọn</button></div>`;
}
const CC = {};
function ketQuaCC(m, c, i, hs, key) {
  const st = CC[key] || {}, coDinh = {}, mtm = {}, loi = [];
  const mt = T.soDiem(st.mt ?? ""), dsMon = c.mon.map(x => x.ma);
  const nb = D.nb[m] || {}, luuMtm = (nb.mucTieu || {}).mon || {};
  dsMon.forEach(ma => {
    const d = T.diemMon(hs, ma, c.mon.find(x => x.ma === ma).nguon), coSan = d.loai === "chinhthuc" && T.coDiem(d.v);
    const raw = st.gia && ma in st.gia ? st.gia[ma] : coSan ? d.v : "", v = T.soDiem(raw);
    const cd = st.cd && ma in st.cd ? st.cd[ma] : coSan;
    if (Number.isNaN(v) || (T.coDiem(v) && !T.hopLeDiem(v))) loi.push(`Điểm ${T.tenMon(ma)} không hợp lệ.`);
    else if (cd) { if (T.coDiem(v)) coDinh[ma] = v; else loi.push(`${T.tenMon(ma)} được tick cố định nhưng chưa có điểm.`); }
    const t = T.soDiem(st.mtm && ma in st.mtm ? st.mtm[ma] : luuMtm[ma] ?? ""); if (T.coDiem(t) && T.hopLeDiem(t)) mtm[ma] = t;
  });
  if (st.mt === undefined && !T.coDiem(mt)) { const dc = T.diemChuanThamChieu(c), mtl = ((nb.mucTieu || {}).tong || {})["nv" + i]; const g = T.coDiem(mtl) ? mtl : dc ? dc.diem : null; if (T.coDiem(g)) return veKQCC(T.canDat(c, hs, g, coDinh, mtm), c, loi); }
  if (Number.isNaN(mt) || mt === null) return `<p class="muted">Nhập tổng điểm mục tiêu.</p>`;
  return veKQCC(T.canDat(c, hs, mt, coDinh, mtm), c, loi);
}
function veKQCC(r, c, loi) {
  if (loi.length) return `<p class="xt-chua">${loi.map(esc).join("<br>")}</p>`;
  if (!r.ok) return `<p class="xt-chua">${esc(r.ly)}</p>`;
  if (!r.an.length) return `<p>${r.dat ? "✓ Với các điểm đã cố định, tổng " + F(r.tongHienTai) + " đạt mục tiêu." : "Tổng hiện tại " + F(r.tongHienTai) + " chưa đạt mục tiêu. Bỏ tick cố định ở môn có thể cải thiện để tính."}</p>`;
  return `${r.khaThi ? "" : `<p class="xt-chua">⚠ Mục tiêu không khả thi theo phương án hiện tại (môn còn lại phải trên 10 điểm).</p>`}
    <ul class="xt-pa">${r.phuongAn.map(p => `<li class="${p.khaThi ? "" : "bad"}"><b>${esc(p.ten)}</b>${p.khaThi ? `<span>${Object.entries(p.mon).map(([ma, v]) => `${esc(T.tenMon(ma))}: <b class="num">${F(v)}</b>${v > 0 ? ` <small>(làm tròn lên ${F(Math.ceil(v * 4 - 1e-9) / 4)})</small>` : ""}`).join(" · ")}</span>` : "<span>Không khả thi</span>"}</li>`).join("")}</ul>
    ${r.an.length > 1 && r.phuongAn.length === 1 ? `<p class="muted"><small>Còn ${r.an.length} môn chưa có điểm nên chỉ đưa phương án các môn bằng nhau. Giáo viên đặt mục tiêu từng môn để xem thêm phương án.</small></p>` : ""}`;
}

/* ---- Năng khiếu (học viên xem) ---- */
function nkHV(m) {
  const ds = D.nk.filter(x => x.mail === m).sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));
  const mon = [...new Set(ds.map(x => x.mon))];
  return `<section class="card"><h2 class="vh-h2">Điểm năng khiếu của em</h2>
    ${mon.length ? `<div class="xt-nk-tk">${mon.map(ma => theNK(T.thongKeNK(ds, ma), ma)).join("")}</div>${bangNK(ds, false)}`
      : `<p class="muted">Chưa có điểm thi thử năng khiếu. Anh chị sẽ ghi điểm sau mỗi lần thi thử.</p>`}
    <p class="muted"><small>Điểm thi thử và kiểm tra trên lớp chỉ để theo dõi tiến bộ; điểm bài tập hằng ngày không dùng làm điểm xét tuyển.</small></p></section>`;
}
const LOAI_NK = { thithu: "Thi thử", trenlop: "Đánh giá trên lớp", chinhthuc: "Thi chính thức" };
function theNK(tk, ma) {
  return `<div class="xt-nk-o"><b>${esc(T.tenMon(ma))}</b>
    <span>Gần nhất <b class="num">${tk.ganNhat ? F(tk.ganNhat.diem) : "—"}</b></span><span>Cao nhất <b class="num">${F(tk.caoNhat)}</b></span>
    <span>TB thi thử hợp lệ <b class="num">${F(tk.tb)}</b> <small>(${tk.soBai} bài)</small></span>
    ${T.coDiem(tk.xuHuong) ? `<span>Xu hướng <b class="num ${tk.xuHuong >= 0 ? "cc-cong" : "cc-tru"}">${tk.xuHuong >= 0 ? "↑ +" : "↓ "}${F(tk.xuHuong)}</b></span>` : ""}
    ${T.coDiem(tk.chinhThuc) ? `<span>Chính thức <b class="num">${F(tk.chinhThuc)}</b></span>` : ""}</div>`;
}
function bangNK(ds, sua) {
  if (!ds.length) return "";
  return `<div class="xt-nk-ds">${ds.map(x => `<div class="xt-nk-dong${x.hopLe === false ? " khong" : ""}"><div><b>${esc(T.tenMon(x.mon))} · <span class="num">${F(x.diem)}</span></b> <span class="chip ${x.loai === "chinhthuc" ? "ok" : "line"}">${LOAI_NK[x.loai] || x.loai}</span>${x.hopLe === false ? ' <span class="chip">Không tính</span>' : ""}
      <small>${ngayVN(x.ngay)}${x.deTruong ? " · " + esc(x.deTruong) : ""}${x.phut ? " · " + x.phut + " phút" : ""}${x.gvCham ? " · chấm: " + esc(x.gvCham) : ""}${x.ghiChu ? " · " + esc(x.ghiChu) : ""}</small></div>
      ${sua ? `<div class="vh-nut"><button type="button" class="btn small" data-xt="nk-sua" data-id="${esc(x.id)}">Sửa</button>${x.loai !== "chinhthuc" ? `<button type="button" class="btn small" data-xt="nk-hople" data-id="${esc(x.id)}">${x.hopLe === false ? "Tính lại" : "Không tính"}</button>` : ""}</div>` : ""}</div>`).join("")}</div>`;
}

/* ================= Giáo viên, quản lý: danh sách ================= */
function dongDS(h) {
  const m = h.id, ho = D.ho[m], nb = D.nb[m] || {}, ht = hoanThanh(m), hs = hsCua(m), nvs = nvCua(m);
  const kqs = nvs.map((nv, i) => { if (!nv || nv.chuaXacDinh) return null; const c = cfgCua(nv.cauHinh); const kq = T.tinhTong(c, hs); const mt = ((nb.mucTieu || {}).tong || {})["nv" + (i + 1)];
    const ref = T.coDiem(mt) ? mt : kq.diemChuan ? kq.diemChuan.diem : null;
    return { nv, c, kq, md: T.mucDo(kq, T.coDiem(mt) ? mt : undefined), cai: kq.ok ? T.monCanCaiThien(c, kq, ref, (nb.mucTieu || {}).mon || {}) : [] }; });
  const nk = Object.keys(T.MON_NK).map(ma => [ma, T.thongKeNK(D.nk.filter(x => x.mail === m), ma)]).filter(([, t]) => t.soBai || T.coDiem(t.chinhThuc));
  const hb = kqs.filter(k => k && k.kq.chiTiet).flatMap(k => k.kq.chiTiet.filter(x => !T.laNK(x.ma) && x.nguon !== "thpt" && T.coDiem(x.v))).filter((x, i, a) => a.findIndex(y => y.ma === x.ma && y.nguon === x.nguon) === i);
  const thu = { nhieu: 0, gan: 1, chua: 2, dat: 3, cao: 4 }, md = kqs.filter(Boolean).map(k => k.md);
  const uuTien = !ht.coHo ? -2 : !ht.xong ? -1 : md.length ? Math.min(...md.map(x => thu[x.ma])) : 2;
  const gap = Math.min(...kqs.filter(k => k && k.kq.ok && k.kq.chenh !== null).map(k => k.kq.chenh), 99);
  return { h, m, ho, ht, kqs, nk, hb, uuTien, gap, khoi: nvs.map(nv => T.khoiToHop(nv && nv.toHop)).filter(Boolean),
    truong: nvs.map(nv => nv && nv.truong).filter(Boolean), nganh: nvs.map(nv => nv && nv.nganh).filter(Boolean), capNhat: ho ? ho.capNhat : 0 };
}
function locDS(ds) {
  const q = bo(loc.q);
  return ds.filter(r => (!q || bo(r.h.ten).includes(q)) && (!loc.cs || (r.h.coso || "") === loc.cs) && (!loc.truong || r.truong.includes(loc.truong))
    && (!loc.nganh || r.nganh.includes(loc.nganh)) && (!loc.khoi || r.khoi.includes(loc.khoi))
    && (loc.tt !== "chuaxong" || !r.ht.xong) && (loc.tt !== "thieu" || r.gap < 0))
    .sort((a, b) => loc.sx === "ten" ? String(a.h.ten).localeCompare(String(b.h.ten), "vi") : loc.sx === "capnhat" ? (b.capNhat || 0) - (a.capNhat || 0)
      : a.uuTien - b.uuTien || a.gap - b.gap || String(a.h.ten).localeCompare(String(b.h.ten), "vi"));
}
function danhSach() {
  const pv = phamVi();
  if (!C.isAdmin && !pv.length) return `<div class="vh-loi"><b>Anh/chị chưa được phân phạm vi học viên.</b><p>Quản lý vào mục Xét tuyển → <b>Phân phạm vi giáo viên</b> để gán cơ sở anh/chị phụ trách.</p></div>`;
  const all = hvDs().map(dongDS), ds = locDS(all);
  const truongs = [...new Set(all.flatMap(r => r.truong))].sort(), nganhs = [...new Set(all.flatMap(r => r.nganh))].sort();
  const sel = (k, ds_, nhan) => `<label><span>${nhan}</span><select data-loc="${k}">${ds_.map(([v, t]) => `<option value="${esc(v)}"${loc[k] === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
  const dem = { chua: all.filter(r => !r.ht.xong).length, thieu: all.filter(r => r.gap < 0).length };
  return `<p class="muted">${C.isAdmin ? "Toàn bộ học viên hai cơ sở." : `Học viên thuộc phạm vi: <b>${esc(pv.includes("tatca") ? "tất cả cơ sở" : pv.join(", "))}</b>.`} ${all.length} học viên · <b>${dem.chua}</b> chưa đủ hồ sơ · <b>${dem.thieu}</b> đang thiếu điểm so với tham chiếu.</p>
    ${C.isAdmin ? quanLyHTML() : ""}
    <div class="xt-loc" data-giu>
      <label class="xt-tim"><span>Tìm học viên</span><input type="search" data-loc="q" value="${esc(loc.q)}" placeholder="Gõ tên, có dấu hoặc không"></label>
      ${sel("cs", [["", "Mọi cơ sở"], ...CO_SO.filter(c => C.isAdmin || pv.includes("tatca") || pv.includes(c)).map(c => [c, c])], "Cơ sở")}
      ${sel("truong", [["", "Mọi trường"], ...truongs.map(t => [t, t])], "Trường")}${sel("nganh", [["", "Mọi ngành"], ...nganhs.map(t => [t, t])], "Ngành")}
      ${sel("khoi", [["", "Khối H và V"], ["H", "Tổ hợp H"], ["V", "Tổ hợp V"]], "Tổ hợp")}
      ${sel("tt", [["", "Tất cả"], ["chuaxong", "Chưa điền đủ hồ sơ"], ["thieu", "Đang thiếu điểm"]], "Tình trạng")}
      ${sel("sx", [["can", "Cần hỗ trợ trước"], ["ten", "Tên A–Z"], ["capnhat", "Mới cập nhật"]], "Sắp xếp")}</div>
    <div class="vh-nut"><button type="button" class="btn small" data-xt="xuat">⬇ Xuất báo cáo (CSV, mở bằng Excel)</button>${C.isAdmin ? `<button type="button" class="btn small" data-xt="tb-yeucau">📣 Gửi thông báo yêu cầu bổ sung</button>` : ""}</div>
    <p class="muted"><small>Đang hiện ${ds.length}/${all.length} học viên.</small></p>
    <div class="xt-ds">${ds.length ? ds.map(theDS).join("") : '<p class="muted vh-trong">Không có học viên phù hợp bộ lọc.</p>'}</div>`;
}
function theDS(r) {
  const { h, ht, kqs, nk, hb } = r, nvTxt = (k, i) => { const nv = nvCua(r.m)[i]; return !nv ? "—" : nv.chuaXacDinh ? "Chưa xác định" : `${esc(nv.truong)} · ${esc(nv.nganh)}${nv.toHop ? " · " + esc(nv.toHop) : ""}`; };
  const kqTxt = k => !k ? "—" : k.kq.ok ? `<b class="num">${F(k.kq.tong)}</b>${k.kq.duKien ? " <small>dự kiến</small>" : ""}${k.kq.chenh !== null ? ` <small class="${k.kq.chenh < 0 ? "cc-tru" : "cc-cong"}">(${k.kq.chenh < 0 ? "thiếu " + F(-k.kq.chenh) : "+" + F(k.kq.chenh)})</small>` : ""}` : `<small class="muted">${k.c ? "chưa đủ dữ liệu" : "chưa có công thức"}</small>`;
  const md = kqs.filter(Boolean).map(k => k.md)[0], cai = [...new Set(kqs.filter(Boolean).flatMap(k => k.cai))];
  return `<article class="card xt-the"><div class="vh-dong"><b>${esc(h.ten || h.id)}</b><span class="chip ${ht.xong ? "ok" : "warn"}">${ht.xong ? "Đủ hồ sơ" : `Hồ sơ ${ht.so}/${ht.tong}`}</span></div>
    <small class="muted">${esc(h.coso || "—")} · ${esc(h.chuongTrinh || h.lop || "")}${h.lopHoc ? " · " + esc(h.lopHoc) : ""}</small>
    <dl class="xt-dl"><div><dt>NV1</dt><dd>${nvTxt(kqs[0], 0)}</dd></div><div><dt>NV2</dt><dd>${nvTxt(kqs[1], 1)}</dd></div>
      <div><dt>Tổng điểm NV1</dt><dd>${kqTxt(kqs[0])}</dd></div><div><dt>Tổng điểm NV2</dt><dd>${kqTxt(kqs[1])}</dd></div>
      <div><dt>Học bạ liên quan</dt><dd>${hb.length ? hb.map(x => `${esc(x.ten)} <b class="num">${F(x.v)}</b>`).join(" · ") : "—"}</dd></div>
      <div><dt>Năng khiếu</dt><dd>${nk.length ? nk.map(([ma, t]) => `${esc(T.tenMon(ma))} <b class="num">${F(T.coDiem(t.chinhThuc) ? t.chinhThuc : t.tb)}</b>${T.coDiem(t.chinhThuc) ? " <small>CT</small>" : " <small>TB thử</small>"}`).join(" · ") : "—"}</dd></div>
      <div><dt>Mức đáp ứng</dt><dd>${md ? esc(md.ten) : "—"}</dd></div><div><dt>Môn cần cải thiện</dt><dd>${cai.length ? cai.map(x => esc(T.tenMon(x))).join(", ") : "—"}</dd></div>
      <div><dt>Cập nhật gần nhất</dt><dd>${r.capNhat ? esc(luc(r.capNhat)) : "Chưa có hồ sơ"}</dd></div></dl>
    <div class="vh-nut"><button type="button" class="btn small primary" data-xt="xem" data-m="${esc(r.m)}">Xem & đánh giá</button>${ht.xong ? "" : `<button type="button" class="btn small" data-xt="nhac" data-m="${esc(r.m)}">Nhắc bổ sung</button>`}</div></article>`;
}

/* ================= Chi tiết một học viên (giáo viên, quản lý) ================= */
let lsHuy = null;
function nghiLichSu(m) {
  if (D.lsMail === m) return; if (lsHuy) { lsHuy(); lsHuy = null; }
  D.lsMail = m; D.ls = [];
  const { db, fs: { collection, onSnapshot } } = C;
  lsHuy = onSnapshot(collection(db, `xettuyen/${m}/lichsu`), s => { D.ls = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.luc - a.luc); ve(); }, () => {});
}
function chiTiet(m) {
  nghiLichSu(m);
  const h = hvCua(m), ht = hoanThanh(m), nb = D.nb[m] || {}, ds = D.nk.filter(x => x.mail === m).sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)) || (b.luc || 0) - (a.luc || 0));
  const mon = [...new Set(ds.map(x => x.mon))];
  return `<div class="vh-nut xt-dau"><button type="button" class="btn small" data-xt="ve-ds">‹ Danh sách</button>${ht.xong ? "" : `<button type="button" class="btn small" data-xt="nhac" data-m="${esc(m)}">Nhắc bổ sung</button>`}
      <button type="button" class="btn small" data-xt="mo-sua">${sua ? "Đang sửa hồ sơ" : "✏️ Sửa hồ sơ giúp học viên"}</button></div>
    <h2 class="xt-ten">${esc(h.ten)} <small class="muted">${esc(h.coso || "")}${h.lopHoc ? " · " + esc(h.lopHoc) : ""}${h.chuongTrinh ? " · " + esc(h.chuongTrinh) : ""}</small></h2>
    ${theTinhTrang(ht, false)}
    ${sua ? formHoSo(m) : tomHoSo(m)}
    ${ketQua(m, true)}
    <section class="card"><h2 class="vh-h2">Điểm năng khiếu</h2>
      <div class="vh-nut"><button type="button" class="btn small primary" data-xt="nk-them">+ Ghi điểm năng khiếu</button>
        <label class="xt-inline"><span>Điểm dự kiến lấy theo</span><select data-xt="nk-coso">${[["tb", "TB thi thử hợp lệ"], ["gannhat", "Bài thi thử gần nhất"], ["caonhat", "Bài thi thử cao nhất"]].map(([v, t]) => `<option value="${v}"${(nb.nkCoSo || "tb") === v ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
      ${mon.length ? `<div class="xt-nk-tk">${mon.map(ma => theNK(T.thongKeNK(ds, ma), ma)).join("")}</div>` : '<p class="muted">Chưa có điểm năng khiếu.</p>'}
      ${bangNK(ds, true)}</section>
    ${noiBoHTML(m, nb)}
    <section class="card"><h2 class="vh-h2">Lịch sử cập nhật</h2>${lichSuHTML(m, ds)}</section>`;
}
function tomHoSo(m) {
  const ho = D.ho[m]; if (!ho) return `<section class="card"><p class="muted">Học viên chưa điền hồ sơ xét tuyển.</p></section>`;
  const hb = Object.entries(ho.hocBa || {}).map(([ma, o]) => `<li><b>${esc(T.tenMon(ma))}</b> ${Object.entries(o).sort().map(([k, v]) => `<span>${esc(T.TEN_KY(k))}: <b class="num">${F(v)}</b></span>`).join(" ")}</li>`).join("");
  const thpt = Object.entries(ho.thpt || {}).map(([ma, o]) => `<span>${esc(T.tenMon(ma))}: <b class="num">${F(o.v)}</b> ${chipLoai(o.loai)}</span>`).join(" ");
  return `<section class="card"><h2 class="vh-h2">Hồ sơ học viên khai</h2>
    <p>Năm dự thi: <b>${esc(ho.namThi || "—")}</b>${ho.uuTien ? ` · Điểm ưu tiên: <b class="num">${F(ho.uuTien)}</b>` : ""}</p>
    ${hb ? `<ul class="xt-hb-tom">${hb}</ul>` : '<p class="muted">Chưa có điểm học bạ.</p>'}${thpt ? `<p>Điểm thi THPT: ${thpt}</p>` : ""}
    ${Object.keys(ho.nkChinhThuc || {}).length ? `<p>Năng khiếu chính thức (học viên khai): ${Object.entries(ho.nkChinhThuc).map(([ma, v]) => `${esc(T.tenMon(ma))} <b class="num">${F(v)}</b>`).join(" · ")}</p>` : ""}</section>`;
}
function noiBoHTML(m, nb) {
  const xm = nb.xacMinh || {}, hs = hsCua(m), cfgs = nvCua(m).map(nv => nv && cfgCua(nv.cauHinh)).filter(Boolean);
  const mon = [...new Set(cfgs.flatMap(c => c.mon.filter(x => x.nguon === "thpt" || x.nguon === "nk").map(x => x.ma)))];
  return `<form class="card xt-nb" id="xt-nb" data-giu novalidate data-mail="${esc(m)}"><h2 class="vh-h2">Đánh giá nội bộ <span class="chip line">Học viên không xem được</span></h2>
    <div class="fgrid">${[1, 2].map(i => `<label><span>Mục tiêu tổng điểm NV${i}</span><input data-nb="mt.nv${i}" inputmode="decimal" maxlength="5" value="${esc(T.coDiem(((nb.mucTieu || {}).tong || {})["nv" + i]) ? String(nb.mucTieu.tong["nv" + i]).replace(".", ",") : "")}" placeholder="Để trống = theo điểm chuẩn"></label>`).join("")}</div>
    ${mon.length ? `<p class="muted"><small>Điểm <b>ước tính của giáo viên</b> cho môn chưa có điểm chính thức (dùng để tính tổng dự kiến; không thay điểm học viên đã nhập).</small></p>
      <div class="xt-hb-o">${mon.map(ma => `<label class="xt-o"><span>${esc(T.tenMon(ma))}</span><input data-nb="dk.${ma}" inputmode="decimal" maxlength="5" value="${esc(T.coDiem((nb.duKien || {})[ma]) ? String(nb.duKien[ma]).replace(".", ",") : "")}"></label>`).join("")}</div>` : ""}
    <fieldset class="xt-xm"><legend>Xác minh thông tin học viên khai</legend>${[["nv", "Nguyện vọng"], ["hocba", "Điểm học bạ (đã đối chiếu học bạ)"], ["thpt", "Điểm thi THPT"], ["uutien", "Điểm ưu tiên"]].map(([k, t]) => `<label class="vh-check"><input type="checkbox" data-nb="xm.${k}"${xm[k] ? " checked" : ""}> ${t}</label>`).join("")}</fieldset>
    <label><span>Nhận xét riêng, kế hoạch học tập</span><textarea data-nb="nhanXet" maxlength="2000" rows="3">${esc(nb.nhanXet || "")}</textarea></label>
    <p class="status" id="xt-nb-st"></p><button type="submit" class="btn primary">Lưu đánh giá</button>
    ${nb.capNhat ? `<small class="muted">Cập nhật ${esc(luc(nb.capNhat))} bởi ${esc(nb.capNhatTen || nb.capNhatBoi || "")}</small>` : ""}</form>`;
}
async function luuNoiBo(f, btn, them = {}) {
  const m = f ? f.dataset.mail : xem, nb = D.nb[m] || {}, st = $("#xt-nb-st"), loi = [], hv = hvCua(m);
  const data = { mucTieu: { tong: { ...((nb.mucTieu || {}).tong || {}) }, mon: { ...((nb.mucTieu || {}).mon || {}) } }, duKien: { ...(nb.duKien || {}) }, xacMinh: { ...(nb.xacMinh || {}) }, nhanXet: nb.nhanXet || "", nkCoSo: nb.nkCoSo || "tb" };
  if (f) f.querySelectorAll("[data-nb]").forEach(i => { const [a, b] = i.dataset.nb.split(".");
    if (a === "xm") { data.xacMinh[b] = i.checked; return; }
    if (a === "nhanXet") { data.nhanXet = i.value.slice(0, 2000); return; }
    const v = T.soDiem(i.value), max = a === "mt" ? 40 : 10;
    if (Number.isNaN(v) || (v !== null && !(v >= 0 && v <= max))) { loi.push(`Ô “${i.closest("label").querySelector("span").textContent}”: điểm không hợp lệ.`); return; }
    const o = a === "mt" ? data.mucTieu.tong : data.duKien; if (v === null) delete o[b]; else o[b] = v; });
  if (them.mucTieu) { Object.assign(data.mucTieu.tong, them.mucTieu.tong || {}); data.mucTieu.mon = { ...data.mucTieu.mon, ...(them.mucTieu.mon || {}) }; Object.keys(data.mucTieu.mon).forEach(k => data.mucTieu.mon[k] === null && delete data.mucTieu.mon[k]); }
  if (them.nkCoSo) data.nkCoSo = them.nkCoSo;
  if (loi.length) { if (st) { st.className = "status err"; st.textContent = loi.join(" "); } return C.toast(loi[0], "err"); }
  const { db, fs: { doc, setDoc } } = C;
  if (btn) btn.disabled = true;
  try { await setDoc(doc(db, "xtnoibo", m), { ...data, coSo: hv.coso || "", phienBan: (nb.phienBan || 0) + 1, capNhat: Date.now(), capNhatBoi: C.mail, capNhatTen: C.ten });
    D.nb[m] = { ...data, id: m, coSo: hv.coso || "", phienBan: (nb.phienBan || 0) + 1, capNhat: Date.now(), capNhatBoi: C.mail, capNhatTen: C.ten };
    C.toast("Đã lưu đánh giá ✓"); ve(); }
  catch (e) { const t = e && e.code === "permission-denied" ? "Chưa lưu được: có người vừa cập nhật đánh giá này hoặc anh/chị không thuộc phạm vi. Tải lại để xem bản mới." : "Chưa lưu được, kiểm tra mạng rồi thử lại.";
    if (st) { st.className = "status err"; st.textContent = t; } C.toast(t, "err"); }
  finally { if (btn) btn.disabled = false; }
}
function lichSuHTML(m, nk) {
  const ds = [...D.ls.map(x => ({ luc: x.luc, ai: x.ten || x.ai, nd: x.tom })),
    ...nk.map(x => ({ luc: x.suaLuc || x.luc, ai: x.suaTen || x.tenNguoi || x.nguoi, nd: `${x.suaLuc ? "Sửa" : "Ghi"} điểm năng khiếu ${T.tenMon(x.mon)} (${LOAI_NK[x.loai]}) ngày ${ngayVN(x.ngay)}: ${F(x.diem)}${x.diemCu !== undefined && x.suaLuc ? ` (trước: ${F(x.diemCu)})` : ""}${x.hopLe === false ? " · đánh dấu không tính" : ""}` }))].sort((a, b) => b.luc - a.luc);
  return ds.length ? `<ul class="xt-ls">${ds.slice(0, 60).map(x => `<li><small class="muted">${esc(luc(x.luc))} · ${esc(x.ai || "")}</small><span>${esc(x.nd).replace(/\n/g, "<br>")}</span></li>`).join("")}</ul>` : '<p class="muted">Chưa có lịch sử.</p>';
}
function moFormNK(x) {
  const m = xem, hv = hvCua(m), { db, fs: { doc, setDoc, collection } } = C;
  const h = C.moHop(`<h3>${x ? "Sửa" : "Ghi"} điểm năng khiếu · ${esc(hv.ten)}</h3>
    <div class="fgrid"><label>Môn<select id="nk-mon">${Object.entries(T.MON_NK).map(([k, v]) => `<option value="${k}"${x && x.mon === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
    <label>Loại điểm<select id="nk-loai">${Object.entries(LOAI_NK).map(([k, v]) => `<option value="${k}"${(x ? x.loai : "thithu") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Điểm (0–10)<input id="nk-diem" inputmode="decimal" maxlength="5" value="${esc(x ? String(x.diem).replace(".", ",") : "")}"></label>
    <label>Ngày kiểm tra<input id="nk-ngay" type="date" max="${C.homNay()}" value="${esc(x ? x.ngay : C.homNay())}"></label>
    <label>Đề / trường tham chiếu<input id="nk-de" maxlength="120" value="${esc(x?.deTruong || "")}" placeholder="VD: Đề kiểu HAU, tượng Đavít"></label>
    <label>Thời gian làm bài (phút)<input id="nk-phut" type="number" min="0" max="600" value="${esc(x?.phut || "")}"></label>
    <label>Giáo viên chấm<input id="nk-gv" maxlength="80" value="${esc(x?.gvCham || C.ten)}"></label></div>
    <label>Ghi chú (học viên xem được)<input id="nk-gc" maxlength="300" value="${esc(x?.ghiChu || "")}"></label>
    <p class="muted"><small>Chỉ ghi điểm bài thi thử, kiểm tra năng khiếu có chấm theo thang thi. Không ghi điểm bài tập hằng ngày.</small></p>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="nk-luu">Lưu điểm</button></div>`, "Điểm năng khiếu");
  h.el.querySelector("#nk-luu").onclick = async e => {
    const diem = T.soDiem(h.el.querySelector("#nk-diem").value), ngay = h.el.querySelector("#nk-ngay").value, phut = Math.round(+h.el.querySelector("#nk-phut").value || 0);
    if (!T.hopLeDiem(diem)) return C.toast("Điểm phải từ 0 đến 10 (VD 7,5).", "err");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || ngay > C.homNay()) return C.toast("Chọn ngày kiểm tra (không quá hôm nay).", "err");
    if (!(phut >= 0 && phut <= 600)) return C.toast("Thời gian làm bài từ 0 đến 600 phút.", "err");
    const data = { mail: m, ten: hv.ten || m, coSo: hv.coso || "", mon: h.el.querySelector("#nk-mon").value, loai: h.el.querySelector("#nk-loai").value, diem, ngay, phut,
      deTruong: h.el.querySelector("#nk-de").value.trim(), gvCham: h.el.querySelector("#nk-gv").value.trim(), ghiChu: h.el.querySelector("#nk-gc").value.trim(),
      hopLe: x ? x.hopLe !== false : true, nguoi: x ? x.nguoi : C.mail, tenNguoi: x ? x.tenNguoi : C.ten, luc: x ? x.luc : Date.now(),
      ...(x ? { suaLuc: Date.now(), suaBoi: C.mail, suaTen: C.ten, diemCu: x.diem } : {}) };
    e.target.disabled = true;
    try { await setDoc(x ? doc(db, "nangkhieu", x.id) : doc(collection(db, "nangkhieu")), data); C.toast("Đã lưu điểm năng khiếu ✓"); h.dong(); }
    catch (er) { e.target.disabled = false; C.toast(er && er.code === "permission-denied" ? "Máy chủ chưa cho lưu (ngoài phạm vi hoặc luật bảo mật cũ)." : "Chưa lưu được, kiểm tra mạng.", "err"); }
  };
}

/* ================= Quản lý: công thức, phạm vi, thông báo ================= */
function quanLyHTML() {
  const gv = C.giaoVien() || [];
  return `<details class="card xt-ql"${moCH ? " open" : ""} data-xt-ql><summary><b>⚙️ Công thức tính điểm & phân phạm vi</b> <small class="muted">${D.cfg.length} cấu hình · ${D.cfg.filter(T.dungDuoc).length} đã xác minh</small></summary>
    <p class="muted"><small>Mỗi trường / ngành / phương thức / năm là một cấu hình. Chỉ đánh dấu <b>Đã xác minh</b> khi đã đối chiếu đề án hoặc thông báo tuyển sinh chính thức và dán link nguồn. Cấu hình chưa xác minh thì web báo “Chưa đủ dữ liệu tính điểm”, không tự suy đoán.</small></p>
    <div class="vh-nut"><button type="button" class="btn small primary" data-xt="ch-them">+ Thêm cấu hình</button></div>
    ${D.cfg.length ? `<ul class="xt-ch-ds">${D.cfg.map(c => { const loi = T.kiemTraCauHinh(c);
      return `<li><div><b>${esc(tenCfg(c))}</b><small>${(c.mon || []).map(x => `${esc(T.tenMon(x.ma))} (${esc(T.NGUON[x.nguon]?.ten || x.nguon)}${+x.heSo !== 1 ? ", ×" + esc(x.heSo) : ""})`).join(" + ")}${Number(c.thang) > 0 ? " · quy về thang " + esc(c.thang) : ""} · ưu tiên: ${({ khong: "không cộng", cong: "cộng thẳng", giamdan: "giảm dần từ 22,5" })[c.uuTien || "khong"]}</small>
        <small>${T.dungDuoc(c) ? `✓ Đã xác minh · <a href="${esc(c.nguonUrl)}" target="_blank" rel="noopener">nguồn ↗</a>` : loi.length ? "⚠ " + esc(loi[0]) : "Chưa xác minh — chưa dùng để tính"} · ${(c.diemChuan || []).length ? "điểm chuẩn " + (c.diemChuan || []).map(d => `${d.nam}: ${F(+d.diem)}`).join(", ") : "chưa có điểm chuẩn tham khảo"}</small></div>
        <div class="vh-nut"><button type="button" class="btn small" data-xt="ch-sua" data-id="${esc(c.id)}">Sửa</button><button type="button" class="btn small" data-xt="ch-nhan" data-id="${esc(c.id)}">Nhân bản</button><button type="button" class="btn small" data-xt="ch-xoa" data-id="${esc(c.id)}">Xoá</button></div></li>`; }).join("")}</ul>` : '<p class="muted">Chưa có cấu hình nào: mọi nguyện vọng sẽ hiện “Chưa đủ dữ liệu tính điểm”.</p>'}
    <h3 class="vh-h2">Phân phạm vi giáo viên</h3><p class="muted"><small>Giáo viên chỉ xem, đánh giá học viên thuộc cơ sở được gán (máy chủ kiểm tra).</small></p>
    ${gv.length ? `<ul class="xt-pv">${gv.map(g => { const v = Array.isArray(g.xtPhamVi) && g.xtPhamVi.length ? g.xtPhamVi.join("|") : "";
      return `<li><span><b>${esc(g.ten || g.id)}</b><small>${esc(g.chucVu || "")}${g.coso ? " · " + esc(g.coso) : ""}</small></span><select data-xt="pv" data-id="${esc(g.id)}" aria-label="Phạm vi của ${esc(g.ten || g.id)}">
        ${[["", `Theo cơ sở của GV (${g.coso || "chưa có"})`], ["Bình Phú", "Bình Phú"], ["Kim Quan", "Kim Quan"], ["Bình Phú|Kim Quan", "Bình Phú + Kim Quan"], ["tatca", "Tất cả (kể cả Online)"]].map(([k, t]) => `<option value="${esc(k)}"${v === k ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></li>`; }).join("")}</ul>` : '<p class="muted">Chưa có giáo viên.</p>'}</details>`;
}
function moFormCH(c, nhanBan) {
  const x = c ? JSON.parse(JSON.stringify(c)) : { nam: +C.homNay().slice(0, 4) + 1, mon: [{ ma: "toan", nguon: "thpt", heSo: 1 }], uuTien: "khong", lamTron: 2, diemChuan: [], dieuKien: [], xacMinh: false };
  if (nhanBan) { x.nam = (+x.nam || 0) + 1; x.xacMinh = false; x.nguonUrl = ""; }
  const monOpt = cur => Object.entries({ ...T.MON_VH, ...T.MON_NK }).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(v)}</option>`).join("");
  const nguonOpt = cur => Object.entries(T.NGUON).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(v.ten)}</option>`).join("");
  const dongMon = (m = {}) => `<div class="xt-ch-mon"><select data-k="ma">${monOpt(m.ma)}</select><select data-k="nguon">${nguonOpt(m.nguon)}</select><input data-k="heSo" inputmode="decimal" value="${esc(m.heSo ?? 1)}" aria-label="Hệ số"><button type="button" class="btn small" data-bo aria-label="Bỏ môn">✕</button></div>`;
  const dongDC = (d = {}) => `<div class="xt-ch-dc"><input data-k="nam" inputmode="numeric" placeholder="Năm" value="${esc(d.nam ?? "")}"><input data-k="diem" inputmode="decimal" placeholder="Điểm chuẩn" value="${esc(d.diem ?? "")}"><input data-k="ghiChu" maxlength="80" placeholder="Ghi chú (VD thang 30)" value="${esc(d.ghiChu || "")}"><button type="button" class="btn small" data-bo aria-label="Bỏ dòng">✕</button></div>`;
  const dongDK = (d = {}) => `<div class="xt-ch-dk"><select data-k="ma">${monOpt(d.ma)}</select><input data-k="toiThieu" inputmode="decimal" placeholder="Điểm tối thiểu" value="${esc(d.toiThieu ?? "")}"><button type="button" class="btn small" data-bo aria-label="Bỏ điều kiện">✕</button></div>`;
  const h = C.moHop(`<h3>${c && !nhanBan ? "Sửa" : "Thêm"} cấu hình tính điểm</h3>
    <div class="fgrid"><label>Năm tuyển sinh<input id="ch-nam" type="number" min="2024" max="2040" value="${esc(x.nam)}"></label><label>Trường<input id="ch-truong" maxlength="120" value="${esc(x.truong || "")}" placeholder="VD: ĐH Kiến trúc Hà Nội"></label>
    <label>Ngành<input id="ch-nganh" maxlength="120" value="${esc(x.nganh || "")}"></label><label>Mã ngành<input id="ch-ma" maxlength="20" value="${esc(x.maNganh || "")}"></label>
    <label>Phương thức<select id="ch-pt">${Object.entries(T.PHUONG_THUC).map(([k, v]) => `<option value="${k}"${x.phuongThuc === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label><label>Tổ hợp<input id="ch-th" maxlength="10" list="xt-th-ds2" value="${esc(x.toHop || "")}" placeholder="VD: V00"></label></div>
    <datalist id="xt-th-ds2">${Object.keys(T.TO_HOP).map(k => `<option value="${k}">`).join("")}</datalist>
    <h4>Môn trong công thức <small class="muted">(môn · nguồn điểm · hệ số)</small></h4><div id="ch-mon">${(x.mon || []).map(dongMon).join("")}</div><button type="button" class="btn small" id="ch-them-mon">+ Thêm môn</button>
    <div class="fgrid"><label>Quy về thang (để trống = giữ tổng có hệ số)<input id="ch-thang" inputmode="numeric" value="${esc(x.thang || "")}" placeholder="VD 30"></label>
    <label>Điểm ưu tiên<select id="ch-ut">${[["khong", "Không cộng"], ["cong", "Cộng thẳng"], ["giamdan", "Theo quy chế: giảm dần từ 22,5/30"]].map(([k, v]) => `<option value="${k}"${(x.uuTien || "khong") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Làm tròn tổng (chữ số thập phân)<input id="ch-lt" type="number" min="0" max="3" value="${esc(x.lamTron ?? 2)}"></label></div>
    <h4>Điều kiện bổ sung <small class="muted">(VD năng khiếu ≥ 5)</small></h4><div id="ch-dk">${(x.dieuKien || []).map(dongDK).join("")}</div><button type="button" class="btn small" id="ch-them-dk">+ Thêm điều kiện</button>
    <h4>Điểm chuẩn tham khảo các năm <small class="muted">(cùng ngành, cùng phương thức)</small></h4><div id="ch-dc">${(x.diemChuan || []).map(dongDC).join("")}</div><button type="button" class="btn small" id="ch-them-dc">+ Thêm năm</button>
    <label>Link đề án / thông báo tuyển sinh chính thức<input id="ch-url" maxlength="300" value="${esc(x.nguonUrl || "")}" placeholder="https://…"></label>
    <label>Ghi chú<input id="ch-gc" maxlength="300" value="${esc(x.ghiChu || "")}"></label>
    <label class="vh-check"><input type="checkbox" id="ch-xm"${x.xacMinh ? " checked" : ""}> Đã đối chiếu với đề án chính thức — dùng cấu hình này để tính điểm</label>
    <p class="status err" id="ch-loi"></p>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="ch-luu">Lưu cấu hình</button></div>`, "Cấu hình tính điểm");
  const gan = () => h.el.querySelectorAll("[data-bo]").forEach(b => b.onclick = () => b.parentElement.remove());
  [["ch-them-mon", "ch-mon", dongMon], ["ch-them-dk", "ch-dk", dongDK], ["ch-them-dc", "ch-dc", dongDC]].forEach(([n, o, f]) => h.el.querySelector("#" + n).onclick = () => { h.el.querySelector("#" + o).insertAdjacentHTML("beforeend", f()); gan(); });
  gan();
  h.el.querySelector("#ch-luu").onclick = async e => {
    const v = id => h.el.querySelector("#" + id).value.trim(), dong = (id, f) => [...h.el.querySelectorAll(`#${id} > div`)].map(r => { const o = {}; r.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim()); return f(o); });
    const data = { nam: Math.round(+v("ch-nam")), truong: v("ch-truong"), nganh: v("ch-nganh"), maNganh: v("ch-ma"), phuongThuc: v("ch-pt"), toHop: v("ch-th").toUpperCase(),
      mon: dong("ch-mon", o => ({ ma: o.ma, nguon: o.nguon, heSo: T.soDiem(o.heSo) })), thang: v("ch-thang") === "" ? null : Number(v("ch-thang")), uuTien: v("ch-ut"), lamTron: Math.round(+v("ch-lt")),
      dieuKien: dong("ch-dk", o => ({ ma: o.ma, toiThieu: T.soDiem(o.toiThieu) })), diemChuan: dong("ch-dc", o => ({ nam: Math.round(+o.nam), diem: T.soDiem(o.diem), ghiChu: o.ghiChu })),
      nguonUrl: v("ch-url"), ghiChu: v("ch-gc"), xacMinh: h.el.querySelector("#ch-xm").checked };
    const loi = [...T.kiemTraCauHinh(data)];
    if (!(data.nam >= 2024 && data.nam <= 2040)) loi.push("Năm tuyển sinh chưa hợp lệ.");
    if (!data.truong || !data.nganh) loi.push("Ghi tên trường và ngành.");
    if (data.nguonUrl && !/^https:\/\/[^\s"'<>]+$/i.test(data.nguonUrl)) loi.push("Link nguồn phải bắt đầu bằng https://");
    if (data.xacMinh && !data.nguonUrl) loi.push("Đánh dấu đã xác minh thì phải dán link đề án / thông báo tuyển sinh chính thức.");
    if (data.diemChuan.some(d => d.nam >= data.nam)) loi.push("Điểm chuẩn tham khảo chỉ nhập các năm TRƯỚC năm tuyển sinh.");
    if (new Set(data.diemChuan.map(d => d.nam)).size !== data.diemChuan.length) loi.push("Mỗi năm chỉ một điểm chuẩn.");
    if (loi.length) { h.el.querySelector("#ch-loi").innerHTML = loi.map(esc).join("<br>"); return; }
    const { db, fs: { doc, setDoc, collection } } = C;
    e.target.disabled = true;
    try { await setDoc(c && !nhanBan ? doc(db, "xtcauhinh", c.id) : doc(collection(db, "xtcauhinh")), { ...data, capNhat: Date.now(), capNhatBoi: C.mail, ...(data.xacMinh && !(c && c.xacMinh && !nhanBan) ? { xacMinhBoi: C.mail, xacMinhLuc: Date.now() } : {}) });
      C.toast("Đã lưu cấu hình ✓"); h.dong(); }
    catch (er) { e.target.disabled = false; h.el.querySelector("#ch-loi").textContent = er && er.code === "permission-denied" ? "Máy chủ chưa cho lưu (luật bảo mật cũ)." : "Chưa lưu được, kiểm tra mạng."; }
  };
}
const NOI_DUNG_YC = `Để lớp xây dựng lộ trình ôn tập phù hợp, các bạn vui lòng cập nhật đầy đủ thông tin tuyển sinh trên website, bao gồm:
1. Nguyện vọng 1 và nguyện vọng 2.
2. Trường và ngành dự kiến đăng ký.
3. Tổ hợp xét tuyển.
4. Điểm học bạ các môn liên quan.
5. Điểm năng khiếu hoặc điểm thi thử gần nhất (nếu có).
Các bạn chưa xác định được nguyện vọng có thể chọn "Chưa xác định".
Đề nghị các bạn hoàn thành thông tin để giáo viên có cơ sở tư vấn và điều chỉnh kế hoạch học tập.`;
// Thông báo dùng mã cố định (theo tháng / theo ngày) nên bấm nhiều lần không gửi trùng; chỉ đăng trong web, không gửi ra kênh ngoài
async function guiThongBao(id, data, btn, daCo) {
  const { db, fs: { doc, getDoc, setDoc } } = C;
  try { if ((await getDoc(doc(db, "thongbao", id))).exists()) return C.toast(daCo); } catch (e) {}
  if (btn) btn.disabled = true;
  try { await setDoc(doc(db, "thongbao", id), { ...data, tacGia: C.mail, ten: C.ten, luc: Date.now() }); C.toast("Đã gửi thông báo ✓"); }
  catch (e) { C.toast(e && e.code === "permission-denied" ? "Máy chủ chưa cho gửi (luật bảo mật cũ, hoặc đã gửi rồi)." : "Chưa gửi được, kiểm tra mạng.", "err"); }
  finally { if (btn) btn.disabled = false; }
}
function taiBaoCao() {
  const ds = locDS(hvDs().map(dongDS)), nv = (r, i) => { const x = nvCua(r.m)[i]; return !x ? "" : x.chuaXacDinh ? "Chưa xác định" : [x.truong, x.nganh, x.maNganh, x.toHop, T.PHUONG_THUC[x.phuongThuc] || x.phuongThuc].filter(Boolean).join(" · "); };
  const k = (r, i) => { const x = r.kqs[i]; return !x ? ["", "", ""] : x.kq.ok ? [x.kq.tong, x.kq.diemChuan ? `${x.kq.diemChuan.diem} (${x.kq.diemChuan.nam})` : "", x.kq.chenh ?? ""] : [x.c ? "Chưa đủ dữ liệu" : "Chưa có công thức", "", ""]; };
  const rows = [["Họ tên", "Cơ sở", "Lớp/khoá", "NV1", "Tổng NV1", "Điểm chuẩn tham khảo NV1", "Chênh NV1", "NV2", "Tổng NV2", "Điểm chuẩn tham khảo NV2", "Chênh NV2", "Mức đáp ứng", "Môn cần cải thiện", "Hồ sơ", "Cập nhật"],
    ...ds.map(r => [r.h.ten, r.h.coso || "", r.h.chuongTrinh || r.h.lop || "", nv(r, 0), ...k(r, 0), nv(r, 1), ...k(r, 1), (r.kqs.filter(Boolean)[0] || {}).md?.ten || "",
      [...new Set(r.kqs.filter(Boolean).flatMap(x => x.cai))].map(T.tenMon).join(", "), r.ht.xong ? "Đủ" : `${r.ht.so}/${r.ht.tong}`, r.capNhat ? luc(r.capNhat) : ""])];
  rows.push([], ["Đánh giá tham khảo, không phải kết quả tuyển sinh chính thức."]);
  C.taiCSV(`xet-tuyen-${C.homNay()}.csv`, rows);
}

/* ================= Sự kiện ================= */
function ganSuKien(box) {
  box.querySelectorAll("[data-xt]").forEach(b => {
    const k = b.dataset.xt;
    if (b.tagName === "SELECT") { b.onchange = () => chon(k, b); return; }
    b.onclick = e => bam(k, b, e);
  });
  const f = $("#xt-form");
  if (f) {
    f.addEventListener("input", () => luuNhap(f));
    f.querySelectorAll('select[data-f$=".cfg"]').forEach(s => s.addEventListener("change", () => { luuNhap(f); s.blur(); ve(); }));
    f.onsubmit = e => { e.preventDefault(); luuHoSo(f, $("#xt-luu")); };
  }
  const nb = $("#xt-nb"); if (nb) nb.onsubmit = e => { e.preventDefault(); luuNoiBo(nb, nb.querySelector("[type=submit]")); };
  box.querySelectorAll("[data-loc]").forEach(i => { const k = i.dataset.loc;
    i[i.tagName === "SELECT" ? "onchange" : "oninput"] = () => { loc[k] = i.value; if (i.tagName === "SELECT") { i.blur(); ve(); } else { const l = $(".xt-ds"); if (l) { const ds = locDS(hvDs().map(dongDS)); l.innerHTML = ds.length ? ds.map(theDS).join("") : '<p class="muted vh-trong">Không có học viên phù hợp bộ lọc.</p>'; ganSuKien(l); } } }; });
  box.querySelectorAll("[data-cc]").forEach(i => { const st = CC[i.dataset.k] ||= {};
    const doi = () => { const t = i.dataset.cc; if (t === "mt") st.mt = i.value; else if (t === "cd") (st.cd ||= {})[i.dataset.ma] = i.checked; else (st[t] ||= {})[i.dataset.ma] = i.value;
      const [m, nv] = i.dataset.k.split("|"), c = cfgCua((nvCua(m)[nv - 1] || {}).cauHinh), o = $("#cc-kq-" + i.dataset.k.replace(/[^a-z0-9]/gi, "")); if (c && o) o.innerHTML = ketQuaCC(m, c, +nv, hsCua(m), i.dataset.k); };
    i.addEventListener(i.type === "checkbox" ? "change" : "input", doi); });
  const ql = box.querySelector("[data-xt-ql]"); if (ql) ql.ontoggle = () => { moCH = ql.open; };
}
function chon(k, b) {
  const { db, fs: { doc, setDoc } } = C;
  if (k === "them-mon" && b.value) { const f = $("#xt-form"); const g = docForm(f); g.monThem = [...String(g.monThem || "").split(",").filter(Boolean), b.value].join(","); store.set(NHAP(f.dataset.mail), { g, luc: Date.now() }); return ve(); }
  if (k === "nk-coso") return luuNoiBo(null, b, { nkCoSo: b.value });
  if (k === "pv" && C.isAdmin) { const v = b.value; b.disabled = true;
    return setDoc(doc(db, "giaovien", b.dataset.id), { xtPhamVi: v ? v.split("|") : [] }, { merge: true }).then(() => C.toast("Đã cập nhật phạm vi ✓"), () => C.toast("Chưa lưu được phạm vi.", "err")).finally(() => b.disabled = false); }
}
function bam(k, b, e) {
  const { db, fs: { doc, setDoc, deleteDoc } } = C;
  if (k === "toi-form") { e.preventDefault(); const f = $("#xt-form"); if (f) { f.scrollIntoView({ block: "start", behavior: "smooth" }); setTimeout(() => f.querySelector("select,input")?.focus({ preventScroll: true }), 400); } return; }
  if (k === "luu-tam") return luuNhap($("#xt-form"), true);
  if (k === "bo-nhap") { store.set(NHAP($("#xt-form").dataset.mail), null); return ve(); }
  if (k === "xem") { xem = b.dataset.m; sua = false; ve(); return scrollTo(0, $("#xt-body").offsetTop - 70); }
  if (k === "ve-ds") { xem = ""; sua = false; return ve(); }
  if (k === "mo-sua") { sua = !sua; return ve(); }
  if (k === "dong-sua") { sua = false; return ve(); }
  if (k === "cc-mo" || k === "cc-dong") { (CC[b.dataset.k] ||= {}).mo = k === "cc-mo"; return ve(); }
  if (k === "cc-luu") { const st = CC[b.dataset.k] || {}, nv = b.dataset.k.split("|")[1], mt = T.soDiem(st.mt ?? ""), mon = {};
    Object.entries(st.mtm || {}).forEach(([ma, v]) => { const x = T.soDiem(v); mon[ma] = T.hopLeDiem(x) ? x : null; });
    if (st.mt !== undefined && (Number.isNaN(mt) || (mt !== null && !(mt > 0 && mt <= 40)))) return C.toast("Tổng điểm mục tiêu chưa hợp lệ.", "err");
    if (Object.entries(st.mtm || {}).some(([, v]) => Number.isNaN(T.soDiem(v)) || (T.soDiem(v) !== null && !T.hopLeDiem(T.soDiem(v))))) return C.toast("Mục tiêu môn phải từ 0 đến 10.", "err");
    return luuNoiBo(null, b, { mucTieu: { tong: st.mt !== undefined && mt !== null ? { ["nv" + nv]: mt } : {}, mon } }); }
  if (k === "nk-them") return moFormNK(null);
  if (k === "nk-sua") return moFormNK(D.nk.find(x => x.id === b.dataset.id));
  if (k === "nk-hople") { const x = D.nk.find(y => y.id === b.dataset.id); if (!x) return; b.disabled = true;
    const { id, ...goc } = x;
    return setDoc(doc(db, "nangkhieu", id), { ...goc, hopLe: x.hopLe === false, suaLuc: Date.now(), suaBoi: C.mail, suaTen: C.ten, diemCu: x.diem }).then(() => C.toast(x.hopLe === false ? "Đã tính lại bài này ✓" : "Bài này không còn được tính vào thống kê ✓"), () => C.toast("Chưa lưu được.", "err")).finally(() => b.disabled = false); }
  if (k === "nhac") { const m = b.dataset.m, hv = hvCua(m), h = hoanThanh(m);
    return guiThongBao(`xt-nhac-${m.replace(/[^a-z0-9]+/gi, "-")}-${C.homNay()}`, { gui: "canhan", cho: m, choTen: hv.ten || m, loai: "canhan", link: "#xet-tuyen",
      tieuDe: "YÊU CẦU BỔ SUNG THÔNG TIN XÉT TUYỂN", nd: `${hv.ten || "Em"} ơi, hồ sơ xét tuyển của em còn thiếu: ${h.ds.filter(x => !x[1]).map(x => x[0]).join("; ")}.\nEm bấm Cập nhật thông tin để bổ sung giúp anh chị nhé.` }, b, "Hôm nay đã nhắc học viên này rồi."); }
  if (k === "tb-yeucau") return guiThongBao(`xt-yeucau-${C.homNay().slice(0, 7)}`, { gui: "tatca", loai: "quantrong", link: "#xet-tuyen", tieuDe: "YÊU CẦU BỔ SUNG THÔNG TIN XÉT TUYỂN", nd: NOI_DUNG_YC }, b, "Tháng này đã gửi thông báo này rồi (không gửi trùng).");
  if (k === "xuat") return taiBaoCao();
  if (k === "ch-them") return moFormCH(null);
  if (k === "ch-sua") return moFormCH(cfgCua(b.dataset.id));
  if (k === "ch-nhan") return moFormCH(cfgCua(b.dataset.id), true);
  if (k === "ch-xoa") { const dung = Object.values(D.ho).filter(ho => (ho.nv || []).some(n => n.cauHinh === b.dataset.id)).length;
    if (!b.dataset.chac) { b.dataset.chac = 1; b.textContent = dung ? `${dung} học viên đang chọn · bấm lần nữa` : "Bấm lần nữa để xoá"; setTimeout(() => { delete b.dataset.chac; b.textContent = "Xoá"; }, 4000); return; }
    return deleteDoc(doc(db, "xtcauhinh", b.dataset.id)).then(() => C.toast("Đã xoá cấu hình."), () => C.toast("Chưa xoá được.", "err")); }
}
