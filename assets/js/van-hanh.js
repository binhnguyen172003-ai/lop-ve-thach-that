// =====================================================================
//  VẬN HÀNH LỚP — thi thử, ca dạy & bàn giao, báo sự cố, trực nhật, nhật ký sửa.
//  app.js gọi batDau(ctx) sau khi đăng nhập, dung() khi đăng xuất.
//  Dữ liệu nằm trên Firestore; quyền đọc/ghi kiểm tra ở máy chủ (firestore.rules).
// =====================================================================
import { CA_HOC, THOI_GIAN_BIEU, VIEC_CUOI_BUOI, TIEU_CHI_THI } from "../../data/noi-dung.js?v=20261010bh";

let tuanLich = 0, csLich = "", thangCC = 0, gvCC = ""; // chấm công: tháng đang xem (0 = tháng này), giáo viên đang xem // lịch phân công dạy: tuần đang xem (0 = tuần này), cơ sở đang xem
let C = null, huy = [], dongHo = 0, anhThi = [], tabVH = "", locSC = "mo", timBG = "", locNK = "", chiCaToi = false;
const D = { thi: [], bai: [], ca: [], doica: [], bg: [], suco: [], truc: {}, kt: [], nk: [], loi: "" };

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Ảnh do người dùng gửi: chỉ nhận dữ liệu ảnh thật (chặn chèn mã độc qua thuộc tính src/href)
const anh = a => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(a || "")) ? a : "";
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
const pad = n => String(n).padStart(2, "0");
const luc = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getDate()}/${d.getMonth() + 1}`; };
const ngayVN = iso => { const [y, m, d] = String(iso || "").split("-"); return y ? `${+d}/${+m}/${y}` : ""; };
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], TEN_THU = { T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5", T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật" };
const thuCua = iso => THU[new Date(iso + "T12:00:00").getDay()];
const CO_SO = Object.keys(THOI_GIAN_BIEU).map(k => k.replace("Cơ sở ", ""));
const maCS = cs => bo(cs).replace(/[^a-z0-9]+/g, "-");
const tenCa = ma => (CA_HOC.find(c => c.ma === ma) || { ten: ma }).ten;
const gioCa = ma => (CA_HOC.find(c => c.ma === ma) || { gio: "" }).gio;
const chon = (id, ds, cur = "") => `<select id="${id}">${ds.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
const chonCS = (id, cur) => chon(id, CO_SO.map(c => [c, c]), cur);
const chonCa = (id, cur) => chon(id, CA_HOC.map(c => [c.ma, `Ca ${c.ten.toLowerCase()} · ${c.gio}`]), cur);
const val = id => ($("#" + id)?.value || "").trim();

/* ================= Khởi động ================= */
let ganMoTab = false;
export function batDau(ctx) {
  if (!ganMoTab) { ganMoTab = true; document.addEventListener("click", e => { const a = e.target.closest?.("[data-vh-mo]"); if (a) { tabVH = a.dataset.vhMo; try { sessionStorage.removeItem("vh-mo"); } catch (er) {} ve(); } }); }
  try { const m = sessionStorage.getItem("vh-mo"); if (m) { tabVH = m; sessionStorage.removeItem("vh-mo"); } } catch (er) {}
  dung(); C = ctx;
  const { db, fs: { collection, query, orderBy, where, limit, onSnapshot } } = C;
  const nghe = (q, fn) => { const u = onSnapshot(q, s => { fn(s.docs.filter(d => d.id[0] !== "_").map(d => ({ id: d.id, ...d.data() }))); D.loi = ""; ve(); }, e => { D.loi = (e && e.code) || "loi"; ve(); }); huy.push(u); C.themHuy(u); };
  nghe(query(collection(db, "thithu"), orderBy("tao", "desc")), r => D.thi = r);
  nghe(C.isTeacher ? collection(db, "thithubai") : query(collection(db, "thithubai"), where("mail", "==", C.mail)), r => D.bai = r);
  nghe(collection(db, "trucnhat"), r => { D.truc = {}; r.forEach(x => D.truc[x.id] = x); });
  if (C.isTeacher) {
    nghe(query(collection(db, "caday"), orderBy("ngay")), r => D.ca = r);
    nghe(C.isAdmin ? collection(db, "doica") : query(collection(db, "doica"), where("tu", "==", C.mail)), r => D.doica = r.sort((a, b) => b.luc - a.luc));
    nghe(query(collection(db, "bangiao"), orderBy("luc", "desc"), limit(80)), r => D.bg = r);
    nghe(collection(db, "suco"), r => D.suco = r.sort((a, b) => b.luc - a.luc));
    nghe(query(collection(db, "kiemtra"), orderBy("luc", "desc"), limit(40)), r => D.kt = r);
    if (C.isAdmin) nghe(query(collection(db, "nhatky"), orderBy("luc", "desc"), limit(200)), r => D.nk = r);
  } else nghe(query(collection(db, "suco"), where("ai", "==", C.mail)), r => D.suco = r.sort((a, b) => b.luc - a.luc));
  const nav = $('#acc-nav [data-acc="van-hanh"]');
  if (nav) nav.innerHTML = C.isTeacher ? '<i aria-hidden="true">🛠️</i>Vận hành <span class="nbadge num" id="acc-vh-n" hidden></span>' : '<i aria-hidden="true">🧹</i>Trực nhật';
  if ($("#vh-h1")) $("#vh-h1").textContent = C.isTeacher ? "Vận hành lớp" : "Trực nhật & báo sự cố";
  if ($("#vh-intro")) $("#vh-intro").textContent = C.isTeacher ? "Ca dạy, bàn giao học viên, báo thiếu đồ, trực nhật cuối buổi" + (C.isAdmin ? " và nhật ký sửa dữ liệu." : ".") : "Xem lịch trực nhật và báo thiếu đồ, đồ hỏng ở lớp.";
  ve();
}
export function dung() {
  huy.forEach(u => { try { u(); } catch (e) {} }); huy = []; C = null; clearInterval(dongHo); anhThi = [];
  Object.assign(D, { thi: [], bai: [], ca: [], doica: [], bg: [], suco: [], truc: {}, kt: [], nk: [], loi: "" });
  ["#tt-body", "#vh-body"].forEach(s => { if ($(s)) $(s).innerHTML = ""; });
}
let veHen = 0;
function ve() { cancelAnimationFrame(veHen); veHen = requestAnimationFrame(() => { veThi(); veVH(); demViec(); }); }
export const veLai = ve;

const hopLoi = () => `<div class="vh-loi"><b>Tính năng mới chưa bật được trên máy chủ.</b>
  <p>${C.isAdmin ? "Anh chị vào <b>Quản lý</b> → khung kiểm tra máy chủ → <b>Sao chép luật mới</b> → dán vào Firebase → <b>Publish</b>. Xong tải lại trang." : "Quản lý lớp cần cập nhật luật bảo mật. Em báo anh chị giúp nhé."}</p>
  <small class="muted">Mã: ${esc(D.loi)}</small></div>`;
const ghi = async (viec, nhan = "Đã lưu ✓") => {
  try { await viec; C.toast(nhan); return true; }
  catch (e) { C.toast(e && e.code === "permission-denied" ? "Máy chủ chưa cho phép thao tác này (luật bảo mật cũ hoặc thiếu quyền)." : "Chưa lưu được. Kiểm tra mạng rồi thử lại.", "err"); return false; }
};
// Nút gửi: khoá trong lúc chờ máy chủ, báo kết quả rõ ràng
async function guiNut(btn, viec, nhan) {
  if (btn.disabled) return false;
  const cu = btn.textContent; btn.disabled = true; btn.textContent = "Đang lưu…";
  const ok = await ghi(viec(), nhan); btn.disabled = false; btn.textContent = cu; return ok;
}
function demViec() {
  const el = $("#acc-vh-n"); if (!el || !C) return;
  const n = C.isAdmin ? D.suco.filter(s => s.trangThai === "moi").length + D.doica.filter(d => d.trangThai === "cho").length : 0;
  el.textContent = n; el.hidden = !n;
}

/* ================= 1. THI THỬ ================= */
const baiCua = id => D.bai.find(b => b.thi === id && b.mail === C.mail);
const conLai = (thi, bai) => bai.batDau + thi.phut * 60000 - Date.now();
const dongHoChu = ms => { const s = Math.max(0, Math.round(Math.abs(ms) / 1000)); return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const tongDiem = tc => (tc || []).reduce((a, t) => a + (+t.toiDa || 0), 0);

function veThi() {
  const box = $("#tt-body"); if (!box) return;
  clearInterval(dongHo);
  if (!C) { box.innerHTML = ""; return; }
  if (D.loi) { box.innerHTML = hopLoi(); return; }
  // Học viên đang gõ ghi chú bài thi: giữ nguyên chữ và con trỏ khi dữ liệu cập nhật
  const gc = $("#tt-gc"), dangGo = gc && document.activeElement === gc, chu = gc ? gc.value : null, vt = dangGo ? [gc.selectionStart, gc.selectionEnd] : null;
  box.innerHTML = C.isTeacher ? thiGV() : thiHV();
  const gc2 = $("#tt-gc"); if (gc2 && chu) { gc2.value = chu; if (dangGo) { gc2.focus(); try { gc2.setSelectionRange(vt[0], vt[1]); } catch (e) {} } }
  box.querySelectorAll("[data-tt]").forEach(b => b.onclick = () => hanhDongThi(b.dataset.tt, b.dataset.id, b));
  const dang = !C.isTeacher && D.bai.find(b => !b.nop && D.thi.some(t => t.id === b.thi));
  if (dang) {
    const thi = D.thi.find(t => t.id === dang.thi);
    const chay = () => { const el = $("#tt-dh"); if (!el) return clearInterval(dongHo); const ms = conLai(thi, dang);
      el.textContent = ms >= 0 ? dongHoChu(ms) : "Hết giờ · " + dongHoChu(ms); el.classList.toggle("het", ms < 0); el.classList.toggle("gap", ms >= 0 && ms < 5 * 60000); };
    chay(); dongHo = setInterval(chay, 1000);
    const f = $("#tt-anh"); if (f) f.onchange = async () => {
      const ds = [...f.files].slice(0, 2 - anhThi.length); f.value = "";
      for (const x of ds) { try { anhThi.push(await C.nenAnh(x, 1600, 380000)); } catch (e) { C.toast(e.message || "Ảnh lỗi", "err"); } }
      veAnhThi();
    };
    veAnhThi();
  }
}
function veAnhThi() {
  const el = $("#tt-xem"); if (!el) return;
  el.innerHTML = anhThi.map((a, i) => `<figure><img src="${esc(anh(a))}" alt="Ảnh bài ${i + 1}"><button type="button" class="btn small" data-xa="${i}">Bỏ ảnh</button></figure>`).join("");
  el.querySelectorAll("[data-xa]").forEach(b => b.onclick = () => { anhThi.splice(+b.dataset.xa, 1); veAnhThi(); });
  const n = $("#tt-nop"); if (n) n.disabled = !anhThi.length;
  const g = $("#tt-anh-g"); if (g) g.hidden = anhThi.length >= 2;
}
function thiHV() {
  const now = Date.now();
  const dang = D.bai.find(b => !b.nop && D.thi.some(t => t.id === b.thi));
  let h = "";
  if (dang) {
    const t = D.thi.find(x => x.id === dang.thi);
    h += `<section class="card tt-dang"><p class="eyebrow">Đang làm bài · ${esc(t.mon)}</p><h2>${esc(t.tieuDe)}</h2>
      <div class="tt-dh" id="tt-dh" aria-live="off"></div>
      <p class="muted">Bắt đầu lúc ${luc(dang.batDau)} · thời gian ${t.phut} phút. Hết giờ vẫn nộp được nhưng bài ghi <b>nộp muộn</b>.</p>
      ${anh(t.anhDe) ? `<img class="tt-de-anh" src="${esc(anh(t.anhDe))}" alt="Ảnh đề bài">` : ""}
      <div class="tt-de">${esc(t.deBai).replace(/\n/g, "<br>")}</div>
      <h3>Nộp bài</h3><p class="muted">Chụp thẳng, đủ sáng, thấy hết tờ giấy. Tối đa 2 ảnh.</p>
      <label class="btn" id="tt-anh-g">📷 Chọn / chụp ảnh bài<input type="file" id="tt-anh" accept="image/*" multiple hidden></label>
      <div class="tt-xem" id="tt-xem"></div>
      <label>Ghi chú cho anh chị (không bắt buộc)<textarea id="tt-gc" maxlength="500"></textarea></label>
      <button class="btn primary" type="button" id="tt-nop" data-tt="nop" data-id="${esc(dang.id)}" disabled>Nộp bài</button></section>`;
  }
  const mo = D.thi.filter(t => !baiCua(t.id) && t.moTu <= now && now < t.dongLuc);
  const sap = D.thi.filter(t => t.moTu > now);
  h += `<section><h2 class="vh-h2">Đề đang mở</h2>${mo.length ? mo.map(t => `<div class="card vh-the">
      <div><b>${esc(t.tieuDe)}</b><p class="muted">${esc(t.mon)} · ${esc(t.khoi)} · ${t.phut} phút · đóng lúc ${luc(t.dongLuc)}</p></div>
      ${dang ? '<span class="chip line">Nộp bài đang làm trước</span>' : `<button class="btn primary small" type="button" data-tt="batdau" data-id="${esc(t.id)}">Bắt đầu làm bài</button>`}</div>`).join("")
    : `<p class="muted vh-trong">Chưa có đề nào đang mở. Đề mới sẽ hiện ở đây${sap.length ? "" : " khi anh chị giao"}.</p>`}
    ${sap.length ? `<p class="muted">Sắp mở: ${sap.map(t => `<b>${esc(t.tieuDe)}</b> (${luc(t.moTu)})`).join(" · ")}</p>` : ""}</section>`;
  const xong = D.bai.filter(b => b.nop).sort((a, b) => a.nop - b.nop);
  const daCham = xong.filter(b => b.cham);
  h += `<section><h2 class="vh-h2">Kết quả các lần thi</h2>`;
  if (daCham.length > 1) h += `<div class="tt-tienbo" aria-label="Tiến bộ qua các lần thi">${daCham.map(b => { const p = b.cham.toiDa ? b.cham.tong / b.cham.toiDa : 0;
    return `<div><span style="height:${Math.round(p * 100)}%"></span><b class="num">${b.cham.tong}</b><small>${new Date(b.nop).getDate()}/${new Date(b.nop).getMonth() + 1}</small></div>`; }).join("")}</div>`;
  h += xong.length ? xong.slice().reverse().map(b => { const t = D.thi.find(x => x.id === b.thi) || { tieuDe: "(đề đã xoá)", phut: 0 };
    const muon = t.phut && b.nop - b.batDau > t.phut * 60000 ? Math.round((b.nop - b.batDau) / 60000 - t.phut) : 0;
    return `<div class="card vh-the cot"><div class="vh-dong"><b>${esc(t.tieuDe)}</b>${b.cham ? `<span class="chip ok">${b.cham.tong}/${b.cham.toiDa} điểm</span>` : '<span class="chip warn">Chờ chấm</span>'}</div>
      <p class="muted">Nộp ${luc(b.nop)}${muon > 0 ? ` · <b>nộp muộn ${muon} phút</b>` : ""}</p>
      ${b.cham ? `<ul class="tt-tc">${(b.cham.ds || []).map(x => `<li><span>${esc(x.ten)}</span><b class="num">${x.diem}/${x.toiDa}</b></li>`).join("")}</ul>
      ${b.cham.nhanXet ? `<p class="tt-nx"><b>Nhận xét:</b> ${esc(b.cham.nhanXet)}</p>` : ""}` : ""}</div>`; }).join("")
    : `<p class="muted vh-trong">Em chưa thi lần nào. Làm đề đầu tiên để có mốc so sánh tiến bộ.</p>`;
  return h + "</section>";
}
function thiGV() {
  const now = Date.now();
  let h = `<div class="vh-dau"><button class="btn primary" type="button" data-tt="tao">+ Tạo đề thi thử</button></div>`;
  if (!D.thi.length) return h + `<p class="muted vh-trong">Chưa có đề nào. Bấm “Tạo đề thi thử”: đặt thời lượng, giờ mở/đóng và phiếu chấm theo tiêu chí.</p>`;
  return h + D.thi.map(t => { const bs = D.bai.filter(b => b.thi === t.id), nop = bs.filter(b => b.nop), cham = nop.filter(b => b.cham);
    const tt = now < t.moTu ? '<span class="chip line">Chưa mở</span>' : now < t.dongLuc ? '<span class="chip ok">Đang mở</span>' : '<span class="chip">Đã đóng</span>';
    return `<div class="card vh-the cot"><div class="vh-dong"><b>${esc(t.tieuDe)}</b>${tt}</div>
      <p class="muted">${esc(t.mon)} · ${esc(t.khoi)} · ${t.phut} phút · mở ${luc(t.moTu)} → đóng ${luc(t.dongLuc)} · thang ${tongDiem(t.tieuChi)} điểm</p>
      <p>Đang làm <b class="num">${bs.length - nop.length}</b> · Đã nộp <b class="num">${nop.length}</b> · Đã chấm <b class="num">${cham.length}</b>${nop.length - cham.length ? ` · <span class="chip warn">${nop.length - cham.length} bài chờ chấm</span>` : ""}</p>
      <div class="vh-nut"><button class="btn small primary" type="button" data-tt="bai" data-id="${esc(t.id)}">Xem & chấm bài</button>
      <button class="btn small" type="button" data-tt="sua" data-id="${esc(t.id)}">Sửa đề</button>
      ${C.isAdmin || t.nguoi === C.mail ? `<button class="btn small" type="button" data-tt="xoa" data-id="${esc(t.id)}">Xoá đề</button>` : ""}</div></div>`; }).join("");
}
function hanhDongThi(loai, id, btn) {
  const { db, fs: { doc, setDoc, deleteDoc, collection } } = C;
  if (loai === "tao" || loai === "sua") return moFormThi(D.thi.find(t => t.id === id));
  if (loai === "xoa") { if (btn.dataset.chac) return ghi(deleteDoc(doc(db, "thithu", id)), "Đã xoá đề."); btn.dataset.chac = 1; btn.textContent = "Bấm lần nữa để xoá"; setTimeout(() => { delete btn.dataset.chac; btn.textContent = "Xoá đề"; }, 4000); return; }
  if (loai === "bai") return moBaiNop(id);
  if (loai === "batdau") {
    const t = D.thi.find(x => x.id === id);
    const h = C.moHop(`<h3>Bắt đầu: ${esc(t.tieuDe)}</h3><p>Đồng hồ <b>${t.phut} phút</b> chạy ngay khi em bấm và không dừng lại kể cả khi tắt web. Chuẩn bị giấy, bút, chỗ ngồi xong rồi hãy bắt đầu.</p>
      <div class="hop-nut"><button class="btn" type="button" data-dong>Để sau</button><button class="btn primary" type="button" id="tt-ok">Bắt đầu ngay</button></div>`, "Bắt đầu thi thử");
    h.el.querySelector("#tt-ok").onclick = async e => { const ok = await guiNut(e.target, () => setDoc(doc(db, "thithubai", id + "__" + C.mail), { thi: id, mail: C.mail, ten: C.ten, batDau: Date.now() }), "Bắt đầu tính giờ. Chúc em làm tốt!"); if (ok) { anhThi = []; h.dong(); } };
    return;
  }
  if (loai === "nop") {
    if (!anhThi.length) return C.toast("Chọn ít nhất 1 ảnh bài trước khi nộp.", "err");
    return guiNut(btn, () => setDoc(doc(db, "thithubai", id), { nop: Date.now(), anh: anhThi.slice(0, 2), ghiChu: val("tt-gc").slice(0, 500) }, { merge: true }), "Đã nộp bài ✓ Anh chị sẽ chấm và nhận xét.")
      .then(ok => { if (ok) anhThi = []; });
  }
}
function moFormThi(t) {
  const { db, fs: { doc, setDoc, collection } } = C;
  const dt = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const mon = t?.mon || "Hình hoạ", tc = (t?.tieuChi || (TIEU_CHI_THI[mon] || []).map(([ten, toiDa]) => ({ ten, toiDa }))).map(x => `${x.ten}: ${x.toiDa}`).join("\n");
  let anhDe = t?.anhDe || "";
  const h = C.moHop(`<h3>${t ? "Sửa đề thi thử" : "Tạo đề thi thử"}</h3>
    <label>Tên đề<input id="ft-ten" maxlength="120" value="${esc(t?.tieuDe || "")}" placeholder="VD: Thi thử Hình hoạ tượng · tuần 3"></label>
    <div class="fgrid"><label>Môn${chon("ft-mon", Object.keys(TIEU_CHI_THI).map(m => [m, m]), mon)}</label>
    <label>Khối${chon("ft-khoi", [["Tất cả", "Tất cả"], ["Khối H", "Khối H"], ["Khối V", "Khối V"], ["Cơ bản", "Cơ bản"]], t?.khoi || "Tất cả")}</label>
    <label>Thời lượng (phút)<input id="ft-phut" type="number" min="5" max="600" value="${t?.phut || 180}"></label><span></span>
    <label>Mở lúc<input id="ft-mo" type="datetime-local" value="${dt(t?.moTu || Date.now())}"></label>
    <label>Đóng lúc<input id="ft-dong" type="datetime-local" value="${dt(t?.dongLuc || Date.now() + 7 * 864e5)}"></label></div>
    <label>Đề bài<textarea id="ft-de" maxlength="4000" placeholder="Nội dung đề, yêu cầu, khổ giấy, chất liệu…">${esc(t?.deBai || "")}</textarea></label>
    <label class="btn small">🖼️ Ảnh đề (mẫu tượng, ảnh tham khảo)<input type="file" id="ft-anh" accept="image/*" hidden></label><div class="tt-xem" id="ft-xem"></div>
    <label>Phiếu chấm: mỗi dòng “Tiêu chí: điểm tối đa”<textarea id="ft-tc" rows="5">${esc(tc)}</textarea></label>
    <p class="muted" id="ft-tong"></p>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="ft-luu">${t ? "Lưu thay đổi" : "Tạo đề"}</button></div>`, "Đề thi thử");
  const docTC = () => val("ft-tc").split("\n").map(l => l.split(":")).filter(p => p[0].trim() && +p[1] > 0).map(p => ({ ten: p[0].trim().slice(0, 60), toiDa: Math.round(+p[1] * 4) / 4 })).slice(0, 10);
  const tong = () => { $("#ft-tong").textContent = `Tổng thang điểm: ${tongDiem(docTC())}`; };
  const xem = () => { $("#ft-xem").innerHTML = anhDe ? `<figure><img src="${esc(anh(anhDe))}" alt="Ảnh đề"><button type="button" class="btn small" id="ft-boanh">Bỏ ảnh</button></figure>` : ""; if ($("#ft-boanh")) $("#ft-boanh").onclick = () => { anhDe = ""; xem(); }; };
  h.el.querySelector("#ft-tc").oninput = tong; tong(); xem();
  h.el.querySelector("#ft-mon").onchange = e => { if (!t) { $("#ft-tc").value = (TIEU_CHI_THI[e.target.value] || []).map(([a, b]) => `${a}: ${b}`).join("\n"); tong(); } };
  h.el.querySelector("#ft-anh").onchange = async e => { try { anhDe = await C.nenAnh(e.target.files[0], 1600, 450000); xem(); } catch (er) { C.toast(er.message || "Ảnh lỗi", "err"); } };
  h.el.querySelector("#ft-luu").onclick = async e => {
    const tieuDe = val("ft-ten"), phut = Math.round(+val("ft-phut")), moTu = Date.parse(val("ft-mo")), dongLuc = Date.parse(val("ft-dong")), tieuChi = docTC();
    if (!tieuDe) return C.toast("Đặt tên đề trước nhé.", "err");
    if (!(phut >= 5 && phut <= 600)) return C.toast("Thời lượng từ 5 đến 600 phút.", "err");
    if (!(moTu < dongLuc)) return C.toast("Giờ đóng phải sau giờ mở.", "err");
    if (!tieuChi.length) return C.toast("Phiếu chấm cần ít nhất 1 tiêu chí, VD “Bố cục: 2”.", "err");
    const data = { tieuDe, mon: val("ft-mon"), khoi: val("ft-khoi"), phut, moTu, dongLuc, deBai: val("ft-de"), anhDe, tieuChi, nguoi: t?.nguoi || C.mail, tao: t?.tao || Date.now() };
    const ref = t ? doc(db, "thithu", t.id) : doc(collection(db, "thithu"));
    if (await guiNut(e.target, () => setDoc(ref, data), t ? "Đã lưu đề ✓" : "Đã tạo đề ✓ Học viên thấy đề khi tới giờ mở.")) h.dong();
  };
}
function moBaiNop(id) {
  const t = D.thi.find(x => x.id === id); if (!t) return;
  const ds = D.bai.filter(b => b.thi === id).sort((a, b) => (!!a.cham - !!b.cham) || (a.nop || 9e15) - (b.nop || 9e15));
  const h = C.moHop(`<h3>Bài nộp · ${esc(t.tieuDe)}</h3>${ds.length ? `<ul class="vh-ds">${ds.map(b => {
      const muon = b.nop && b.nop - b.batDau > t.phut * 60000 ? Math.round((b.nop - b.batDau) / 60000 - t.phut) : 0;
      return `<li><div><b>${esc(b.ten || b.mail)}</b><small class="muted">${b.nop ? "Nộp " + luc(b.nop) + (muon > 0 ? ` · muộn ${muon} phút` : "") : "Đang làm · bắt đầu " + luc(b.batDau)}</small></div>
      ${b.nop ? `<button class="btn small ${b.cham ? "" : "primary"}" type="button" data-cham="${esc(b.id)}">${b.cham ? `Đã chấm ${b.cham.tong}/${b.cham.toiDa} · sửa` : "Chấm bài"}</button>` : ""}</li>`; }).join("")}</ul>`
    : '<p class="muted">Chưa có học viên nào bắt đầu làm đề này.</p>'}<div class="hop-nut"><button class="btn" type="button" data-dong>Đóng</button></div>`, "Bài nộp");
  h.el.querySelectorAll("[data-cham]").forEach(b => b.onclick = () => { h.dong(); moCham(t, D.bai.find(x => x.id === b.dataset.cham)); });
}
function moCham(t, b) {
  const { db, fs: { doc, setDoc } } = C;
  const cu = {}; (b.cham?.ds || []).forEach(x => cu[x.ten] = x.diem);
  const h = C.moHop(`<h3>Chấm bài · ${esc(b.ten || b.mail)}</h3><p class="muted">${esc(t.tieuDe)} · nộp ${luc(b.nop)}</p>
    <div class="tt-xem lon">${(b.anh || []).map(anh).filter(Boolean).map((a, i) => `<button type="button" class="tt-anh-lon" data-lon="${i}" aria-label="Xem lớn ảnh ${i + 1}"><img src="${esc(a)}" alt="Bài làm ảnh ${i + 1}"></button>`).join("")}</div>
    ${b.ghiChu ? `<p><b>Học viên ghi:</b> ${esc(b.ghiChu)}</p>` : ""}
    <div class="tt-phieu">${t.tieuChi.map((x, i) => `<label><span>${esc(x.ten)} <small class="muted">/ ${x.toiDa}</small></span><input type="number" inputmode="decimal" step="0.25" min="0" max="${x.toiDa}" data-tc="${i}" value="${cu[x.ten] ?? ""}"></label>`).join("")}</div>
    <p><b>Tổng: <span id="ch-tong" class="num">0</span>/${tongDiem(t.tieuChi)}</b></p>
    <label>Nhận xét: bài tốt ở đâu, cần sửa gì<textarea id="ch-nx" maxlength="1500">${esc(b.cham?.nhanXet || "")}</textarea></label>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="ch-luu">Lưu kết quả</button></div>`, "Phiếu chấm");
  h.el.querySelectorAll("[data-lon]").forEach(x => x.onclick = () => x.classList.toggle("phong")); // bấm ảnh để phóng to / thu lại
  const o = [...h.el.querySelectorAll("[data-tc]")];
  const tinh = () => o.reduce((a, i) => a + (+i.value || 0), 0);
  o.forEach(i => i.oninput = () => { $("#ch-tong").textContent = Math.round(tinh() * 100) / 100; }); $("#ch-tong").textContent = Math.round(tinh() * 100) / 100;
  h.el.querySelector("#ch-luu").onclick = async e => {
    const ds = t.tieuChi.map((x, i) => ({ ten: x.ten, toiDa: x.toiDa, diem: Math.min(x.toiDa, Math.max(0, +o[i].value || 0)) }));
    if (o.some(i => i.value === "")) return C.toast("Còn tiêu chí chưa cho điểm.", "err");
    const cham = { ds, tong: Math.round(ds.reduce((a, x) => a + x.diem, 0) * 100) / 100, toiDa: tongDiem(t.tieuChi), nhanXet: val("ch-nx"), ai: C.mail, tenGV: C.ten, luc: Date.now() };
    if (await guiNut(e.target, () => setDoc(doc(db, "thithubai", b.id), { cham }, { merge: true }), "Đã lưu điểm ✓ Học viên thấy ngay.")) h.dong();
  };
}

/* ================= 2–5. VẬN HÀNH ================= */
function veVH() {
  const box = $("#vh-body"); if (!box) return;
  if (!C) { box.innerHTML = ""; return; }
  if (D.loi) { box.innerHTML = hopLoi(); return; }
  const tabs = C.isTeacher ? [["ca", "📅 Ca dạy"], ["cc", C.isAdmin ? "👀 Theo dõi GV" : "🗓 Chấm công"], ["bg", "🔁 Bàn giao"], ["sc", "🧰 Sự cố"], ["tn", "🧹 Trực nhật"], ...(C.isAdmin ? [["nk", "🕘 Nhật ký sửa"]] : [])] : [["tn", "🧹 Trực nhật"], ["sc", "🧰 Báo thiếu đồ, sự cố"]];
  if (!tabs.some(t => t[0] === tabVH)) tabVH = tabs[0][0];
  const scMoi = C.isAdmin ? D.suco.filter(s => s.trangThai === "moi").length : 0, dcCho = C.isAdmin ? D.doica.filter(d => d.trangThai === "cho").length : 0;
  const so = k => { const n = k === "sc" ? scMoi : k === "ca" ? dcCho : 0; return n ? ` <span class="nbadge num">${n}</span>` : ""; };
  // giữ nội dung đang gõ khi dữ liệu mới về: không vẽ lại khi người dùng đang nhập trong khung này
  const dangGo = box.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (dangGo && box.dataset.tab === tabVH) { const l = box.querySelector(".vh-ds-ngoai"); if (l && !l.contains(document.activeElement)) { l.innerHTML = danhSach(); ganDanhSach(); } return; }
  box.dataset.tab = tabVH;
  box.innerHTML = `<div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button class="tab" type="button" role="tab" data-vh="${k}" aria-selected="${k === tabVH}">${t}${so(k)}</button>`).join("")}</div>
    <div class="vh-pane">${({ ca: paneCa, cc: paneCC, bg: paneBG, sc: paneSC, tn: paneTN, nk: paneNK })[tabVH]()}<div class="vh-ds-ngoai">${danhSach()}</div></div>`;
  box.querySelectorAll("[data-vh]").forEach(b => b.onclick = () => { tabVH = b.dataset.vh; veVH(); });
  ({ ca: ganCa, cc: () => {}, bg: ganBG, sc: ganSC, tn: ganTN, nk: () => {} })[tabVH]();
  ganDanhSach();
}
const danhSach = () => ({ ca: dsCa, cc: dsCC, bg: dsBG, sc: dsSC, tn: dsTN, nk: dsNK })[tabVH]();
function ganDanhSach() {
  const box = $("#vh-body .vh-ds-ngoai"); if (!box) return;
  $$("#vh-body [data-x]").forEach(b => b.onclick = () => hanhDongVH(b.dataset.x, b.dataset.id, b));
  const tim = box.querySelector("#bg-tim"); if (tim) tim.oninput = () => { timBG = tim.value; const l = box.querySelector("#bg-kq"); if (l) { l.innerHTML = dsBGKetQua(); l.querySelectorAll("[data-x]").forEach(b => b.onclick = () => hanhDongVH(b.dataset.x, b.dataset.id, b)); } };
  box.querySelectorAll("[data-loc]").forEach(b => b.onclick = () => { locSC = b.dataset.loc; veVH(); });
  const nk = box.querySelector("#nk-loc"); if (nk) nk.onchange = () => { locNK = nk.value; veVH(); };
  const ct = box.querySelector("#ca-toi"); if (ct) ct.onchange = () => { chiCaToi = ct.checked; veVH(); };
}
function xacNhan(btn, viec, hoi = "Bấm lần nữa để chắc chắn") {
  if (btn.dataset.chac) { delete btn.dataset.chac; return viec(); }
  const cu = btn.textContent; btn.dataset.chac = 1; btn.textContent = hoi; setTimeout(() => { if (btn.dataset.chac) { delete btn.dataset.chac; btn.textContent = cu; } }, 4000);
}
function hanhDongVH(loai, id, btn) {
  const { db, fs: { doc, setDoc, deleteDoc } } = C;
  const nk = D.nk.find(x => x.id === id), sc = D.suco.find(x => x.id === id), dc = D.doica.find(x => x.id === id);
  if (loai === "cc-thang") { thangCC = id === "0" ? 0 : thangCC + Number(id); return ve(); }
  if (loai === "cc-gv") { gvCC = id; return ve(); }
  if (loai === "cc-cham") return moChamCong(D.ca.find(x => x.id === id));
  if (loai === "cc-gia") return datGiaCa(id);
  if (loai === "cc-link") return datLinkLuong(id);
  if (loai === "cc-csv") return taiBangCong();
  if (loai === "cc-vao" || loai === "cc-ra") return vaoRaCa(id, loai.slice(3), btn);
  if (loai === "cc-kpi") return datKPI(id);
  if (loai === "lich-tuan") { tuanLich = id === "0" ? 0 : tuanLich + Number(id); return ve(); }
  if (loai === "lich-cs") { csLich = id; return ve(); }
  if (loai === "lich-xep") { // điền sẵn ngày, ca, cơ sở vào khung Xếp ca; gợi ý trước giáo viên đúng môn
    const [n, ca, mon] = id.split("|"), f = $("#ca-ngay"); if (!f) return;
    f.value = n; $("#ca-ca").value = ca; $("#ca-cs").value = csLich;
    const sel = $("#ca-gv"), hop = [...sel.options].find(o => o.value !== C.mail && hopMon(monGV(o.value), mon)); if (hop) sel.value = hop.value;
    const k = f.closest("details"); if (k) k.open = true; k?.scrollIntoView({ block: "start", behavior: "smooth" }); setTimeout(() => sel.focus(), 300);
    return C.toast(`Đã điền ${TEN_THU[thuCua(n)]} ${ngayVN(n)} · ca ${tenCa(ca).toLowerCase()} · ${csLich}${mon ? " · môn " + mon : ""}. Chọn giáo viên rồi bấm Lưu ca.`);
  }
  if (loai === "xoa-ca") return xacNhan(btn, () => ghi(deleteDoc(doc(db, "caday", id)), "Đã xoá ca."));
  if (loai === "xoa-bg") return xacNhan(btn, () => ghi(deleteDoc(doc(db, "bangiao", id)), "Đã xoá bàn giao."));
  if (loai === "doi-ca") return moDoiCa(D.ca.find(x => x.id === id));
  if (loai === "dc-ok" || loai === "dc-khong") {
    const ok = loai === "dc-ok", ca = D.ca.find(x => x.id === dc.ca), thay = val("dc-thay-" + id);
    const tv = C.giaoVien().find(g => g.id === thay);
    return guiNut(btn, async () => {
      if (ok && ca && tv) await setDoc(doc(db, "caday", ca.id), { gv: tv.id, gvTen: tv.ten }, { merge: true });
      await setDoc(doc(db, "doica", id), { trangThai: ok ? "dongy" : "tuchoi", xuLy: C.mail, xuLyLuc: Date.now() }, { merge: true });
    }, ok ? "Đã đồng ý đổi ca ✓" : "Đã từ chối.");
  }
  if (loai === "huy-dc") return xacNhan(btn, () => ghi(deleteDoc(doc(db, "doica", id)), "Đã huỷ yêu cầu."));
  if (loai === "sc-buoc") { const tiep = { moi: "danhan", danhan: "dangxuly", dangxuly: "xong" }[sc.trangThai]; if (!tiep) return;
    return guiNut(btn, () => setDoc(doc(db, "suco", id), { trangThai: tiep, capNhat: Date.now(), xuLy: C.mail, phanHoi: val("sc-ph-" + id).slice(0, 500) || sc.phanHoi || "" }, { merge: true }), "Đã cập nhật ✓"); }
  if (loai === "sc-anh") return C.moHop(`<img src="${esc(anh(sc.anh))}" alt="Ảnh sự cố" style="width:100%;border-radius:12px"><div class="hop-nut"><button class="btn" type="button" data-dong>Đóng</button></div>`, "Ảnh sự cố");
  if (loai === "sua-tn") return moSuaTruc(id);
  if (loai === "nk-khoi") return xacNhan(btn, () => khoiPhuc(nk), "Bấm lần nữa để khôi phục");
}

/* ---- 2. Ca dạy & đổi ca ---- */
function paneCa() {
  if (!C.isAdmin) return `<p class="muted">Lịch ca anh chị phụ trách trong 2 tuần tới. Bận thì bấm <b>Xin đổi ca</b>, quản lý duyệt sẽ báo lại ở đây.</p>`;
  const gv = [[C.mail, C.ten + " (quản lý)"], ...C.giaoVien().map(g => [g.id, (g.ten || g.id) + (g.chucVu ? " · " + g.chucVu : "") + (g.mon ? " · " + g.mon : "")])];
  return `<details class="card vh-form" open><summary><b>+ Xếp ca dạy</b></summary>
    <div class="fgrid"><label>Ngày<input type="date" id="ca-ngay" value="${C.homNay()}"></label><label>Ca${chonCa("ca-ca", "toi")}</label>
    <label>Cơ sở${chonCS("ca-cs")}</label><label>Giáo viên${chon("ca-gv", gv)}</label></div>
    <label>Ghi chú (lớp, nội dung chính)<input id="ca-gc" maxlength="200" placeholder="VD: Lớp Khối H · tượng Đavít"></label>
    <label class="vh-check"><input type="checkbox" id="ca-lap"> Lặp lại cùng giờ 4 tuần liên tiếp</label>
    <button class="btn primary" type="button" id="ca-luu">Lưu ca</button></details>`;
}
function ganCa() {
  const b = $("#ca-luu"); if (!b) return;
  const { db, fs: { doc, setDoc, collection, writeBatch } } = C;
  b.onclick = () => {
    const ngay = val("ca-ngay"), gv = val("ca-gv"); if (!ngay) return C.toast("Chọn ngày.", "err");
    const ten = gv === C.mail ? C.ten : (C.giaoVien().find(g => g.id === gv) || {}).ten || gv;
    const lan = $("#ca-lap").checked ? 4 : 1;
    guiNut(b, async () => { const bt = writeBatch(db);
      for (let i = 0; i < lan; i++) { const d = new Date(ngay + "T12:00:00"); d.setDate(d.getDate() + 7 * i);
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        bt.set(doc(collection(db, "caday")), { ngay: iso, ca: val("ca-ca"), coSo: val("ca-cs"), gv, gvTen: ten, ghiChu: val("ca-gc"), tao: Date.now() }); }
      await bt.commit(); }, lan > 1 ? `Đã xếp ${lan} ca ✓` : "Đã xếp ca ✓");
  };
}
function dsCa() {
  const hom = C.homNay(), het = (() => { const d = new Date(hom + "T12:00:00"); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  const caoCa = c => CA_HOC.findIndex(x => x.ma === c.ca);
  const ds = D.ca.filter(c => c.ngay >= hom && c.ngay <= het && (!chiCaToi || c.gv === C.mail)).sort((a, b) => a.ngay.localeCompare(b.ngay) || caoCa(a) - caoCa(b));
  const choDC = new Set(D.doica.filter(d => d.trangThai === "cho").map(d => d.ca));
  let h = lichPhanCong() + `<label class="vh-check"><input type="checkbox" id="ca-toi"${chiCaToi ? " checked" : ""}> Chỉ ca của tôi</label>`;
  const nhom = {}; ds.forEach(c => (nhom[c.ngay] ||= []).push(c));
  h += Object.keys(nhom).length ? Object.entries(nhom).map(([n, cs]) => `<div class="vh-ngay${n === hom ? " hom" : ""}"><h3>${TEN_THU[thuCua(n)]} ${ngayVN(n)}${n === hom ? ' <span class="chip">Hôm nay</span>' : ""}</h3>
    ${cs.map(c => `<div class="vh-ca${c.gv === C.mail ? " toi" : ""}"><div><b>Ca ${esc(tenCa(c.ca).toLowerCase())} <span class="num muted">${esc(gioCa(c.ca))}</span> · ${esc(c.coSo)}</b>
      <small>${esc(c.gvTen || c.gv)}${c.gv === C.mail ? " (anh/chị)" : ""}${c.ghiChu ? " · " + esc(c.ghiChu) : ""}</small></div>
      <div class="vh-nut">${choDC.has(c.id) ? '<span class="chip warn">Đang xin đổi</span>' : c.gv === C.mail ? `<button class="btn small" type="button" data-x="doi-ca" data-id="${esc(c.id)}">Xin đổi ca</button>` : ""}
      ${C.isAdmin ? `<button class="btn small" type="button" data-x="xoa-ca" data-id="${esc(c.id)}">Xoá</button>` : ""}</div></div>`).join("")}</div>`).join("")
    : `<p class="muted vh-trong">${chiCaToi ? "Anh/chị chưa có ca nào trong 2 tuần tới." : C.isAdmin ? "Chưa xếp ca nào trong 2 tuần tới. Dùng khung “Xếp ca dạy” ở trên." : "Quản lý chưa xếp ca trong 2 tuần tới."}</p>`;
  const dcs = D.doica.filter(d => C.isAdmin ? d.trangThai === "cho" : true).slice(0, 20);
  if (dcs.length) {
    const gv = C.giaoVien();
    h += `<h3 class="vh-h2">${C.isAdmin ? "Yêu cầu đổi ca chờ duyệt" : "Yêu cầu đổi ca của tôi"}</h3>` + dcs.map(d => { const ca = D.ca.find(x => x.id === d.ca);
      const tt = { cho: '<span class="chip warn">Chờ duyệt</span>', dongy: '<span class="chip ok">Đã đồng ý</span>', tuchoi: '<span class="chip bad">Không đồng ý</span>' }[d.trangThai] || "";
      return `<div class="card vh-the cot"><div class="vh-dong"><b>${esc(d.tuTen || d.tu)} xin đổi ${ca ? `ca ${esc(tenCa(ca.ca).toLowerCase())} ${ngayVN(ca.ngay)} · ${esc(ca.coSo)}` : "(ca đã xoá)"}</b>${tt}</div>
        <p>${esc(d.lyDo)}${d.thay ? ` · Đề xuất người dạy thay: <b>${esc(d.thay)}</b>` : ""}</p>
        ${C.isAdmin && d.trangThai === "cho" ? `<div class="vh-nut"><label class="vh-inline">Người dạy thay${chon("dc-thay-" + d.id, [["", "— giữ nguyên —"], ...gv.map(g => [g.id, g.ten || g.id])])}</label>
          <button class="btn small primary" type="button" data-x="dc-ok" data-id="${esc(d.id)}">Đồng ý</button><button class="btn small" type="button" data-x="dc-khong" data-id="${esc(d.id)}">Không đồng ý</button></div>`
        : !C.isAdmin && d.trangThai === "cho" ? `<button class="btn small" type="button" data-x="huy-dc" data-id="${esc(d.id)}">Huỷ yêu cầu</button>` : ""}</div>`; }).join("");
  }
  return h;
}
// Lịch tuần phân công dạy: mỗi ô = một ca trong ngày ở cơ sở đang xem, hiện môn của ca (theo thời gian biểu) và ai dạy
const monGV = id => { const g = (C.giaoVien() || []).find(x => x.id === id); return (g && g.mon) || ""; };
const hopMon = (monGv, monCa) => !monGv || monGv === "Tất cả" || monGv.includes(monCa) || (monCa === "Hình hoạ" && /hình hoạ/i.test(monGv));
function lichPhanCong() {
  if (!csLich || !CO_SO.includes(csLich)) csLich = CO_SO[0];
  const goc = new Date(C.homNay() + "T12:00:00"); goc.setDate(goc.getDate() - ((goc.getDay() + 6) % 7) + 7 * tuanLich); // thứ 2 của tuần
  const ngay = Array.from({ length: 7 }, (_, i) => { const d = new Date(goc); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
  const tkb = THOI_GIAN_BIEU["Cơ sở " + csLich] || {}, hom = C.homNay();
  const o = (n, ca) => {
    const mon = (tkb[ca.ma] || {})[thuCua(n)], ds = D.ca.filter(c => c.ngay === n && c.ca === ca.ma && c.coSo === csLich);
    if (!mon && !ds.length) return `<td class="lpc-nghi"></td>`;
    return `<td class="${n === hom ? "hom" : ""}${mon && !ds.length ? " thieu" : ""}">${mon ? `<span class="lpc-mon">${esc(mon)}</span>` : ""}
      ${ds.map(c => `<span class="lpc-gv${c.gv === C.mail ? " toi" : ""}">${esc(c.gvTen || c.gv)}</span>`).join("")}
      ${C.isAdmin ? `<button type="button" class="lpc-xep" data-x="lich-xep" data-id="${esc(n + "|" + ca.ma + "|" + (mon || ""))}">${ds.length ? "+ Thêm" : "+ Xếp"}</button>` : !ds.length && mon ? `<small class="muted">Chưa xếp</small>` : ""}</td>`;
  };
  const thieu = ngay.reduce((a, n) => a + CA_HOC.filter(ca => (tkb[ca.ma] || {})[thuCua(n)] && !D.ca.some(c => c.ngay === n && c.ca === ca.ma && c.coSo === csLich)).length, 0);
  return `<section class="card lpc" aria-label="Lịch phân công dạy"><div class="lpc-dau"><b>Lịch phân công dạy</b>
      <div class="lpc-cs">${CO_SO.map(c => `<button type="button" class="tab" data-x="lich-cs" data-id="${esc(c)}" aria-selected="${c === csLich}">${esc(c)}</button>`).join("")}</div>
      <div class="lpc-tuan"><button type="button" class="btn small" data-x="lich-tuan" data-id="-1" aria-label="Tuần trước">‹</button><span class="num">${ngayVN(ngay[0]).slice(0, -5)} – ${ngayVN(ngay[6])}</span><button type="button" class="btn small" data-x="lich-tuan" data-id="1" aria-label="Tuần sau">›</button>${tuanLich ? `<button type="button" class="linkish" data-x="lich-tuan" data-id="0">Tuần này</button>` : ""}</div></div>
    ${thieu ? `<p class="lpc-bao">⚠ ${thieu} ca có lớp nhưng chưa xếp người dạy${C.isAdmin ? " — bấm “+ Xếp” ở ô tô vàng" : ""}.</p>` : `<p class="muted lpc-bao">Đủ người dạy cho các ca có lớp trong tuần này.</p>`}
    <div class="lpc-cuon"><table class="lpc-bang"><thead><tr><th></th>${ngay.map(n => `<th class="${n === hom ? "hom" : ""}">${TEN_THU[thuCua(n)].replace("Thứ ", "T")}<br><small class="num">${ngayVN(n).slice(0, -5)}</small></th>`).join("")}</tr></thead>
    <tbody>${CA_HOC.map(ca => `<tr><th>Ca ${esc(ca.ten.toLowerCase())}<br><small class="num muted">${esc(ca.gio)}</small></th>${ngay.map(n => o(n, ca)).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
/* ================= CHẤM CÔNG · TỔNG CÔNG · LƯƠNG · HẠCH TOÁN THEO CƠ SỞ =================
   Mỗi ca đã xếp (caday) là một buổi công. Quản lý bấm vào ca trên lịch tháng để chấm:
   Có mặt = 1 công · Nửa công = 0,5 · Vắng = 0. Giáo viên xem được công của mình. */
const CONG = [[1, "Có mặt", "ok"], [0.5, "Nửa công", "warn"], [0, "Vắng", "bad"]];
const csNgan = cs => /bình phú/i.test(cs) ? "BPhú" : /kim quan/i.test(cs) ? "KQuan" : cs;
const caNgan = ma => ({ sang: "S", chieu: "C", toi: "T" })[ma] || ma;
const vndCC = n => (Math.round(n || 0)).toLocaleString("vi-VN") + "đ";
const soCC = x => { let t = String(x ?? "").trim().replace(/\s|đ|₫/gi, ""); if (/^\d{1,3}([.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, ""); else t = t.replace(",", "."); return t === "" ? NaN : Number(t); };
const MUON_PHUT = 15, MUON_TOI_DA = 2; // vô ca trễ quá 15 phút là muộn; KPI cho phép tối đa 2 lần muộn/tháng
const gioBatDau = c => { const m = /^(\d{1,2})h(\d{2})/.exec(gioCa(c.ca)); return m ? new Date(`${c.ngay}T${pad(m[1])}:${m[2]}:00`).getTime() : 0; };
const laMuon = c => c.vao && gioBatDau(c) && c.vao > gioBatDau(c) + MUON_PHUT * 60000;
// công thực tế: quản lý chấm thì theo quản lý; chưa chấm mà đã vô ca + kết ca thì tự tính 1 công
const congCua = c => typeof c.cong === "number" ? c.cong : c.vao && c.ra ? 1 : null;
const gioPhut = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function kpiCua(k, g) {
  const cong = Object.values(k.cs).reduce((a, b) => a + b, 0), chiTieu = Number(g.kpiCong) || 0;
  const muc = [[`Công ≥ ${chiTieu || "?"}`, chiTieu ? cong >= chiTieu : null, chiTieu ? `${cong.toLocaleString("vi-VN")}/${chiTieu}` : "chưa đặt chỉ tiêu"],
    [`Đi muộn ≤ ${MUON_TOI_DA} lần`, k.muon <= MUON_TOI_DA, `${k.muon} lần`], ["Không vắng ca", k.vang === 0, `${k.vang} ca vắng`]];
  return { cong, chiTieu, muc, du: chiTieu > 0 && muc.every(x => x[1]) };
}
function thangDangXem() { const d = new Date(C.homNay() + "T12:00:00"); d.setDate(1); d.setMonth(d.getMonth() + thangCC); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
const dsGV = () => C.isAdmin ? C.giaoVien() : [{ id: C.mail, ten: C.ten, ...(C.gvToi() || {}) }];
function caTrongThang(thang) {
  const gv = C.isAdmin ? gvCC : C.mail;
  return D.ca.filter(c => String(c.ngay).startsWith(thang) && (!gv || c.gv === gv));
}
function tongCong(thang) {
  const kq = {};
  D.ca.filter(c => String(c.ngay).startsWith(thang) && (C.isAdmin || c.gv === C.mail)).forEach(c => {
    const k = kq[c.gv] ||= { gv: c.gv, ten: c.gvTen || c.gv, ca: 0, chua: 0, vang: 0, muon: 0, ngay: new Set(), cs: {} };
    k.ca++; const cs = csNgan(c.coSo), v = congCua(c); k.cs[cs] ||= 0; if (laMuon(c)) k.muon++;
    if (v === null) k.chua++; else { if (v === 0) k.vang++; else k.ngay.add(c.ngay); k.cs[cs] += v; }
  });
  return Object.values(kq).sort((a, b) => String(a.ten).localeCompare(String(b.ten), "vi"));
}
function paneCC() {
  return `<p class="muted">${C.isAdmin ? "Mỗi ca đã xếp ở mục Ca dạy là một buổi công. Giáo viên tự bấm <b>Vô ca</b>/<b>Kết ca</b> (đủ cả hai tự tính 1 công; ✓ đúng giờ, ⏰ muộn quá " + MUON_PHUT + " phút). Bấm vào ca trên lịch để chấm lại <b>Có mặt</b>, <b>Nửa công</b> hoặc <b>Vắng</b>. Cuối tháng xem tổng công, lương và hạch toán chi lương từng cơ sở ở bảng dưới lịch." : "Đến lớp bấm <b>Vô ca</b>, về bấm <b>Kết ca</b>. Lịch dưới cho thấy những ngày anh/chị đã đi và KPI tháng đủ hay thiếu."}</p>`;
}
function dsCC() {
  const thang = thangDangXem(), [y, m] = thang.split("-").map(Number), hom = C.homNay();
  const dau = new Date(y, m - 1, 1), lech = (dau.getDay() + 6) % 7, soNgay = new Date(y, m, 0).getDate();
  const ca = caTrongThang(thang), theoNgay = {}; ca.forEach(c => (theoNgay[c.ngay] ||= []).push(c));
  const o = [];
  for (let i = 0; i < lech; i++) o.push(`<div class="cc-o trong"></div>`);
  for (let d = 1; d <= soNgay; d++) {
    const n = `${thang}-${pad(d)}`, cs = (theoNgay[n] || []).sort((a, b) => CA_HOC.findIndex(x => x.ma === a.ca) - CA_HOC.findIndex(x => x.ma === b.ca));
    o.push(`<div class="cc-o${n === hom ? " hom" : ""}${(lech + d - 1) % 7 >= 5 ? " cuoituan" : ""}"><span class="cc-so num">${d}</span>
      ${cs.map(c => { const t = CONG.find(x => x[0] === congCua(c)); const nhan = `${c.vao ? (laMuon(c) ? "⏰" : "✓") : ""}${csNgan(c.coSo)} ${caNgan(c.ca)}${C.isAdmin && !gvCC ? " · " + esc(String(c.gvTen || "").split(" ").pop()) : ""}`;
        return C.isAdmin ? `<button type="button" class="cc-chip ${t ? t[2] : "chua"}" data-x="cc-cham" data-id="${esc(c.id)}" title="${esc((c.gvTen || c.gv) + " · ca " + tenCa(c.ca).toLowerCase() + " · " + c.coSo + " · " + (t ? t[1] : "chưa chấm") + (c.vao ? " · vào " + gioPhut(c.vao) + (laMuon(c) ? " (muộn)" : "") : "") + (c.ra ? " · ra " + gioPhut(c.ra) : ""))}">${nhan}</button>`
          : `<span class="cc-chip ${t ? t[2] : "chua"}" title="${esc((t ? t[1] : "Chưa chấm") + (c.vao ? " · vào " + gioPhut(c.vao) + (laMuon(c) ? " (muộn)" : "") : "") + (c.ra ? " · ra " + gioPhut(c.ra) : ""))}">${nhan}</span>`; }).join("")}</div>`);
  }
  const tc = tongCong(thang), gvMap = Object.fromEntries(dsGV().map(g => [g.id, g])), ngay = new Date(hom + "T12:00:00").getDate();
  const tongCS = {}; let tongLuong = 0, chuaChamTong = 0;
  const dong = tc.map(k => { const g = gvMap[k.gv] || {}, gia = Number(g.luongCa) || 0, cong = Object.values(k.cs).reduce((a, b) => a + b, 0); chuaChamTong += k.chua;
    Object.entries(k.cs).forEach(([cs, v]) => { tongCS[cs] = (tongCS[cs] || 0) + v * gia; }); tongLuong += cong * gia;
    const kp = kpiCua(k, g);
    return `<tr><td><b>${esc(k.ten)}</b>${g.chucVu ? `<small>${esc(g.chucVu)}${g.mon ? " · " + esc(g.mon) : ""}</small>` : ""}</td><td class="num">${k.ngay.size}</td><td class="num">${k.ca}</td>
      <td class="num">${(k.cs.BPhú || 0).toLocaleString("vi-VN")}</td><td class="num">${(k.cs.KQuan || 0).toLocaleString("vi-VN")}</td><td class="num"><b>${cong.toLocaleString("vi-VN")}</b></td>
      <td class="num">${k.vang || ""}${k.chua ? ` <span class="chip warn">${k.chua} chưa chấm</span>` : ""}</td><td class="num">${k.muon || ""}</td>
      <td><span class="chip ${kp.du ? "ok" : kp.chiTieu ? "bad" : ""}" title="${esc(kp.muc.map(x => x[0] + ": " + x[2]).join(" · "))}">${kp.du ? "Đủ KPI" : kp.chiTieu ? "Thiếu KPI" : "Chưa đặt"}</span>${C.isAdmin ? ` <button type="button" class="linkish" data-x="cc-kpi" data-id="${esc(k.gv)}">Chỉ tiêu</button>` : ""}</td>
      <td class="num">${gia ? vndCC(gia) : "—"}${C.isAdmin ? ` <button type="button" class="linkish" data-x="cc-gia" data-id="${esc(k.gv)}">Đặt</button>` : ""}</td><td class="num"><b>${gia ? vndCC(cong * gia) : "—"}</b></td>
      <td>${g.linkLuong ? `<a href="${esc(g.linkLuong)}" target="_blank" rel="noopener">Bảng lương ↗</a>` : '<span class="muted">—</span>'}${C.isAdmin ? ` <button type="button" class="linkish" data-x="cc-link" data-id="${esc(k.gv)}">${g.linkLuong ? "Đổi" : "Gắn link"}</button>` : ""}</td></tr>`; }).join("");
  const cuoiThang = C.isAdmin && thangCC === 0 && ngay >= 28 || C.isAdmin && thangCC === -1 && ngay <= 5;
  return `${cuoiThang ? `<div class="cc-bao">💰 <b>Cuối tháng ${m}/${y}:</b> tổng công đã sẵn sàng${chuaChamTong ? ` (còn <b>${chuaChamTong}</b> ca chưa chấm — chấm nốt trước khi gửi lương)` : ""}. Kiểm tra bảng dưới rồi gửi lương. <button type="button" class="btn small primary" data-x="cc-csv">Tải bảng công tháng</button></div>` : ""}
${caHomNay()}${C.isAdmin ? "" : kpiToi(tc, gvMap)}
    <section class="card cc" aria-label="Lịch chấm công tháng"><div class="cc-dau">
      <div class="lpc-tuan"><button type="button" class="btn small" data-x="cc-thang" data-id="-1" aria-label="Tháng trước">‹</button><b class="cc-thang">Tháng ${m}, ${y}</b><button type="button" class="btn small" data-x="cc-thang" data-id="1" aria-label="Tháng sau">›</button>${thangCC ? `<button type="button" class="linkish" data-x="cc-thang" data-id="0">Tháng này</button>` : ""}</div>
      ${C.isAdmin ? `<div class="lpc-cs cc-loc"><button type="button" class="tab" data-x="cc-gv" data-id="" aria-selected="${!gvCC}">Tất cả</button>${C.giaoVien().map(g => `<button type="button" class="tab" data-x="cc-gv" data-id="${esc(g.id)}" aria-selected="${gvCC === g.id}">${esc(g.ten || g.id)}</button>`).join("")}</div>` : ""}</div>
      <div class="cc-luoi" role="grid"><div class="cc-thu">T2</div><div class="cc-thu">T3</div><div class="cc-thu">T4</div><div class="cc-thu">T5</div><div class="cc-thu">T6</div><div class="cc-thu">T7</div><div class="cc-thu">CN</div>${o.join("")}</div>
      <p class="cc-chu"><span class="cc-chip chua">Chưa chấm</span><span class="cc-chip ok">Có mặt · 1 công</span><span class="cc-chip warn">Nửa công</span><span class="cc-chip bad">Vắng</span> <small class="muted">BPhú = Bình Phú · KQuan = Kim Quan · S/C/T = ca sáng/chiều/tối</small></p></section>
    <h3 class="vh-h2">Tổng công tháng ${m}/${y}${C.isAdmin ? " · lương · hạch toán theo cơ sở" : ""}</h3>
    ${tc.length ? `<div class="roster-wrap cc-bang-o"><table class="roster cc-bang"><thead><tr><th>Giáo viên</th><th>Ngày đi</th><th>Số ca</th><th>Công BPhú</th><th>Công KQuan</th><th>Tổng công</th><th>Vắng</th><th>Muộn</th><th>KPI</th><th>Đơn giá/ca</th><th>Lương</th><th>Bảng lương</th></tr></thead><tbody>${dong}</tbody>
      ${C.isAdmin ? `<tfoot><tr><th>Hạch toán chi lương</th><td colspan="11"><b>Bình Phú:</b> ${vndCC(tongCS.BPhú)} · <b>Kim Quan:</b> ${vndCC(tongCS.KQuan)} · <b>Tổng:</b> ${vndCC(tongLuong)}</td></tr></tfoot>` : ""}</table></div>
      ${C.isAdmin ? `<div class="vh-nut"><button type="button" class="btn small" data-x="cc-csv">Tải bảng công tháng (CSV, mở bằng Excel)</button></div>` : ""}`
      : `<p class="muted vh-trong">Tháng ${m}/${y} chưa có ca nào${C.isAdmin ? ". Xếp ca ở mục Ca dạy, mỗi ca là một buổi công." : " được xếp cho anh/chị."}</p>`}`;
}
// thẻ "Ca hôm nay": giáo viên tự bấm Vô ca khi đến lớp, Kết ca khi về (giống điểm danh của học viên)
function caHomNay() {
  if (C.isAdmin) return theoDoiHomNay();
  const ds = D.ca.filter(c => c.ngay === C.homNay() && c.gv === C.mail).sort((a, b) => gioBatDau(a) - gioBatDau(b));
  if (!ds.length) return C.isAdmin ? "" : `<section class="card cc-hom"><h3>Ca hôm nay</h3><p class="muted">Hôm nay anh/chị không có ca dạy.</p></section>`;
  return `<section class="card cc-hom" aria-label="Vô ca, kết ca hôm nay"><h3>Ca hôm nay</h3>${ds.map(c => `<div class="cc-hom-ca">
    <div><b>Ca ${esc(tenCa(c.ca).toLowerCase())}</b> <span class="num muted">${esc(gioCa(c.ca))}</span> · ${esc(c.coSo)}
      <small>${c.vao ? `Vào <b class="num">${gioPhut(c.vao)}</b>${laMuon(c) ? ' <span class="chip bad">muộn</span>' : ' <span class="chip ok">đúng giờ</span>'}` : "Chưa vô ca"}${c.ra ? ` · Ra <b class="num">${gioPhut(c.ra)}</b>` : ""}</small></div>
    ${!c.vao ? `<button type="button" class="btn primary" data-x="cc-vao" data-id="${esc(c.id)}">Vô ca</button>` : !c.ra ? `<button type="button" class="btn" data-x="cc-ra" data-id="${esc(c.id)}">Kết ca</button>` : '<span class="chip ok">Xong ca ✓</span>'}</div>`).join("")}</section>`;
}
// Quản lý: bảng theo dõi giáo viên đi dạy hôm nay — ai đã vô ca, đang dạy, muộn, chưa tới
function theoDoiHomNay() {
  const ds = D.ca.filter(c => c.ngay === C.homNay()).sort((a, b) => gioBatDau(a) - gioBatDau(b) || String(a.coSo).localeCompare(String(b.coSo), "vi"));
  const bay = Date.now();
  const tt = c => c.ra ? ["ok", "Đã kết ca"] : c.vao ? [laMuon(c) ? "warn" : "ok", laMuon(c) ? "Đang dạy · vào muộn" : "Đang dạy"] : gioBatDau(c) && bay > gioBatDau(c) + MUON_PHUT * 60000 ? ["bad", "Chưa vô ca"] : ["", "Chưa tới giờ"];
  const dem = { day: ds.filter(c => c.vao && !c.ra).length, xong: ds.filter(c => c.ra).length, thieu: ds.filter(c => tt(c)[0] === "bad").length };
  return `<section class="card cc-hom" aria-label="Theo dõi giáo viên đi dạy hôm nay"><h3>Hôm nay · ${ds.length} ca <small class="muted">${dem.day} đang dạy · ${dem.xong} xong ca${dem.thieu ? ` · <b class="cc-do">${dem.thieu} chưa vô ca</b>` : ""}</small></h3>
    ${ds.length ? ds.map(c => { const [k, chu] = tt(c); return `<div class="cc-hom-ca"><div><b>${esc(c.gvTen || c.gv)}</b> · ca ${esc(tenCa(c.ca).toLowerCase())} <span class="num muted">${esc(gioCa(c.ca))}</span> · ${esc(c.coSo)}
      <small>${c.vao ? `Vào <b class="num">${gioPhut(c.vao)}</b>` : "Chưa vô ca"}${c.ra ? ` · Ra <b class="num">${gioPhut(c.ra)}</b>` : ""}</small></div>
      <div class="cc-hom-nut"><span class="chip ${k}">${chu}</span>${c.gv === C.mail && !c.ra ? `<button type="button" class="btn ${c.vao ? "" : "primary"}" data-x="${c.vao ? "cc-ra" : "cc-vao"}" data-id="${esc(c.id)}">${c.vao ? "Kết ca" : "Vô ca"}</button>` : ""}</div></div>`; }).join("")
      : '<p class="muted">Hôm nay chưa xếp ca nào.</p>'}</section>`;
}
function kpiToi(tc, gvMap) {
  const k = tc.find(x => x.gv === C.mail) || { cs: {}, ca: 0, vang: 0, muon: 0, chua: 0, ngay: new Set() }, kp = kpiCua(k, gvMap[C.mail] || {});
  return `<section class="card cc-kpi" aria-label="KPI tháng của tôi"><h3>KPI tháng · <span class="chip ${kp.du ? "ok" : kp.chiTieu ? "bad" : ""}">${kp.du ? "Đủ — được xét thưởng" : kp.chiTieu ? "Còn thiếu" : "Quản lý chưa đặt chỉ tiêu"}</span></h3>
    <p class="muted">Đã đi <b class="num">${k.ngay.size}</b> ngày · <b class="num">${k.ca}</b> ca được xếp${k.chua ? ` · ${k.chua} ca chưa tính công` : ""}</p>
    <ul class="cc-kpi-ds">${kp.muc.map(([t, dat, so]) => `<li class="${dat === null ? "" : dat ? "ok" : "bad"}"><span>${dat === null ? "•" : dat ? "✓" : "✗"} ${esc(t)}</span><b class="num">${esc(so)}</b></li>`).join("")}</ul>
    ${kp.chiTieu ? `<div class="cc-thanh" role="progressbar" aria-valuemin="0" aria-valuemax="${kp.chiTieu}" aria-valuenow="${kp.cong}"><i style="width:${Math.min(100, kp.cong / kp.chiTieu * 100)}%"></i></div>` : ""}</section>`;
}
async function vaoRaCa(id, truong, btn) {
  const c = D.ca.find(x => x.id === id); if (!c || c.gv !== C.mail || c[truong]) return;
  if (truong === "vao" && c.ngay !== C.homNay()) return C.toast("Chỉ vô ca được trong ngày của ca.", "err");
  const { db, fs: { doc, setDoc } } = C;
  await guiNut(btn, () => setDoc(doc(db, "caday", id), { [truong]: Date.now() }, { merge: true }), truong === "vao" ? "Đã vô ca ✓ Dạy tốt nhé!" : "Đã kết ca ✓ Cảm ơn anh/chị!");
}
async function datKPI(gv) {
  const g = C.giaoVien().find(x => x.id === gv) || { ten: gv };
  const t = prompt(`Chỉ tiêu công/tháng để ${g.ten || gv} đủ KPI xét thưởng (VD 16). Ngoài ra KPI còn yêu cầu đi muộn ≤ ${MUON_TOI_DA} lần và không vắng ca:`, g.kpiCong || ""); if (t === null) return;
  const v = soCC(t); if (!(v >= 0)) return C.toast("Chỉ gõ số, VD 16.", "err");
  const { db, fs: { doc, setDoc } } = C; await ghi(setDoc(doc(db, "giaovien", gv), { kpiCong: v }, { merge: true }), "Đã đặt chỉ tiêu KPI ✓");
}
function moChamCong(c) {
  if (!c || !C.isAdmin) return;
  const { db, fs: { doc, setDoc, deleteField } } = C;
  const h = C.moHop(`<h3>Chấm công</h3><p><b>${esc(c.gvTen || c.gv)}</b> · ${TEN_THU[thuCua(c.ngay)]} ${ngayVN(c.ngay)} · ca ${esc(tenCa(c.ca).toLowerCase())} <span class="num muted">${esc(gioCa(c.ca))}</span> · ${esc(c.coSo)}</p>
    <div class="cc-chon">${CONG.map(([v, t, k]) => `<button type="button" class="btn ${c.cong === v ? "primary" : ""} cc-${k}" data-cong="${v}">${t}</button>`).join("")}<button type="button" class="btn" data-cong="">Bỏ chấm</button></div>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Đóng</button></div>`, "Chấm công");
  h.el.querySelectorAll("[data-cong]").forEach(b => b.onclick = async () => {
    const v = b.dataset.cong === "" ? deleteField() : Number(b.dataset.cong);
    if (await guiNut(b, () => setDoc(doc(db, "caday", c.id), { cong: v, chamBoi: C.mail, chamLuc: Date.now() }, { merge: true }), "Đã chấm công ✓")) h.dong();
  });
}
async function datGiaCa(gv) {
  const g = C.giaoVien().find(x => x.id === gv) || { ten: gv }, cu = Number(g.luongCa) || "";
  const t = prompt(`Đơn giá 1 công (1 ca) của ${g.ten || gv} (đ):`, cu); if (t === null) return;
  const v = soCC(t); if (!(v >= 0)) return C.toast("Số chưa đúng. Chỉ gõ số, VD 150.000.", "err");
  const { db, fs: { doc, setDoc } } = C; await ghi(setDoc(doc(db, "giaovien", gv), { luongCa: v }, { merge: true }), "Đã đặt đơn giá ✓");
}
async function datLinkLuong(gv) {
  const g = C.giaoVien().find(x => x.id === gv) || { ten: gv };
  const t = prompt(`Link bảng lương của ${g.ten || gv} (Google Drive, Canva… bắt đầu bằng https://). Để trống để bỏ link:`, g.linkLuong || ""); if (t === null) return;
  const v = t.trim(); if (v && !/^https:\/\/[^\s"'<>]+$/i.test(v)) return C.toast("Link phải bắt đầu bằng https://", "err");
  const { db, fs: { doc, setDoc } } = C; await ghi(setDoc(doc(db, "giaovien", gv), { linkLuong: v }, { merge: true }), v ? "Đã gắn link bảng lương ✓" : "Đã bỏ link ✓");
}
function taiBangCong() {
  const thang = thangDangXem(), gvMap = Object.fromEntries(dsGV().map(g => [g.id, g]));
  const ca = D.ca.filter(c => String(c.ngay).startsWith(thang)).sort((a, b) => String(a.gvTen).localeCompare(String(b.gvTen), "vi") || a.ngay.localeCompare(b.ngay));
  const rows = [["Giáo viên", "Ngày", "Ca", "Cơ sở", "Vào", "Ra", "Muộn", "Công", "Đơn giá/ca", "Thành tiền"], ...ca.map(c => { const gia = Number((gvMap[c.gv] || {}).luongCa) || 0, cong = congCua(c) ?? "";
    return [c.gvTen || c.gv, ngayVN(c.ngay), tenCa(c.ca), c.coSo, c.vao ? gioPhut(c.vao) : "", c.ra ? gioPhut(c.ra) : "", laMuon(c) ? "muộn" : "", cong === "" ? "chưa chấm" : cong, gia, cong === "" ? "" : cong * gia]; })];
  tongCong(thang).forEach(k => { const gia = Number((gvMap[k.gv] || {}).luongCa) || 0, cong = Object.values(k.cs).reduce((a, b) => a + b, 0); const kp = kpiCua(k, gvMap[k.gv] || {}); rows.push([k.ten + " — TỔNG", k.ngay.size + " ngày đi", "", "Bình Phú " + (k.cs.BPhú || 0) + " / Kim Quan " + (k.cs.KQuan || 0), "", "", k.muon + " lần", cong, gia, cong * gia, kp.du ? "Đủ KPI" : kp.chiTieu ? "Thiếu KPI" : ""]); });
  C.taiCSV("bang-cong-" + thang + ".csv", rows);
}
function moDoiCa(ca) {
  if (!ca) return;
  const { db, fs: { doc, setDoc, collection } } = C;
  const h = C.moHop(`<h3>Xin đổi ca</h3><p>Ca ${esc(tenCa(ca.ca).toLowerCase())} ${esc(gioCa(ca.ca))} · ${TEN_THU[thuCua(ca.ngay)]} ${ngayVN(ca.ngay)} · ${esc(ca.coSo)}</p>
    <label>Lý do<textarea id="dc-ly" maxlength="500" placeholder="VD: Có lịch thi, nhờ đổi sang tối thứ 5"></textarea></label>
    <label>Đã hỏi được người dạy thay? (không bắt buộc)<input id="dc-thay" maxlength="80" placeholder="Tên giáo viên"></label>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="dc-gui">Gửi quản lý</button></div>`, "Xin đổi ca");
  h.el.querySelector("#dc-gui").onclick = async e => {
    if (!val("dc-ly")) return C.toast("Ghi lý do để quản lý xếp lại nhé.", "err");
    if (await guiNut(e.target, () => setDoc(doc(collection(db, "doica")), { ca: ca.id, tu: C.mail, tuTen: C.ten, lyDo: val("dc-ly"), thay: val("dc-thay"), trangThai: "cho", luc: Date.now() }), "Đã gửi yêu cầu đổi ca ✓")) h.dong();
  };
}

/* ---- 2b. Bàn giao ---- */
const BG_NHAP = () => "vh-bg-nhap-" + (C?.mail || "");
function paneBG() {
  let nhap = null; try { nhap = JSON.parse(localStorage.getItem(BG_NHAP()) || "null"); } catch (e) {}
  const hv = nhap?.hv?.length ? nhap.hv : [{}];
  return `<details class="card vh-form" ${nhap ? "open" : ""}><summary><b>+ Ghi bàn giao cuối ca</b> <small class="muted">học viên đang làm gì, cần sửa gì, buổi sau làm tiếp phần nào</small></summary>
    <div class="fgrid"><label>Ngày<input type="date" id="bg-ngay" value="${esc(nhap?.ngay || C.homNay())}"></label><label>Ca${chonCa("bg-ca", nhap?.ca || "toi")}</label><label>Cơ sở${chonCS("bg-cs", nhap?.coSo)}</label></div>
    <datalist id="bg-hv-ds">${C.hocVien().map(h => `<option value="${esc(h.ten)}">`).join("")}</datalist>
    <div id="bg-dong">${hv.map(dongBG).join("")}</div>
    <button class="btn small" type="button" id="bg-them">+ Thêm học viên</button>
    <label>Ghi chú chung cho ca sau<textarea id="bg-gc" maxlength="1000" placeholder="VD: Hết giấy A3, đã báo quản lý">${esc(nhap?.ghiChu || "")}</textarea></label>
    <button class="btn primary" type="button" id="bg-luu">Lưu bàn giao</button> <span class="muted">Bản nháp tự lưu trên máy này.</span></details>`;
}
const dongBG = (x = {}) => `<fieldset class="bg-dong"><input list="bg-hv-ds" data-k="ten" maxlength="80" placeholder="Tên học viên" value="${esc(x.ten || "")}">
  <input data-k="dangLam" maxlength="200" placeholder="Đang làm bài gì" value="${esc(x.dangLam || "")}">
  <input data-k="canSua" maxlength="200" placeholder="Cần sửa gì" value="${esc(x.canSua || "")}">
  <input data-k="buoiSau" maxlength="200" placeholder="Buổi sau làm tiếp phần nào" value="${esc(x.buoiSau || "")}">
  <button type="button" class="btn small" data-bo aria-label="Bỏ dòng này">✕</button></fieldset>`;
function ganBG() {
  const box = $("#bg-dong"); if (!box) return;
  const doc_ = () => ({ ngay: val("bg-ngay"), ca: val("bg-ca"), coSo: val("bg-cs"), ghiChu: val("bg-gc"),
    hv: $$("#bg-dong .bg-dong").map(f => { const o = {}; f.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value.trim().slice(0, 200)); return o; }).filter(o => o.ten) });
  const luuNhap = () => { try { localStorage.setItem(BG_NHAP(), JSON.stringify({ ...doc_(), hv: $$("#bg-dong .bg-dong").map(f => { const o = {}; f.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value); return o; }) })); } catch (e) {} };
  const ganBo = () => box.querySelectorAll("[data-bo]").forEach(b => b.onclick = () => { if (box.children.length > 1) b.parentElement.remove(); else b.parentElement.querySelectorAll("input").forEach(i => i.value = ""); luuNhap(); });
  ganBo();
  $("#vh-body .vh-form").addEventListener("input", luuNhap);
  $("#bg-them").onclick = () => { box.insertAdjacentHTML("beforeend", dongBG()); ganBo(); box.lastElementChild.querySelector("input").focus(); };
  $("#bg-luu").onclick = e => {
    const d = doc_(); if (!d.hv.length) return C.toast("Ghi ít nhất 1 học viên (tên + việc đang làm).", "err");
    const { db, fs: { doc, setDoc, collection } } = C;
    guiNut(e.target, () => setDoc(doc(collection(db, "bangiao")), { ...d, hv: d.hv.slice(0, 40), ai: C.mail, ten: C.ten, luc: Date.now() }), "Đã lưu bàn giao ✓ Giáo viên ca sau xem được ngay.")
      .then(ok => { if (ok) { try { localStorage.removeItem(BG_NHAP()); } catch (er) {} veVH(); } });
  };
}
function dsBG() { return `<div class="vh-tim"><input type="search" id="bg-tim" placeholder="Tìm theo tên học viên (gõ không dấu cũng được)" value="${esc(timBG)}" aria-label="Tìm bàn giao theo tên học viên"></div><div id="bg-kq">${dsBGKetQua()}</div>`; }
function dsBGKetQua() {
  const q = bo(timBG);
  const ds = D.bg.filter(b => !q || (b.hv || []).some(h => bo(h.ten).includes(q)));
  if (!ds.length) return `<p class="muted vh-trong">${q ? "Không có bàn giao nào nhắc tới học viên này." : "Chưa có bàn giao nào. Cuối ca, ghi lại học viên đang làm gì để ca sau dạy tiếp đúng chỗ."}</p>`;
  return ds.slice(0, 40).map(b => `<div class="card vh-the cot"><div class="vh-dong"><b>${TEN_THU[thuCua(b.ngay)] || ""} ${ngayVN(b.ngay)} · ca ${esc(tenCa(b.ca).toLowerCase())} · ${esc(b.coSo)}</b>
    ${C.isAdmin || b.ai === C.mail ? `<button class="btn small" type="button" data-x="xoa-bg" data-id="${esc(b.id)}">Xoá</button>` : ""}</div>
    <small class="muted">Ghi bởi ${esc(b.ten || b.ai)} lúc ${luc(b.luc)}</small>
    <div class="bg-bang">${(b.hv || []).filter(h => !q || bo(h.ten).includes(q)).map(h => `<div><b>${esc(h.ten)}</b>${h.dangLam ? `<span><i>Đang làm</i>${esc(h.dangLam)}</span>` : ""}${h.canSua ? `<span><i>Cần sửa</i>${esc(h.canSua)}</span>` : ""}${h.buoiSau ? `<span><i>Buổi sau</i>${esc(h.buoiSau)}</span>` : ""}</div>`).join("")}</div>
    ${b.ghiChu ? `<p class="muted">📝 ${esc(b.ghiChu)}</p>` : ""}</div>`).join("");
}

/* ---- 3. Báo thiếu đồ & sự cố ---- */
const TT_SC = { moi: ["Mới gửi", "warn"], danhan: ["Đã nhận", "line"], dangxuly: ["Đang xử lý", "line"], xong: ["Hoàn thành", "ok"] };
const NUT_SC = { moi: "Đánh dấu đã nhận", danhan: "Bắt đầu xử lý", dangxuly: "Đánh dấu hoàn thành" };
const LOAI_SC = ["Thiếu đồ dùng", "Đồ hỏng", "Vệ sinh", "Điện, nước", "Khác"];
let anhSC = "";
function paneSC() {
  return `<details class="card vh-form"${C.isAdmin ? "" : " open"}><summary><b>+ Báo thiếu đồ / sự cố</b></summary>
    <div class="fgrid"><label>Cơ sở${chonCS("sc-cs")}</label><label>Loại${chon("sc-loai", LOAI_SC.map(x => [x, x]))}</label></div>
    <label>Mô tả<textarea id="sc-mt" maxlength="1000" placeholder="VD: Hết giấy A3; 2 bảng vẽ gãy chân; túi rác hết"></textarea></label>
    <label class="btn small">📷 Đính kèm ảnh (không bắt buộc)<input type="file" id="sc-anh" accept="image/*" hidden></label><div class="tt-xem" id="sc-xem"></div>
    <button class="btn primary" type="button" id="sc-gui">Gửi báo cáo</button></details>`;
}
function ganSC() {
  const xem = () => { $("#sc-xem").innerHTML = anhSC ? `<figure><img src="${esc(anh(anhSC))}" alt="Ảnh đính kèm"><button type="button" class="btn small" id="sc-bo">Bỏ ảnh</button></figure>` : ""; if ($("#sc-bo")) $("#sc-bo").onclick = () => { anhSC = ""; xem(); }; };
  xem();
  $("#sc-anh").onchange = async e => { try { anhSC = await C.nenAnh(e.target.files[0], 1200, 350000); xem(); } catch (er) { C.toast(er.message || "Ảnh lỗi", "err"); } };
  $("#sc-gui").onclick = e => {
    if (!val("sc-mt")) return C.toast("Ghi mô tả: thiếu gì, hỏng gì, ở đâu.", "err");
    const { db, fs: { doc, setDoc, collection } } = C;
    guiNut(e.target, () => setDoc(doc(collection(db, "suco")), { coSo: val("sc-cs"), loai: val("sc-loai"), moTa: val("sc-mt"), ...(anhSC ? { anh: anhSC } : {}), ai: C.mail, ten: C.ten, luc: Date.now(), capNhat: Date.now(), trangThai: "moi" }), "Đã gửi ✓ Quản lý sẽ xử lý và cập nhật trạng thái.")
      .then(ok => { if (ok) { anhSC = ""; veVH(); } });
  };
}
function dsSC() {
  const ds = D.suco.filter(s => locSC === "xong" ? s.trangThai === "xong" : s.trangThai !== "xong");
  const nMo = D.suco.filter(s => s.trangThai !== "xong").length;
  return `<div class="tabs nho"><button class="tab" type="button" data-loc="mo" aria-selected="${locSC !== "xong"}">Chưa xong (${nMo})</button><button class="tab" type="button" data-loc="xong" aria-selected="${locSC === "xong"}">Đã xong (${D.suco.length - nMo})</button></div>`
    + (ds.length ? ds.map(s => { const [tt, cls] = TT_SC[s.trangThai] || ["?", ""];
      return `<div class="card vh-the cot"><div class="vh-dong"><b>${esc(s.loai)} · ${esc(s.coSo)}</b><span class="chip ${cls}">${tt}</span></div>
        <p>${esc(s.moTa)}</p>${anh(s.anh) ? `<button class="vh-anh" type="button" data-x="sc-anh" data-id="${esc(s.id)}"><img src="${esc(anh(s.anh))}" alt="Ảnh sự cố"></button>` : ""}
        <small class="muted">${esc(s.ten || s.ai)} gửi lúc ${luc(s.luc)}${s.capNhat && s.capNhat !== s.luc ? " · cập nhật " + luc(s.capNhat) : ""}</small>
        ${s.phanHoi ? `<p class="tt-nx"><b>Quản lý:</b> ${esc(s.phanHoi)}</p>` : ""}
        ${C.isAdmin && NUT_SC[s.trangThai] ? `<div class="vh-nut"><input id="sc-ph-${esc(s.id)}" maxlength="500" placeholder="Phản hồi (VD: đã mua, chiều mai mang tới)" aria-label="Phản hồi"><button class="btn small primary" type="button" data-x="sc-buoc" data-id="${esc(s.id)}">${NUT_SC[s.trangThai]}</button></div>` : ""}</div>`; }).join("")
      : `<p class="muted vh-trong">${locSC === "xong" ? "Chưa có báo cáo nào hoàn thành." : "Không có sự cố nào đang chờ. Lớp đang đủ đồ 👍"}</p>`);
}

/* ---- 4. Trực nhật & kiểm tra cuối buổi ---- */
function paneTN() {
  const hom = C.homNay(), thu = thuCua(hom);
  let h = `<div class="vh-tn">${CO_SO.map(cs => { const t = D.truc[maCS(cs)] || {};
    return `<div class="card vh-the cot"><div class="vh-dong"><b>Trực nhật · ${esc(cs)}</b>${C.isTeacher ? `<button class="btn small" type="button" data-x="sua-tn" data-id="${esc(cs)}">Sửa lịch</button>` : ""}</div>
      <p class="vh-hom">Hôm nay (${TEN_THU[thu]}): <b>${esc(t[thu] || "chưa phân công")}</b></p>
      <ul class="tn-tuan">${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => `<li class="${d === thu ? "hom" : ""}"><span>${TEN_THU[d]}</span><b>${esc(t[d] || "—")}</b></li>`).join("")}</ul></div>`; }).join("")}</div>
    <div class="card vh-the cot"><b>Việc cần làm cuối buổi</b><ol class="tn-viec">${VIEC_CUOI_BUOI.map(v => `<li>${esc(v)}</li>`).join("")}</ol></div>`;
  if (C.isTeacher) h += `<div class="card vh-form"><b>Kiểm tra cuối buổi</b><p class="muted">Tick từng việc trước khi kết thúc ca. Việc nào chưa xong thì ghi lý do.</p>
    <div class="fgrid"><label>Cơ sở${chonCS("kt-cs")}</label><label>Ca${chonCa("kt-ca", caGan())}</label></div>
    <div class="kt-ds">${VIEC_CUOI_BUOI.map((v, i) => `<label class="vh-check"><input type="checkbox" data-kt="${i}"> ${esc(v)}</label>`).join("")}</div>
    <label>Ghi chú (bắt buộc nếu còn việc chưa xong)<input id="kt-gc" maxlength="300"></label>
    <button class="btn primary" type="button" id="kt-luu">Xác nhận kết thúc ca</button></div>`;
  return h;
}
const caGan = () => { const g = new Date().getHours(); return g < 13 ? "sang" : g < 18 ? "chieu" : "toi"; };
function ganTN() {
  const b = $("#kt-luu"); if (!b) return;
  b.onclick = () => {
    const xong = $$("[data-kt]").map(i => i.checked), du = xong.every(Boolean);
    if (!du && !val("kt-gc")) return C.toast("Còn việc chưa tick: ghi lý do vào ô Ghi chú.", "err");
    const { db, fs: { doc, setDoc } } = C, ngay = C.homNay(), cs = val("kt-cs"), ca = val("kt-ca");
    guiNut(b, () => setDoc(doc(db, "kiemtra", `${ngay}__${maCS(cs)}__${ca}`), { ngay, coSo: cs, ca, xong, du, ghiChu: val("kt-gc"), ai: C.mail, ten: C.ten, luc: Date.now() }), du ? "Đã xác nhận cuối buổi ✓ Cảm ơn anh/chị!" : "Đã ghi nhận, kèm việc còn thiếu.")
      .then(ok => { if (ok) veVH(); });
  };
}
function dsTN() {
  if (!C.isTeacher) return "";
  return `<h3 class="vh-h2">Lịch sử kiểm tra cuối buổi</h3>` + (D.kt.length ? D.kt.slice(0, 20).map(k => `<div class="vh-ca"><div><b>${ngayVN(k.ngay)} · ca ${esc(tenCa(k.ca).toLowerCase())} · ${esc(k.coSo)}</b>
    <small>${esc(k.ten || k.ai)} xác nhận lúc ${luc(k.luc)}${k.du ? "" : " · Chưa xong: " + esc(VIEC_CUOI_BUOI.filter((v, i) => !(k.xong || [])[i]).join(", "))}${k.ghiChu ? " · " + esc(k.ghiChu) : ""}</small></div>
    <span class="chip ${k.du ? "ok" : "warn"}">${k.du ? "✓ Đủ" : "⚠ Thiếu việc"}</span></div>`).join("") : '<p class="muted vh-trong">Chưa có lần kiểm tra nào.</p>');
}
function moSuaTruc(cs) {
  const { db, fs: { doc, setDoc } } = C, t = D.truc[maCS(cs)] || {};
  const h = C.moHop(`<h3>Lịch trực nhật · ${esc(cs)}</h3><p class="muted">Ghi tên người trực từng ngày (học viên hoặc nhóm), VD “An, Bình”.</p>
    ${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => `<label>${TEN_THU[d]}<input data-tn="${d}" maxlength="120" value="${esc(t[d] || "")}"></label>`).join("")}
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="tn-luu">Lưu lịch</button></div>`, "Lịch trực nhật");
  h.el.querySelector("#tn-luu").onclick = async e => {
    const data = { coSo: cs, capNhat: Date.now(), ai: C.mail }; h.el.querySelectorAll("[data-tn]").forEach(i => data[i.dataset.tn] = i.value.trim());
    if (await guiNut(e.target, () => setDoc(doc(db, "trucnhat", maCS(cs)), data), "Đã lưu lịch trực nhật ✓")) h.dong();
  };
}

/* ---- 5. Nhật ký sửa & khôi phục (quản lý) ---- */
export const TEN_BANG = { hocvien: "Học viên", giaovien: "Giáo viên", nhanxet: "Nhận xét, điểm bài tập", diemdanh: "Điểm danh", baitap: "Bài tập", giaotrinh: "Giáo trình", lichnhac: "Lịch nhắc",
  tiendo: "Tiến độ", xephang: "Xếp hạng", baive: "Bài vẽ", bantin: "Bản tin", kho: "Kho hoạ cụ", thongbao: "Thông báo", congviec: "Việc cần làm", doiten: "Đổi tên",
  caday: "Ca dạy", trucnhat: "Trực nhật", thithu: "Đề thi thử", thithubai: "Bài thi thử, điểm thi", suco: "Sự cố", bangiao: "Bàn giao", kiemtra: "Kiểm tra cuối buổi", doica: "Đổi ca" };
const LOAI_NK = { tao: ["thêm", "ok"], sua: ["sửa", "warn"], xoa: ["xoá", "bad"] };
function paneNK() { return `<p class="muted">Mọi lần giáo viên, quản lý thêm, sửa, xoá dữ liệu quan trọng đều được ghi lại kèm giá trị trước và sau. Xoá hoặc sửa nhầm thì bấm <b>Khôi phục bản trước</b>.</p>`; }
const ngan = v => { if (v === undefined) return "—"; const s = typeof v === "string" ? v : JSON.stringify(v); if (/^data:image\//.test(s)) return "(ảnh)"; return s.length > 140 ? s.slice(0, 140) + "…" : s; };
function dsNK() {
  const bangs = [...new Set(D.nk.map(n => n.col))];
  const ds = D.nk.filter(n => !locNK || n.col === locNK);
  return `<label class="vh-inline">Lọc theo dữ liệu<select id="nk-loc"><option value="">Tất cả</option>${bangs.map(b => `<option value="${esc(b)}"${b === locNK ? " selected" : ""}>${esc(TEN_BANG[b] || b)}</option>`).join("")}</select></label>`
    + (ds.length ? ds.map(n => { const [lt, cls] = LOAI_NK[n.loai] || [n.loai, ""];
      let truoc = null, sau = null; try { truoc = n.truoc ? JSON.parse(n.truoc) : null; } catch (e) {} try { sau = n.sau ? JSON.parse(n.sau) : null; } catch (e) {}
      const khoa = n.loai === "xoa" ? Object.keys(truoc || {}) : n.gop ? Object.keys(sau || {}) : [...new Set([...Object.keys(truoc || {}), ...Object.keys(sau || {})])].filter(k => JSON.stringify((truoc || {})[k]) !== JSON.stringify((sau || {})[k]));
      const coThe = n.truoc !== "(quá lớn)";
      return `<details class="card vh-nk"><summary><span class="chip ${cls}">${lt}</span> <b>${esc(TEN_BANG[n.col] || n.col)}</b> · ${esc(n.ma)}<small class="muted"> — ${esc(n.ten || n.ai)} lúc ${luc(n.luc)}</small></summary>
        <table class="nk-bang"><thead><tr><th>Mục</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${khoa.slice(0, 30).map(k => `<tr><td>${esc(k)}</td><td>${esc(ngan((truoc || {})[k]))}</td><td>${n.loai === "xoa" ? "(đã xoá)" : esc(ngan((sau || {})[k]))}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Không có thay đổi nội dung.</td></tr>'}</tbody></table>
        ${coThe ? `<button class="btn small" type="button" data-x="nk-khoi" data-id="${esc(n.id)}">${n.loai === "tao" ? "Huỷ thao tác thêm (xoá mục này)" : "Khôi phục bản trước"}</button>` : '<p class="muted">Bản trước quá lớn (có ảnh) nên không lưu được để khôi phục.</p>'}</details>`; }).join("")
      : '<p class="muted vh-trong">Chưa có thay đổi nào được ghi. Từ giờ mỗi lần sửa, xoá dữ liệu sẽ hiện ở đây.</p>');
}
async function khoiPhuc(n) {
  const { db, fs: { doc, getDoc, setDoc, deleteDoc, deleteField } } = C;
  if (!TEN_BANG[n.col] || !n.ma) return C.toast("Dòng nhật ký này không hợp lệ, không khôi phục.", "err");
  const ref = doc(db, n.col, n.ma);
  let truoc = null, sau = null; try { truoc = n.truoc ? JSON.parse(n.truoc) : null; sau = n.sau ? JSON.parse(n.sau) : null; } catch (e) {}
  let hien; try { const d = await getDoc(ref); hien = d.exists() ? d.data() : null; } catch (e) { return C.toast("Chưa đọc được dữ liệu hiện tại. Kiểm tra mạng rồi thử lại.", "err"); }
  if (n.loai === "tao") {
    if (!hien) return C.toast("Mục này đã không còn, không cần huỷ.");
    // Chỉ huỷ khi mục vẫn đúng như lúc được thêm (tránh xoá nhầm dữ liệu đã có từ trước hoặc đã sửa về sau)
    if (sau && JSON.stringify(hien) !== JSON.stringify(sau)) return C.toast("Mục này đã thay đổi sau lần thêm, không huỷ tự động được. Hãy sửa trực tiếp.", "err");
    return ghi(deleteDoc(ref), "Đã huỷ thao tác thêm ✓");
  }
  if (!truoc) return ghi(deleteDoc(ref), "Đã khôi phục (mục trước đó chưa có) ✓");
  if (!hien || n.loai === "xoa") return ghi(setDoc(ref, truoc), "Đã khôi phục bản trước ✓");
  // Sửa: chỉ trả lại các mục đã đổi trong lần này, giữ nguyên các thay đổi khác về sau
  const khoa = n.gop ? Object.keys(sau || {}) : [...new Set([...Object.keys(truoc), ...Object.keys(sau || {})])].filter(k => JSON.stringify(truoc[k]) !== JSON.stringify((sau || {})[k]));
  if (!khoa.length) return C.toast("Lần này không đổi mục nào, không cần khôi phục.");
  const va = {}; khoa.forEach(k => { va[k] = k in truoc ? truoc[k] : deleteField(); });
  return ghi(setDoc(ref, va, { merge: true }), "Đã khôi phục bản trước ✓");
}
