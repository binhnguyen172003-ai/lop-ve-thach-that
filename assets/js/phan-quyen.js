/* ================= PHÂN QUYỀN HỆ THỐNG (chỉ quản lý) =================
   Cấp / sửa / thu hồi quyền nội dung cho từng nhân sự: vai trò, cơ sở, loại tài liệu, danh mục, tài liệu cụ thể, hành động, thời hạn.
   Duyệt (APPROVE) và Xuất bản (PUBLISH) là 2 ô riêng, không bao giờ tự chọn kèm nhau.
   Mỗi lần lưu ghi một dòng lịch sử phanquyen/{gmail}/ls (luật máy chủ bắt buộc). Xem trước quyền thực tế dùng đúng bộ xét của quyen.js. */
import * as Q from "./quyen.js?v=20261010pq";

let C = null, huy = [], pqAll = new Map(), loc = { q: "", kieu: "" }, ndDs = null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const gio = t => t ? new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const tenNg = m => (C.giaoVien().find(g => g.id === m) || {}).ten || (m === C.mail ? "Quản lý (anh/chị)" : m ? m.split("@")[0] : "");
// Nhóm ô hành động cho dễ nhìn; Phê duyệt và Xuất bản ở 2 nhóm khác nhau
const NHOM_HD = [["Soạn", ["VIEW", "CREATE", "EDIT", "SOURCE"]], ["Phê duyệt", ["APPROVE", "REVOKE"]], ["Xuất bản", ["PUBLISH", "MANAGE_ACCESS"]], ["Lưu trữ", ["ARCHIVE", "RESTORE", "DELETE"]]];
const CS_KHOA = { "*": "Mọi cơ sở được giao", "Bình Phú": "Bình Phú", "Kim Quan": "Kim Quan", chung: "Tài liệu chung 2 cơ sở" };

export function batDau(ctx) {
  dung(); C = ctx;
  const { db, fs: { collection, onSnapshot } } = C;
  const u = onSnapshot(collection(db, "phanquyen"), s => { pqAll = new Map(s.docs.map(d => [d.id, d.data()])); ve(); },
    e => { const g = $("#pq-goc"); if (g) g.innerHTML = `<p class="tv-loi">Chưa tải được bảng quyền${e && e.code === "permission-denied" ? ": cần dán luật bảo mật mới vào Firebase." : "."}</p>`; });
  huy.push(u); C.themHuy(u); ve();
}
export function dung() { huy.forEach(u => { try { u(); } catch (e) {} }); huy = []; pqAll = new Map(); ndDs = null; C = null; }

const coHd = (p, act) => Object.values(p?.cap || {}).some(g => (g.a || []).includes(act) && !(g.cam || []).includes(act) && (!g.het || g.het > Date.now()));
const oCo = (g, act) => (g.cam || []).includes(act) ? `<span class="pq-cam">Cấm</span>` : (g.a || []).includes(act) ? `<span class="pq-co">Có</span>` : `<span class="muted">Không</span>`;
function tenTL(id) { const d = ndDs && ndDs.find(x => x.id === id); return d ? `“${d.tieuDe}” (${Q.LOAI[d.loai]} · ${Q.CS_TAI_LIEU[d.cs]})` : "tài liệu " + id; }
function dongQuyen(k, g, keThua) {
  const doc = k.startsWith("doc:"), [l, dm, cs] = doc ? [] : k.split("|");
  const khac = (g.a || []).filter(x => !["APPROVE", "PUBLISH", "MANAGE_ACCESS"].includes(x)).map(x => Q.TEN_HD[x]);
  const cam = (g.cam || []).filter(x => !["APPROVE", "PUBLISH", "MANAGE_ACCESS"].includes(x)).map(x => Q.TEN_HD[x]);
  const het = g.het && g.het <= Date.now();
  return `<tr class="${keThua ? "pq-kt" : ""}${het ? " pq-het" : ""}">
    <td data-l="Loại tài liệu">${keThua ? "Mọi loại" : doc ? "Tài liệu cụ thể" : esc(Q.LOAI[l])}</td>
    <td data-l="Phạm vi">${keThua ? esc(keThua) : doc ? esc(tenTL(k.slice(4))) + (g.vuot ? ' <span class="pq-cam">vượt cơ sở</span>' : "") : `${esc(dm === "*" ? "Mọi danh mục" : dm)} · ${esc(CS_KHOA[cs])}`}</td>
    <td data-l="Duyệt">${oCo(g, "APPROVE")}</td><td data-l="Xuất bản">${oCo(g, "PUBLISH")}</td><td data-l="Quản lý quyền xem">${oCo(g, "MANAGE_ACCESS")}</td>
    <td data-l="Quyền khác">${esc(khac.join(", ") || "—")}${cam.length ? ` <span class="pq-cam">Cấm: ${esc(cam.join(", "))}</span>` : ""}</td>
    <td data-l="Thời hạn · người cấp">${keThua ? "Kế thừa vai trò" : `${g.het ? (het ? "⛔ Hết hạn " : "Đến ") + gio(g.het) : "Không thời hạn"}${g.boi ? `<br><small class="muted">${esc(tenNg(g.boi))} · ${gio(g.luc)}</small>` : ""}`}</td></tr>`;
}
export function ve() {
  const g = $("#pq-goc"); if (!g || !C) return;
  const dangGo = document.activeElement && document.activeElement.id === "pq-q";
  const gv = C.giaoVien().filter(t => {
    const p = pqAll.get(t.id), w = bo(loc.q).split(" ").filter(Boolean);
    if (!w.every(x => bo(t.ten + " " + t.id).includes(x))) return false;
    if (loc.kieu === "duyet") return coHd(p, "APPROVE"); if (loc.kieu === "xb") return coHd(p, "PUBLISH");
    if (loc.kieu === "khoa") return p && p.khoa; if (loc.kieu === "chua") return !p;
    return true;
  });
  g.innerHTML = `<details class="pq-giai"><summary>Cách hệ thống xét quyền (8 mức)</summary><ol>
      <li><b>Bảo mật</b>: tài khoản bị khoá, quyền hết hạn, quyền bị <b>Cấm</b>, tự duyệt bản của mình → từ chối ngay.</li>
      <li><b>Vai trò</b>: Quản lý cơ sở kế thừa Xem / Tạo / Sửa trong cơ sở của mình; Giáo viên không kế thừa gì.</li>
      <li><b>Cơ sở</b>: quyền ở Bình Phú không mở sang Kim Quan. Tài liệu chung cần cả 2 cơ sở.</li>
      <li><b>Loại</b>: quyền Video không áp dụng cho Ebook.</li><li><b>Danh mục</b>.</li><li><b>Tài liệu cụ thể</b> (chỉ vượt cơ sở khi bật uỷ quyền đặc biệt).</li>
      <li><b>Hành động</b>: Sửa không thay được Phê duyệt hay Xuất bản; Thay link nguồn là quyền riêng.</li><li><b>Trạng thái</b>: chỉ bản đã duyệt mới xuất bản được.</li></ol>
      <p class="muted">Cấm luôn thắng cho phép, kể cả quyền cấp sau. Mọi thay đổi có hiệu lực ngay với cả người đang đăng nhập.</p></details>
    <div class="pq-loc"><input id="pq-q" type="search" placeholder="Tìm nhân sự…" value="${esc(loc.q)}" aria-label="Tìm nhân sự" autocomplete="off">
      <select id="pq-kieu" aria-label="Lọc">${[["", "Tất cả nhân sự"], ["duyet", "Có quyền Phê duyệt"], ["xb", "Có quyền Xuất bản"], ["khoa", "Đang bị khoá"], ["chua", "Chưa cấp quyền"]].map(([v, t]) => `<option value="${v}"${loc.kieu === v ? " selected" : ""}>${t}</option>`).join("")}</select></div>
    ${gv.length ? gv.map(t => {
      const p = pqAll.get(t.id), cb = p ? Q.canhBao(p) : [];
      const kt = p && p.vaiTro === "qlcs" ? [["kt", { a: Q.KE_THUA.qlcs }, "Kế thừa Quản lý cơ sở · " + ((p.coSo || []).join(", ") || "chưa có cơ sở")]] : [];
      const dong = p ? [...kt.map(([k, g2, ten]) => dongQuyen(k, g2, ten)), ...Object.entries(p.cap || {}).map(([k, g2]) => dongQuyen(k, g2))] : [];
      return `<article class="pq-tk${p && p.khoa ? " khoa" : ""}" data-pq="${esc(t.id)}"><header>
        <div><b>${esc(t.ten || t.id)}</b> <small class="muted">${esc(t.id)}</small><span class="pq-chip">${p ? esc(Q.VAI_TRO[p.vaiTro] || p.vaiTro) : "Chưa cấp quyền nội dung"}</span>${p ? `<span class="pq-chip">${esc((p.coSo || []).join(" + ") || "Chưa có cơ sở")}</span>` : ""}${p && p.khoa ? `<span class="pq-chip pq-cam">🔒 Đang khoá</span>` : ""}</div>
        <div class="pq-nut"><button type="button" class="btn small primary" data-pqsua="${esc(t.id)}">${p ? "Sửa quyền" : "Cấp quyền"}</button>${p ? `<button type="button" class="btn small" data-pqxem="${esc(t.id)}">Xem trước quyền thực tế</button><button type="button" class="btn small" data-pqls="${esc(t.id)}">Lịch sử</button>` : ""}</div></header>
        ${dong.length ? `<div class="pq-bang-o"><table class="pq-bang"><thead><tr><th>Loại tài liệu</th><th>Phạm vi</th><th>Duyệt</th><th>Xuất bản</th><th>Quản lý quyền xem</th><th>Quyền khác</th><th>Thời hạn · người cấp</th></tr></thead><tbody>${dong.join("")}</tbody></table></div>` : p ? `<p class="muted">Chưa có quyền nào (mặc định từ chối).</p>` : ""}
        ${cb.length ? `<ul class="pq-canh">${cb.map(x => `<li>⚠️ ${esc(x)}</li>`).join("")}</ul>` : ""}</article>`; }).join("")
      : `<div class="tv-trong"><b>${C.giaoVien().length ? "Không có nhân sự khớp bộ lọc." : "Chưa có giáo viên nào."}</b><span>Trao quyền giáo viên ở phần phía trên trước, sau đó cấp quyền nội dung ở đây.</span></div>`}`;
  const q = g.querySelector("#pq-q"); q.oninput = () => { loc.q = q.value; ve(); };
  g.querySelector("#pq-kieu").onchange = e => { loc.kieu = e.target.value; ve(); };
  g.querySelectorAll("[data-pqsua]").forEach(b => b.onclick = () => moSua(b.dataset.pqsua));
  g.querySelectorAll("[data-pqxem]").forEach(b => b.onclick = () => xemTruoc(pqAll.get(b.dataset.pqxem), b.dataset.pqxem));
  g.querySelectorAll("[data-pqls]").forEach(b => b.onclick = () => lichSu(b.dataset.pqls));
  if (dangGo) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  if (!ndDs) taiND();
}
async function taiND() {
  ndDs = [];
  try { const { getDocs, collection } = C.fs; const s = await getDocs(collection(C.db, "noidung")); ndDs = s.docs.map(d => ({ id: d.id, ...d.data() })); ve(); } catch (e) {}
}

/* ---------- Sửa quyền một tài khoản ---------- */
const dtLocal = t => { if (!t) return ""; const d = new Date(t - new Date(t).getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16); };
function moSua(mail) {
  const cu = pqAll.get(mail) || null, gvd = C.giaoVien().find(g => g.id === mail) || {};
  let st = JSON.parse(JSON.stringify(cu || { khoa: false, vaiTro: "gv", coSo: [gvd.coso].filter(x => Q.CO_SO.includes(x)), cap: {}, ghiChu: "" }));
  let dong = Object.entries(st.cap || {}).map(([k, g]) => ({ k, ...g }));
  const h = C.moHop(`<h3>Phân quyền: ${esc(gvd.ten || mail)}</h3><p class="muted">${esc(mail)}</p>
    <div class="fgrid"><label>Vai trò<select id="pq-vt">${Object.entries(Q.VAI_TRO).map(([k, t]) => `<option value="${k}"${st.vaiTro === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <fieldset class="pq-cs"><legend>Cơ sở được thao tác</legend>${Q.CO_SO.map(c => `<label class="tv-chk"><input type="checkbox" value="${esc(c)}"${st.coSo.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</fieldset></div>
    <label class="tv-chk pq-khoa"><input type="checkbox" id="pq-khoa"${st.khoa ? " checked" : ""}> <b>Khoá tài khoản</b> — ngừng mọi quyền nội bộ (bài tập, điểm danh, nội dung…) ngay lập tức</label>
    <p class="muted" id="pq-kt"></p>
    <h4>Quyền cấp riêng</h4><div id="pq-dong"></div><button type="button" class="btn small" id="pq-them">+ Thêm quyền</button>
    <ul class="pq-canh" id="pq-canh" aria-live="polite"></ul>
    <label>Ghi chú (không bắt buộc)<input id="pq-gc" maxlength="200" value="${esc(st.ghiChu || "")}"></label>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn" type="button" id="pq-xt">Xem trước quyền thực tế</button><button class="btn primary" type="button" id="pq-luu">Lưu &amp; ghi lịch sử</button></div>`, "Phân quyền");
  const E = s => h.el.querySelector(s);
  const goc = JSON.stringify(st);
  const oHd = (i, loai, ds) => Q.HANH_DONG.map(a => `<label class="tv-chk"><input type="checkbox" data-i="${i}" data-loai="${loai}" value="${a}"${(ds || []).includes(a) ? " checked" : ""}> ${Q.TEN_HD[a]}</label>`);
  const veDong = () => {
    E("#pq-dong").innerHTML = dong.map((r, i) => {
      const laDoc = r.k.startsWith("doc:"), [l, dm, cs] = laDoc ? ["video", "*", "*"] : r.k.split("|");
      return `<div class="pq-sua" data-i="${i}">
        <div class="fgrid"><label>Áp dụng cho<select data-f="kieu" data-i="${i}"><option value="pv"${laDoc ? "" : " selected"}>Loại + danh mục + cơ sở</option><option value="doc"${laDoc ? " selected" : ""}>Một tài liệu cụ thể</option></select></label>
        ${laDoc ? `<label>Tài liệu<select data-f="doc" data-i="${i}">${(ndDs || []).map(d => `<option value="${esc(d.id)}"${"doc:" + d.id === r.k ? " selected" : ""}>${esc(d.tieuDe)} — ${esc(Q.LOAI[d.loai])} · ${esc(Q.CS_TAI_LIEU[d.cs])}</option>`).join("")}${(ndDs || []).some(d => "doc:" + d.id === r.k) ? "" : `<option value="${esc(r.k.slice(4))}" selected>${esc(r.k.slice(4) || "— chọn tài liệu —")}</option>`}</select></label>
          <label class="tv-chk"><input type="checkbox" data-f="vuot" data-i="${i}"${r.vuot ? " checked" : ""}> Uỷ quyền đặc biệt: cho phép vượt giới hạn cơ sở</label>`
        : `<label>Loại tài liệu<select data-f="l" data-i="${i}">${Object.entries(Q.LOAI).map(([k, t]) => `<option value="${k}"${l === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
          <label>Danh mục<select data-f="dm" data-i="${i}"><option value="*">Mọi danh mục</option>${Q.DANH_MUC.map(x => `<option${dm === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
          <label>Cơ sở<select data-f="cs" data-i="${i}">${Object.entries(CS_KHOA).map(([k, t]) => `<option value="${esc(k)}"${cs === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>`}
        <label>Hết hạn (không bắt buộc)<input type="datetime-local" data-f="het" data-i="${i}" value="${dtLocal(r.het)}"></label></div>
        <div class="pq-hd"><b>Cho phép</b>${NHOM_HD.map(([ten, ds]) => `<span class="pq-nhom"><i>${ten}</i>${oHd(i, "a", r.a).filter((_, j) => ds.includes(Q.HANH_DONG[j])).join("")}</span>`).join("")}</div>
        <details class="pq-hd"${(r.cam || []).length ? " open" : ""}><summary><b>Cấm rõ ràng</b> (thắng mọi quyền cho phép)</summary>${oHd(i, "cam", r.cam).join("")}</details>
        <button type="button" class="btn small nguy" data-xoa="${i}">Thu hồi quyền này</button></div>`; }).join("") || `<p class="muted">Chưa có quyền cấp riêng.</p>`;
    capNhat();
  };
  const dung2 = () => {
    const cap = {}, trung = [];
    for (const r of dong) {
      if (!r.k || r.k === "doc:") continue;
      if (cap[r.k]) trung.push(Q.moTaKhoa(r.k));
      const cuG = (cu && cu.cap || {})[r.k], g = { a: r.a || [], cam: r.cam || [] };
      if (r.het) g.het = r.het; if (r.vuot) g.vuot = true;
      const giong = cuG && JSON.stringify([cuG.a || [], cuG.cam || [], cuG.het || 0, !!cuG.vuot]) === JSON.stringify([g.a, g.cam, g.het || 0, !!g.vuot]);
      g.boi = giong ? cuG.boi : C.mail; g.luc = giong ? cuG.luc : Date.now();
      cap[r.k] = g;
    }
    return { st: { khoa: E("#pq-khoa").checked, vaiTro: E("#pq-vt").value, coSo: Q.CO_SO.filter(c => h.el.querySelector(`.pq-cs input[value="${c}"]`).checked), cap, ghiChu: E("#pq-gc").value.trim() }, trung };
  };
  const capNhat = () => {
    const { st: s, trung } = dung2();
    E("#pq-kt").innerHTML = s.vaiTro === "qlcs" ? `Kế thừa từ vai trò: <b>Xem, Tạo, Chỉnh sửa</b> mọi loại tài liệu trong ${esc(s.coSo.join(" + ") || "(chưa chọn cơ sở)")}. Phê duyệt / Xuất bản / Thu hồi / Quản lý quyền xem vẫn phải cấp riêng.` : "Giáo viên không kế thừa quyền nội dung nào — chỉ có quyền cấp riêng bên dưới.";
    const w = [...trung.map(x => "Trùng phạm vi: " + x + " (chỉ giữ dòng cuối)"), ...Q.canhBao({ ...s, camXem: Q.camXemCua(s.cap) }), ...dong.filter(r => !(r.a || []).length && !(r.cam || []).length).map(() => "Có dòng quyền chưa chọn hành động nào (sẽ bị bỏ qua)")];
    E("#pq-canh").innerHTML = w.map(x => `<li>⚠️ ${esc(x)}</li>`).join("");
  };
  h.el.addEventListener("change", e => {
    const t = e.target, i = +t.dataset.i;
    if (t.dataset.loai) { const r = dong[i], ds = new Set(r[t.dataset.loai] || []); t.checked ? ds.add(t.value) : ds.delete(t.value); r[t.dataset.loai] = Q.HANH_DONG.filter(a => ds.has(a)); return capNhat(); }
    const f = t.dataset.f; if (!f) return capNhat();
    const r = dong[i], laDoc = r.k.startsWith("doc:"), [l, dm, cs] = laDoc ? ["video", "*", "*"] : r.k.split("|");
    if (f === "kieu") r.k = t.value === "doc" ? "doc:" + ((ndDs || [])[0]?.id || "") : "video|*|*";
    else if (f === "doc") r.k = "doc:" + t.value;
    else if (f === "vuot") r.vuot = t.checked;
    else if (f === "het") r.het = t.value ? Date.parse(t.value) : 0;
    else r.k = [f === "l" ? t.value : l, f === "dm" ? t.value : dm, f === "cs" ? t.value : cs].join("|");
    if (f === "kieu") veDong(); else capNhat();
  });
  h.el.addEventListener("click", e => { const x = e.target.closest("[data-xoa]"); if (x) { dong.splice(+x.dataset.xoa, 1); veDong(); } });
  E("#pq-them").onclick = () => { dong.push({ k: "video|*|" + (Q.CO_SO.find(c => h.el.querySelector(`.pq-cs input[value="${c}"]`).checked) || "*"), a: ["VIEW"], cam: [] }); veDong(); };
  E("#pq-xt").onclick = () => xemTruoc({ ...dung2().st }, mail);
  h.chanDong = () => JSON.stringify(dung2().st.cap) !== JSON.stringify(cu ? cu.cap || {} : {}) || JSON.stringify({ ...dung2().st, cap: 0 }) !== JSON.stringify({ khoa: !!st.khoa, vaiTro: st.vaiTro, coSo: st.coSo, cap: 0, ghiChu: st.ghiChu || "" }) ? "Thay đổi quyền chưa lưu." : "";
  let dang = false;
  E("#pq-luu").onclick = async () => {
    if (dang) return;
    const { st: s } = dung2(); for (const k of Object.keys(s.cap)) if (!s.cap[k].a.length && !s.cap[k].cam.length) delete s.cap[k];
    s.camXem = Q.camXemCua(s.cap);
    if (s.camXem.length > 10) return C.toast("Chỉ cấm xem riêng được tối đa 10 tài liệu cho một người.", "err");
    if (Object.keys(s.cap).length > 80) return C.toast("Tối đa 80 dòng quyền cho một người.", "err");
    const noi = Q.moTaThayDoi(cu, s); if (!noi.length) return h.dong(false, true);
    const hd = Q.loaiThayDoi(cu, s);
    if (hd === "khoa" && !confirm(`Khoá ${gvd.ten || mail}? Mọi quyền nội bộ ngừng ngay, kể cả khi đang đăng nhập.`)) return;
    dang = true;
    const luc = Date.now(), ma = Q.maHd(luc), { db, fs: { doc, writeBatch } } = C, b = writeBatch(db);
    b.set(doc(db, "phanquyen", mail), { ...s, capNhat: luc, capNhatBoi: C.mail, hdMa: ma });
    b.set(doc(db, "phanquyen", mail, "ls", ma), { ai: C.mail, luc, hd, noi: noi.join("\n").slice(0, 6000) });
    try { await b.commit(); h.dong(false, true); C.toast("Đã lưu quyền và ghi lịch sử.", "ok"); }
    catch (e) { dang = false; C.toast(e && e.code === "permission-denied" ? "Máy chủ từ chối: cần dán luật bảo mật mới (phần Phân quyền) vào Firebase." : "Chưa lưu được. Kiểm tra mạng rồi thử lại.", "err"); }
  };
  void goc; veDong();
}

/* ---------- Xem trước quyền thực tế ---------- */
function xemTruoc(p, mail) {
  const laGV = C.giaoVien().some(g => g.id === mail);
  const h = C.moHop(`<h3>Quyền thực tế: ${esc(tenNg(mail))}</h3><p class="muted">Kết quả tính đúng như máy chủ xét, theo thời điểm hiện tại${p && p.hdMa ? "" : " (theo bản đang chỉnh, chưa lưu)"}.</p>
    <div class="fgrid"><label>Xét trên<select id="xt-kieu"><option value="pv">Loại + danh mục + cơ sở</option><option value="doc">Một tài liệu cụ thể</option></select></label>
      <label data-pv>Loại<select id="xt-l">${Object.entries(Q.LOAI).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
      <label data-pv>Danh mục<select id="xt-dm">${Q.DANH_MUC.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>
      <label data-pv>Cơ sở<select id="xt-cs">${Object.entries(Q.CS_TAI_LIEU).map(([k, t]) => `<option value="${esc(k)}">${t}</option>`).join("")}</select></label>
      <label data-doc hidden>Tài liệu<select id="xt-doc">${(ndDs || []).map(d => `<option value="${esc(d.id)}">${esc(d.tieuDe)} — ${esc(Q.LOAI[d.loai])} · ${esc(Q.CS_TAI_LIEU[d.cs])} · ${esc(Q.TT[d.tt])}</option>`).join("") || "<option value=''>Chưa có tài liệu</option>"}</select></label></div>
    <div id="xt-kq"></div><div class="hop-nut"><button class="btn primary" type="button" data-dong>Đóng</button></div>`, "Xem trước quyền");
  const E = s => h.el.querySelector(s);
  const veKq = () => {
    const laDoc = E("#xt-kieu").value === "doc";
    h.el.querySelectorAll("[data-pv]").forEach(x => x.hidden = laDoc); h.el.querySelector("[data-doc]").hidden = !laDoc;
    const d = laDoc ? (ndDs || []).find(x => x.id === E("#xt-doc").value) : { loai: E("#xt-l").value, dm: E("#xt-dm").value, cs: E("#xt-cs").value, id: "" };
    if (!d) { E("#xt-kq").innerHTML = "<p class='muted'>Chọn một tài liệu.</p>"; return; }
    const doi = { loai: d.loai, dm: d.dm, cs: d.cs, id: d.id };
    const tt = laDoc ? { APPROVE: Q.xetTrangThai("duyet", d, mail), PUBLISH: Q.xetTrangThai("xuatban", d, mail), EDIT: Q.xetTrangThai("sua", d, mail), REVOKE: Q.xetTrangThai("thuhoi", d, mail) } : {};
    E("#xt-kq").innerHTML = `${laGV ? "" : `<p class="tv-loi">Gmail này hiện không có quyền giáo viên → mọi quyền nội bộ bị từ chối.</p>`}
      <table class="pq-bang pq-xt"><thead><tr><th>Hành động</th><th>Kết quả</th><th>Lý do</th></tr></thead><tbody>${Q.HANH_DONG.map(a => {
        const r = Q.xet(p, a, doi, { laGV }), s = tt[a];
        const ok = r.ok && (!s || s.ok);
        return `<tr><td data-l="Hành động"><b>${Q.TEN_HD[a]}</b></td><td data-l="Kết quả">${ok ? '<span class="pq-co">✓ Được</span>' : '<span class="pq-cam">✗ Không</span>'}</td>
          <td data-l="Lý do">${esc(r.ly)}${r.ok && s && !s.ok ? ` — nhưng bị chặn ở mức 8 (trạng thái): ${esc(s.ly)}` : ""}${r.muc ? ` <small class="muted">(mức ${r.muc}${r.nguon ? ", " + esc(r.nguon) : ""})</small>` : ""}</td></tr>`; }).join("")}</tbody></table>`;
  };
  h.el.addEventListener("change", veKq); veKq();
}

/* ---------- Lịch sử cấp / sửa / thu hồi quyền ---------- */
async function lichSu(mail) {
  const h = C.moHop(`<h3>Lịch sử phân quyền: ${esc(tenNg(mail))}</h3><div id="ls-ds"><p class="muted">Đang tải…</p></div><div class="hop-nut"><button class="btn primary" type="button" data-dong>Đóng</button></div>`, "Lịch sử phân quyền");
  const TEN = { cap: "Cấp quyền", sua: "Sửa quyền", thuhoi: "Thu hồi quyền", khoa: "Khoá tài khoản", mokhoa: "Mở khoá" };
  try {
    const { getDocs, collection, query, orderBy } = C.fs;
    const s = await getDocs(query(collection(C.db, "phanquyen", mail, "ls"), orderBy("luc", "desc")));
    h.el.querySelector("#ls-ds").innerHTML = s.size ? `<ol class="tl-lsds">${s.docs.map(x => { const v = x.data();
      return `<li><span class="num">${gio(v.luc)}</span> <b>${esc(TEN[v.hd] || v.hd)}</b> — ${esc(tenNg(v.ai))}<pre class="pq-noi">${esc(v.noi)}</pre></li>`; }).join("")}</ol>` : "<p class='muted'>Chưa có.</p>";
  } catch (e) { h.el.querySelector("#ls-ds").innerHTML = "<p class='muted'>Chưa tải được lịch sử.</p>"; }
}
