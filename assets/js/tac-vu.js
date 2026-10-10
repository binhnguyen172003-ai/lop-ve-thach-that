/* ================= TÁC VỤ: giao việc cho giáo viên, theo dõi tiến độ =================
   Firestore: congviec/{id} (mỗi tác vụ) + congviec/{id}/bl/{id} (bình luận và lịch sử đổi trạng thái).
   Quản lý tạo, sửa, duyệt, huỷ. Giáo viên chỉ thấy việc giao cho mình (hoặc cho tất cả giáo viên),
   cập nhật tiến độ trong phạm vi cho phép (luật máy chủ kiểm tra lại cùng điều kiện).
   Tác vụ cũ (chỉ có viec / cho / xong) vẫn đọc được: xem ttCua(), nguoiCua(). */
let C = null, huy = [], ds = [], loc = { q: "", tt: "mo", cs: "", ai: "", han: "", sx: "han", chuY: false }, che = "ds", soHien = 60, moId = "", blHuy = null, bl = [];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
export const TT = { chua: "Chưa bắt đầu", dang: "Đang làm", cho: "Chờ kiểm tra", sua: "Cần chỉnh sửa", xong: "Hoàn thành", huy: "Đã huỷ" };
const UU = { thap: "Thấp", tb: "Thường", cao: "Cao", gap: "Gấp" }, UU_SO = { gap: 0, cao: 1, tb: 2, thap: 3 };
const LAP = { "": "Không lặp", tuan: "Hằng tuần", thang: "Hằng tháng" };
const CO_SO = ["Bình Phú", "Kim Quan"];
export const ttCua = c => c.trangThai || (c.xong ? "xong" : "chua");
const nguoiCua = c => Array.isArray(c.nguoi) && c.nguoi.length ? c.nguoi : [c.cho || "tatca"];
const tenCua = c => c.ten || c.viec || "(chưa đặt tên)";
const moTT = t => t === "chua" || t === "dang" || t === "sua" || t === "cho";
// quản lý không tự nhận việc "giao cho tất cả giáo viên"; chỉ việc ghi đích danh mới là việc của mình
const cuaToi = c => nguoiCua(c).some(x => x === C.mail || (x === "tatca" && !C.isAdmin));
const ngayCon = han => han ? Math.round((Date.parse(han + "T12:00:00") - Date.parse(C.homNay() + "T12:00:00")) / 864e5) : null;
export const quaHan = c => moTT(ttCua(c)) && c.han && ngayCon(c.han) < 0;
const ngayVN = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("vi-VN") : "";
const gioVN = t => t ? new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
const tenGV = id => id === "tatca" ? "Tất cả giáo viên" : (C.giaoVien().find(g => g.id === id) || {}).ten || (id === C.mail ? C.ten : id);
const viet = n => String(n || "?").trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();

export function batDau(ctx) {
  dung(); C = ctx;
  const { db, fs: { collection, query, where, onSnapshot } } = C;
  const q = C.isAdmin ? collection(db, "congviec") : query(collection(db, "congviec"), where("nguoi", "array-contains-any", ["tatca", C.mail]));
  const u = onSnapshot(q, s => {
    ds = s.docs.filter(d => d.id[0] !== "_").map(d => ({ id: d.id, ...d.data() }));
    if (C.isAdmin) boSungNguoi();
    ve(); C.doiSo && C.doiSo();
  }, e => { ds = []; const g = $("#tv-goc"); if (g) g.innerHTML = `<p class="tv-loi">Chưa tải được tác vụ${e && e.code === "permission-denied" ? ": quản lý cần dán luật bảo mật mới vào Firebase." : ". Kiểm tra mạng rồi tải lại trang."}</p>`; });
  huy.push(u); C.themHuy(u);
  ve();
}
export function dung() { huy.forEach(u => { try { u(); } catch (e) {} }); huy = []; if (blHuy) { blHuy(); blHuy = null; } ds = []; bl = []; moId = ""; C = null; }
// Tác vụ tạo từ bản cũ chưa có danh sách người nhận: quản lý bổ sung một lần để giáo viên đọc được theo luật mới
let daBoSung = false;
function boSungNguoi() {
  if (daBoSung) return; const thieu = ds.filter(c => !Array.isArray(c.nguoi)); if (!thieu.length) return; daBoSung = true;
  const { db, fs: { doc, writeBatch } } = C, b = writeBatch(db);
  thieu.slice(0, 400).forEach(c => b.set(doc(db, "congviec", c.id), { ten: tenCua(c).slice(0, 200), nguoi: [c.cho || "tatca"], trangThai: ttCua(c) }, { merge: true }));
  b.commit().catch(() => { daBoSung = false; });
}

/* ---------- Số đếm cho huy hiệu, bảng điều khiển, Nhắc việc ---------- */
export function dem() {
  if (!C) return { mo: 0, quaHan: 0, cho: 0, sapHan: 0 };
  const cua = C.isAdmin ? ds : ds.filter(cuaToi);
  return { mo: cua.filter(c => moTT(ttCua(c)) && (C.isAdmin || ttCua(c) !== "cho")).length, quaHan: cua.filter(quaHan).length, cho: cua.filter(c => ttCua(c) === "cho").length,
    sapHan: cua.filter(c => moTT(ttCua(c)) && ttCua(c) !== "cho" && c.han && ngayCon(c.han) >= 0 && ngayCon(c.han) <= 1).length };
}
export function nhac() {
  if (!C) return [];
  const cua = (C.isAdmin ? ds : ds.filter(cuaToi)).filter(c => moTT(ttCua(c)) && c.han && ttCua(c) !== "cho");
  return cua.filter(c => ngayCon(c.han) <= 1).map(c => { const n = ngayCon(c.han);
    return { id: "tv-" + c.id + "-" + c.han + ttCua(c), icon: n < 0 ? "⏰" : "📌", muc: n < 0 || c.uuTien === "gap" ? "gap" : "", tieuDe: `${n < 0 ? `Quá hạn ${-n} ngày` : n === 0 ? "Hạn hôm nay" : "Hạn ngày mai"}: ${tenCua(c)}`, nd: `${TT[ttCua(c)]}${C.isAdmin ? " · " + nguoiCua(c).map(tenGV).join(", ") : ""}`, link: "#lam-viec", tab: "viec", dich: `[data-tv="${c.id}"]` }; });
}

/* ---------- Vẽ ---------- */
function locDs() {
  const q = bo(loc.q).split(" ").filter(Boolean), hom = C.homNay();
  return (C.isAdmin ? ds : ds.filter(cuaToi)).filter(c => {
    const t = ttCua(c);
    if (loc.tt === "mo" ? !moTT(t) : loc.tt === "qua" ? !quaHan(c) : loc.tt && t !== loc.tt) return false;
    if (loc.cs && c.coSo !== loc.cs) return false;
    if (loc.ai && !nguoiCua(c).includes(loc.ai) && !(loc.ai !== "tatca" && nguoiCua(c).includes("tatca"))) return false;
    if (loc.chuY && !c.chuY) return false;
    if (loc.han === "nay" && c.han !== hom) return false;
    if (loc.han === "tuan" && !(c.han && ngayCon(c.han) >= 0 && ngayCon(c.han) <= 7)) return false;
    return q.every(w => bo(tenCua(c) + " " + (c.moTa || "")).includes(w));
  }).sort((a, b) => {
    if (loc.sx === "uu") return (UU_SO[a.uuTien] ?? 2) - (UU_SO[b.uuTien] ?? 2) || String(a.han || "9999").localeCompare(String(b.han || "9999"));
    if (loc.sx === "moi") return (b.luc || 0) - (a.luc || 0);
    if (loc.sx === "cap") return (b.capNhat || b.luc || 0) - (a.capNhat || a.luc || 0);
    // mặc định: việc đang mở lên trước, hạn gần trước, gấp trước
    return Number(!moTT(ttCua(a))) - Number(!moTT(ttCua(b))) || String(a.han || "9999").localeCompare(String(b.han || "9999")) || (UU_SO[a.uuTien] ?? 2) - (UU_SO[b.uuTien] ?? 2);
  });
}
function hanChu(c) {
  if (!c.han) return "";
  const n = ngayCon(c.han), t = ttCua(c);
  if (!moTT(t)) return `<span class="tv-han">Hạn ${ngayVN(c.han)}</span>`;
  return `<span class="tv-han ${n < 0 ? "qua" : n <= 1 ? "gan" : ""}">${n < 0 ? `Quá hạn ${-n} ngày` : n === 0 ? "Hạn hôm nay" : n === 1 ? "Hạn ngày mai" : `Còn ${n} ngày · ${ngayVN(c.han)}`}</span>`;
}
const buocChu = c => { const b = c.buoc || []; if (!b.length) return ""; const x = b.filter(s => s.xong).length;
  return `<span class="tv-buoc" title="${x}/${b.length} bước đã xong"><i style="--p:${Math.round(x / b.length * 100)}%"></i>${x}/${b.length} bước</span>`; };
const nguoiChu = c => { const n = nguoiCua(c); if (n.includes("tatca")) return `<span class="tv-ng">Tất cả giáo viên</span>`;
  return `<span class="tv-ng">${n.slice(0, 3).map(x => `<i title="${esc(tenGV(x))}">${esc(viet(tenGV(x)))}</i>`).join("")}${n.length > 3 ? `<i>+${n.length - 3}</i>` : ""}<span>${esc(n.length === 1 ? tenGV(n[0]) : n.length + " người")}</span></span>`; };
// một nút thao tác nhanh phổ biến nhất cho vai trò + trạng thái hiện tại
function nutNhanh(c) {
  const t = ttCua(c), toi = cuaToi(c);
  if (C.isAdmin && t === "cho") return ["xong", "Duyệt hoàn thành"];
  if (toi) {
    if (t === "chua") return ["dang", "Bắt đầu"];
    if (t === "dang" || t === "sua") return c.canDuyet === false ? ["xong", "Xong"] : ["cho", t === "sua" ? "Gửi lại" : "Gửi kiểm tra"];
  }
  return null;
}
function theViec(c) {
  const t = ttCua(c), n = nutNhanh(c), qh = quaHan(c);
  return `<li class="tv-the tt-${t}${qh ? " qh" : ""}" data-tv="${esc(c.id)}">
    <button type="button" class="tv-mo" data-tvmo="${esc(c.id)}" aria-label="Mở chi tiết: ${esc(tenCua(c))}">
      <span class="tv-dong1">${c.uuTien && c.uuTien !== "tb" ? `<span class="tv-uu u-${esc(c.uuTien)}">${UU[c.uuTien] || ""}</span>` : ""}<span class="tv-ten">${esc(tenCua(c))}</span>${c.chuY ? '<span class="tv-sao" title="Cần chú ý" aria-label="Cần chú ý">★</span>' : ""}</span>
      <span class="tv-dong2"><span class="tv-tt t-${t}">${qh ? "Quá hạn · " : ""}${TT[t]}</span>${hanChu(c)}${c.coSo ? `<span class="tv-cs">${esc(c.coSo)}</span>` : ""}${buocChu(c)}${c.soBl ? `<span class="tv-bl" title="Bình luận">💬 ${c.soBl}</span>` : ""}</span>
      ${C.isAdmin ? `<span class="tv-dong3">${nguoiChu(c)}</span>` : ""}
    </button>
    ${n ? `<button type="button" class="btn small ${n[0] === "xong" ? "primary" : ""} tv-nhanh" data-tvtt="${esc(c.id)}" data-tt="${n[0]}">${n[1]}</button>` : ""}</li>`;
}
export function ve() {
  const g = $("#tv-goc"); if (!g || !C) return;
  const dangGo = g.contains(document.activeElement) && document.activeElement.id === "tv-q";
  const list = locDs(), d = dem(), coAi = C.isAdmin;
  const opt = (v, t, cur) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`;
  g.innerHTML = `<div class="tv-dau">
      <div class="tv-so" role="status"><span><b class="num">${d.mo}</b> ${coAi ? "việc đang mở" : "việc cần làm"}</span>${d.quaHan ? `<span class="qua"><b class="num">${d.quaHan}</b> quá hạn</span>` : ""}${d.sapHan ? `<span class="gan"><b class="num">${d.sapHan}</b> sắp đến hạn</span>` : ""}${d.cho ? `<span><b class="num">${d.cho}</b> chờ kiểm tra</span>` : ""}</div>
      <div class="tv-nut">${coAi ? `<button type="button" class="btn primary" id="tv-tao">+ Giao việc</button>` : ""}
        <div class="seg tv-che" role="group" aria-label="Kiểu xem"><button type="button" data-che="ds" aria-pressed="${che === "ds"}">Danh sách</button><button type="button" data-che="kb" aria-pressed="${che === "kb"}">Bảng</button></div></div></div>
    <div class="tv-loc">
      <input id="tv-q" type="search" placeholder="Tìm theo tên việc…" value="${esc(loc.q)}" aria-label="Tìm tác vụ" autocomplete="off">
      <select id="tv-tt" aria-label="Trạng thái">${opt("mo", "Đang mở", loc.tt)}${opt("qua", "Quá hạn", loc.tt)}${Object.entries(TT).map(([k, t]) => opt(k, t, loc.tt)).join("")}${opt("", "Tất cả trạng thái", loc.tt)}</select>
      <select id="tv-han-loc" aria-label="Hạn">${opt("", "Mọi hạn", loc.han)}${opt("nay", "Hạn hôm nay", loc.han)}${opt("tuan", "Trong 7 ngày", loc.han)}</select>
      <select id="tv-cs" aria-label="Cơ sở">${opt("", "Mọi cơ sở", loc.cs)}${CO_SO.map(x => opt(x, x, loc.cs)).join("")}</select>
      ${coAi ? `<select id="tv-ai" aria-label="Người phụ trách">${opt("", "Mọi người phụ trách", loc.ai)}${C.giaoVien().map(x => opt(x.id, x.ten || x.id, loc.ai)).join("")}</select>` : ""}
      <select id="tv-sx" aria-label="Sắp xếp">${opt("han", "Hạn gần trước", loc.sx)}${opt("uu", "Gấp trước", loc.sx)}${opt("moi", "Mới giao trước", loc.sx)}${opt("cap", "Mới cập nhật", loc.sx)}</select>
      <label class="tv-chk"><input type="checkbox" id="tv-chuy"${loc.chuY ? " checked" : ""}> Chỉ việc cần chú ý</label>
    </div>
    ${che === "kb" ? bang(list) : list.length ? `<ul class="tv-ds">${list.slice(0, soHien).map(theViec).join("")}</ul>${list.length > soHien ? `<button type="button" class="btn small tv-them" id="tv-them">Xem thêm ${list.length - soHien} việc</button>` : ""}`
      : `<div class="tv-trong"><b>${ds.length ? "Không có việc nào khớp bộ lọc." : coAi ? "Chưa giao việc nào." : "Chưa có việc nào được giao cho anh/chị."}</b><span>${ds.length ? "Thử đổi trạng thái sang “Tất cả trạng thái” hoặc xoá ô tìm." : coAi ? "Bấm “+ Giao việc” để giao việc đầu tiên cho giáo viên." : "Khi quản lý giao việc, việc sẽ hiện ở đây kèm hạn và mức ưu tiên."}</span></div>`}`;
  gan(g);
  if (dangGo) { const q = $("#tv-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  if (moId) veChiTiet();
}
function bang(list) {
  const cot = ["chua", "dang", "cho", "sua", "xong"].concat(loc.tt === "huy" || loc.tt === "" ? ["huy"] : []);
  const dsK = loc.tt === "mo" || loc.tt === "qua" ? (C.isAdmin ? ds : ds.filter(cuaToi)).filter(c => list.includes(c) || (!moTT(ttCua(c)) && ttCua(c) === "xong" && (c.xongLuc || 0) > Date.now() - 7 * 864e5)) : list;
  return `<div class="tv-kb" role="region" aria-label="Bảng theo trạng thái" tabindex="0">${cot.map(t => { const o = dsK.filter(c => ttCua(c) === t);
    return `<section class="tv-cot c-${t}" aria-label="${TT[t]}"><h4>${TT[t]} <span class="num">${o.length}</span></h4><ul class="tv-ds">${o.slice(0, 50).map(theViec).join("") || '<li class="tv-cot-trong">Trống</li>'}</ul></section>`; }).join("")}</div>`;
}
function gan(g) {
  const doi = () => { soHien = 60; ve(); };
  $("#tv-q").oninput = e => { loc.q = e.target.value; doi(); };
  [["#tv-tt", "tt"], ["#tv-han-loc", "han"], ["#tv-cs", "cs"], ["#tv-ai", "ai"], ["#tv-sx", "sx"]].forEach(([s, k]) => { const el = $(s); if (el) el.onchange = () => { loc[k] = el.value; doi(); }; });
  $("#tv-chuy").onchange = e => { loc.chuY = e.target.checked; doi(); };
  g.querySelectorAll("[data-che]").forEach(b => b.onclick = () => { che = b.dataset.che; ve(); });
  const tao = $("#tv-tao"); if (tao) tao.onclick = () => moForm();
  const them = $("#tv-them"); if (them) them.onclick = () => { soHien += 60; ve(); };
  g.querySelectorAll("[data-tvmo]").forEach(b => b.onclick = () => { moId = b.dataset.tvmo; moChiTiet(); });
  g.querySelectorAll("[data-tvtt]").forEach(b => b.onclick = () => doiTT(ds.find(c => c.id === b.dataset.tvtt), b.dataset.tt, b));
}

/* ---------- Đổi trạng thái (khớp điều kiện với luật máy chủ) ---------- */
function duocChuyen(c, moi) {
  const t = ttCua(c);
  if (C.isAdmin) return moi !== t;
  if (!cuaToi(c) || !moTT(t)) return false;
  if (moi === "xong") return c.canDuyet === false;
  return ["chua", "dang", "cho"].includes(moi) && moi !== t;
}
const dangLuu = new Set(); // chặn bấm liên tiếp gửi nhiều lệnh cho cùng một việc
async function doiTT(c, moi, btn, ghiChu = "") {
  if (!c || dangLuu.has(c.id)) return;
  if (!duocChuyen(c, moi)) return C.toast("Anh/chị không đổi được sang trạng thái này.", "err");
  if (moi === "sua" && !ghiChu) return moChiTiet(c.id, "sua");
  const { db, fs: { doc, collection, writeBatch } } = C, b = writeBatch(db), luc = Date.now(), t = ttCua(c);
  const sua = { trangThai: moi, capNhat: luc, capNhatBoi: C.mail, xong: moi === "xong" };
  if (moi === "dang" && !c.batDau) sua.batDau = luc;
  if (moi === "cho") sua.nopLuc = luc;
  if (moi === "xong") { sua.xongLuc = luc; sua.xongBoi = C.ten; }
  b.set(doc(db, "congviec", c.id), sua, { merge: true });
  b.set(doc(collection(db, "congviec", c.id, "bl")), { loai: "tt", tu: C.mail, ten: C.ten, tt: moi, ttCu: t, nd: ghiChu.slice(0, 1000), luc });
  // việc lặp lại: quản lý duyệt xong thì tự tạo lần kế tiếp
  if (moi === "xong" && C.isAdmin && c.lap && !c.daLap) {
    const han = doiNgay(c.han || C.homNay(), c.lap), giao = doiNgay(c.ngayGiao || C.homNay(), c.lap);
    b.set(doc(collection(db, "congviec")), { ...goc(c), ngayGiao: giao, han, trangThai: "chua", buoc: (c.buoc || []).map(s => ({ t: s.t, xong: false })), lapTu: c.id, luc, tacGia: C.mail, tacGiaTen: C.ten });
    b.set(doc(db, "congviec", c.id), { daLap: true }, { merge: true });
  }
  dangLuu.add(c.id); const cu = btn ? btn.textContent : ""; if (btn) { btn.disabled = true; btn.textContent = "Đang lưu…"; }
  try { await b.commit(); C.toast(`Đã chuyển sang “${TT[moi]}” ✓`); }
  catch (e) { C.toast(e && e.code === "permission-denied" ? "Máy chủ không cho đổi trạng thái này (quyền hoặc luật bảo mật cũ)." : "Chưa lưu được — mạng chập chờn. Bấm lại để thử.", "err"); if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = cu; } }
  finally { dangLuu.delete(c.id); }
}
const goc = c => ({ ten: tenCua(c), moTa: c.moTa || "", nguoi: nguoiCua(c), cho: nguoiCua(c).length === 1 ? nguoiCua(c)[0] : "nhieu", coSo: c.coSo || "", uuTien: c.uuTien || "tb", canDuyet: c.canDuyet !== false, lap: c.lap || "", anh: c.anh || [], link: c.link || "" });
function doiNgay(iso, lap) { const d = new Date(iso + "T12:00:00"); if (lap === "tuan") d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); }

/* ---------- Chi tiết: bước nhỏ, đính kèm, thao tác, lịch sử + bình luận ---------- */
let hopCT = null;
function moChiTiet(id = moId, hoiSua) {
  moId = id; const c = ds.find(x => x.id === id); if (!c) return;
  if (hopCT && hopCT.el.isConnected) hopCT.dong(false, true);
  moId = id;
  hopCT = C.moHop(`<div class="tv-ct" id="tv-ct"></div>`, "Chi tiết tác vụ");
  hopCT.el.classList.add("hop-rong");
  hopCT.khiDong = () => { if (blHuy) { blHuy(); blHuy = null; } bl = []; moId = ""; hopCT = null; };
  hopCT.chanDong = () => { const o = hopCT && hopCT.el.querySelector("#tv-bl-o"); return o && o.value.trim() ? "Bình luận đang gõ chưa gửi." : ""; };
  const { db, fs: { collection, query, orderBy, onSnapshot } } = C;
  blHuy = onSnapshot(query(collection(db, "congviec", id, "bl"), orderBy("luc")), s => { bl = s.docs.map(d => ({ id: d.id, ...d.data() })); veChiTiet(); }, () => { bl = []; veChiTiet(); });
  veChiTiet(hoiSua);
}
function veChiTiet(hoiSua) {
  const box = hopCT && hopCT.el.querySelector("#tv-ct"), c = ds.find(x => x.id === moId); if (!box) return;
  if (!c) { box.innerHTML = `<p>Tác vụ này đã bị xoá.</p>`; return; }
  const t = ttCua(c), o = box.querySelector("#tv-bl-o"), dangGo = o ? o.value : "", oSua = box.querySelector("#tv-sua-ly"), lyGo = oSua ? oSua.value : "";
  const tro = document.activeElement && box.contains(document.activeElement) && ["tv-bl-o", "tv-sua-ly"].includes(document.activeElement.id) ? document.activeElement.id : "", toi = cuaToi(c), coSua = C.isAdmin || (toi && moTT(t));
  const nut = [];
  if (C.isAdmin) {
    if (t === "cho") nut.push(["xong", "Duyệt hoàn thành", "primary"], ["sua", "Yêu cầu chỉnh sửa", ""]);
    if (t === "xong" || t === "huy") nut.push(["dang", "Mở lại", ""]);
  }
  if (toi) { if (t === "chua") nut.push(["dang", "Bắt đầu làm", "primary"]);
    if (t === "dang" || t === "sua" || (t === "chua" && !C.isAdmin)) nut.push(c.canDuyet === false ? ["xong", "Đánh dấu hoàn thành", "primary"] : ["cho", t === "sua" ? "Gửi lại để kiểm tra" : "Gửi kiểm tra", "primary"]);
    if (t === "cho" && !C.isAdmin) nut.push(["dang", "Rút lại để sửa tiếp", ""]); }
  const nutUniq = nut.filter((x, i) => nut.findIndex(y => y[0] === x[0]) === i);
  box.innerHTML = `<div class="tv-ct-dau"><span class="tv-tt t-${t}">${quaHan(c) ? "Quá hạn · " : ""}${TT[t]}</span>${c.uuTien && c.uuTien !== "tb" ? `<span class="tv-uu u-${esc(c.uuTien)}">${UU[c.uuTien]}</span>` : ""}
      ${coSua ? `<button type="button" class="tv-sao-nut" id="tv-chuy-nut" aria-pressed="${!!c.chuY}" title="Đánh dấu cần chú ý">${c.chuY ? "★ Cần chú ý" : "☆ Đánh dấu chú ý"}</button>` : ""}</div>
    <h3 class="tv-ct-ten">${esc(tenCua(c))}</h3>
    <dl class="tv-tt-ds"><dt>Người phụ trách</dt><dd>${esc(nguoiCua(c).map(tenGV).join(", "))}</dd>
      ${c.coSo ? `<dt>Cơ sở</dt><dd>${esc(c.coSo)}</dd>` : ""}<dt>Ngày giao</dt><dd>${ngayVN(c.ngayGiao) || gioVN(c.luc)}</dd>${c.han ? `<dt>Hạn</dt><dd>${hanChu(c)}</dd>` : ""}
      ${c.lap ? `<dt>Lặp lại</dt><dd>${LAP[c.lap]}</dd>` : ""}<dt>Kiểm tra</dt><dd>${c.canDuyet === false ? "Người làm tự đánh dấu hoàn thành" : "Quản lý duyệt sau khi gửi kiểm tra"}</dd>
      ${c.batDau ? `<dt>Bắt đầu</dt><dd>${gioVN(c.batDau)}</dd>` : ""}${c.xongLuc && t === "xong" ? `<dt>Hoàn thành</dt><dd>${gioVN(c.xongLuc)}</dd>` : ""}</dl>
    ${c.moTa ? `<div class="tv-mota">${esc(c.moTa)}</div>` : ""}
    ${(c.buoc || []).length ? `<div class="tv-buoc-ds"><h4>Các bước ${buocChu(c)}</h4><ul>${c.buoc.map((s, i) => `<li><label><input type="checkbox" data-buoc="${i}"${s.xong ? " checked" : ""}${coSua ? "" : " disabled"}> <span>${esc(s.t)}</span></label></li>`).join("")}</ul></div>` : ""}
    ${(c.anh || []).length || c.link ? `<div class="tv-dk"><h4>Đính kèm</h4><div class="tv-anh">${(c.anh || []).filter(a => /^data:image\/(jpeg|png|webp);base64,/.test(a)).map((a, i) => `<button type="button" class="tv-anh-o" data-anh="${i}" aria-label="Xem ảnh ${i + 1}"><img src="${esc(a)}" alt="Ảnh đính kèm ${i + 1}" loading="lazy"></button>`).join("")}</div>${c.link && /^https:\/\//.test(c.link) ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">Mở tài liệu ↗</a>` : ""}</div>` : ""}
    ${nutUniq.length ? `<div class="tv-ct-nut">${nutUniq.map(([k, ten, cls]) => `<button type="button" class="btn ${cls}" data-ctt="${k}">${ten}</button>`).join("")}</div>` : ""}
    ${hoiSua === "sua" || box.dataset.hoiSua ? `<div class="tv-hoi"><label for="tv-sua-ly">Cần sửa gì? (giáo viên sẽ thấy)</label><textarea id="tv-sua-ly" rows="3" maxlength="1000"></textarea><div class="tv-ct-nut"><button type="button" class="btn primary" id="tv-sua-gui">Gửi yêu cầu sửa</button><button type="button" class="btn" id="tv-sua-huy">Thôi</button></div></div>` : ""}
    <section class="tv-bl" aria-label="Trao đổi và lịch sử"><h4>Trao đổi &amp; lịch sử</h4>
      <ol class="tv-bl-ds">${[{ loai: "tao", ten: c.tacGiaTen || "Quản lý", luc: c.luc }, ...bl].map(x => x.loai === "bl"
        ? `<li class="bl"><b>${esc(x.ten || x.tu)}</b><span class="tg">${gioVN(x.luc)}</span><p>${esc(x.nd)}</p></li>`
        : `<li class="ls"><span>${x.loai === "tao" ? `<b>${esc(x.ten)}</b> giao việc` : `<b>${esc(x.ten || x.tu)}</b> chuyển “${TT[x.ttCu] || "?"}” → “${TT[x.tt] || "?"}”`}</span><span class="tg">${gioVN(x.luc)}</span>${x.nd ? `<p>${esc(x.nd)}</p>` : ""}</li>`).join("")}</ol>
      <div class="tv-bl-gui"><textarea id="tv-bl-o" rows="2" maxlength="1000" placeholder="Nhắn trao đổi, báo tiến độ, nhận xét…" aria-label="Nội dung trao đổi"></textarea><button type="button" class="btn small primary" id="tv-bl-nut">Gửi</button></div></section>
    ${C.isAdmin ? `<details class="tv-them-tv"><summary>Thao tác khác</summary><div class="tv-ct-nut"><button type="button" class="btn small" data-ct="sua">Sửa / giao lại</button><button type="button" class="btn small" data-ct="chep">Sao chép thành việc mới</button>${t !== "huy" ? `<button type="button" class="btn small" data-ct="huy">Huỷ việc</button>` : ""}<button type="button" class="btn small" data-ct="xoa">Xoá hẳn</button></div></details>` : ""}`;
  if (hoiSua === "sua") box.dataset.hoiSua = 1;
  const o2 = box.querySelector("#tv-bl-o"); if (dangGo) o2.value = dangGo;
  const s2 = box.querySelector("#tv-sua-ly"); if (s2 && lyGo) s2.value = lyGo;
  if (tro) { const e = box.querySelector("#" + tro); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }
  box.querySelectorAll("[data-ctt]").forEach(b => b.onclick = () => b.dataset.ctt === "sua" ? (box.dataset.hoiSua = 1, veChiTiet(), box.querySelector("#tv-sua-ly")?.focus()) : doiTT(c, b.dataset.ctt, b));
  const sg = box.querySelector("#tv-sua-gui"); if (sg) sg.onclick = () => { const ly = box.querySelector("#tv-sua-ly").value.trim(); if (!ly) return C.toast("Ghi rõ cần sửa gì để giáo viên làm đúng.", "err"); delete box.dataset.hoiSua; doiTT(c, "sua", sg, ly); };
  const sh = box.querySelector("#tv-sua-huy"); if (sh) sh.onclick = () => { delete box.dataset.hoiSua; veChiTiet(); };
  const cy = box.querySelector("#tv-chuy-nut"); if (cy) cy.onclick = () => luuTruong(c, { chuY: !c.chuY }, cy, c.chuY ? "Đã bỏ đánh dấu" : "Đã đánh dấu cần chú ý");
  box.querySelectorAll("[data-buoc]").forEach(cb => cb.onchange = () => { const buoc = (c.buoc || []).map((s, i) => i === +cb.dataset.buoc ? { ...s, xong: cb.checked } : s); luuTruong(c, { buoc }, cb, cb.checked ? "Đã xong một bước ✓" : "Đã bỏ đánh dấu bước"); });
  box.querySelectorAll("[data-anh]").forEach(b => b.onclick = () => { const a = c.anh[+b.dataset.anh]; const h = C.moHop(`<img class="tv-anh-to" src="${esc(a)}" alt="Ảnh đính kèm">`, "Ảnh đính kèm"); h.el.classList.add("hop-anh"); });
  box.querySelector("#tv-bl-nut").onclick = e => guiBl(c, e.target);
  box.querySelectorAll("[data-ct]").forEach(b => b.onclick = () => {
    const k = b.dataset.ct;
    if (k === "sua") return moForm(c);
    if (k === "chep") return moForm({ ...goc(c), ten: tenCua(c) + " (bản sao)", han: "" }, true);
    if (k === "huy") return xacNhan(b, () => doiTT(c, "huy", b, "Quản lý huỷ việc"), "Bấm lần nữa để huỷ");
    if (k === "xoa") return xacNhan(b, async () => { const { db, fs: { doc, deleteDoc } } = C; try { await deleteDoc(doc(db, "congviec", c.id)); C.toast("Đã xoá tác vụ"); hopCT && hopCT.dong(false, true); } catch (e) { C.toast("Chưa xoá được. Thử lại.", "err"); } }, "Bấm lần nữa để xoá hẳn");
  });
}
async function luuTruong(c, sua, el, nhan) {
  const { db, fs: { doc, setDoc } } = C; el.disabled = true;
  try { await setDoc(doc(db, "congviec", c.id), { ...sua, capNhat: Date.now(), capNhatBoi: C.mail }, { merge: true }); C.toast(nhan + " ✓"); }
  catch (e) { C.toast("Chưa lưu được — mạng chập chờn. Thử lại.", "err"); if (el.type === "checkbox") el.checked = !el.checked; }
  finally { if (el.isConnected) el.disabled = false; }
}
async function guiBl(c, btn) {
  const o = hopCT.el.querySelector("#tv-bl-o"), nd = o.value.trim(); if (!nd || btn.disabled) return;
  const { db, fs: { doc, collection, writeBatch } } = C, b = writeBatch(db);
  b.set(doc(collection(db, "congviec", c.id, "bl")), { loai: "bl", tu: C.mail, ten: C.ten, nd: nd.slice(0, 1000), luc: Date.now() });
  btn.disabled = true; btn.textContent = "Đang gửi…";
  try { await b.commit(); o.value = ""; C.toast("Đã gửi ✓");
    const { setDoc } = C.fs; setDoc(doc(db, "congviec", c.id), { soBl: (c.soBl || 0) + 1 }, { merge: true }).catch(() => {}); }
  catch (e) { C.toast("Chưa gửi được — nội dung vẫn giữ trong ô, bấm Gửi lại.", "err"); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = "Gửi"; } }
}
function xacNhan(btn, viec, hoi) {
  if (btn.dataset.chac) { delete btn.dataset.chac; return viec(); }
  const cu = btn.textContent; btn.dataset.chac = 1; btn.textContent = hoi; setTimeout(() => { if (btn.isConnected && btn.dataset.chac) { delete btn.dataset.chac; btn.textContent = cu; } }, 4000);
}

/* ---------- Form giao / sửa việc (quản lý) ---------- */
function moForm(c, banSao) {
  if (!C.isAdmin) return;
  const { db, fs: { doc, collection, setDoc } } = C, sua = c && !banSao, ref = sua ? doc(db, "congviec", c.id) : doc(collection(db, "congviec"));
  const v = c || { ten: "", moTa: "", nguoi: [], coSo: "", uuTien: "tb", canDuyet: true, lap: "", anh: [], link: "", ngayGiao: C.homNay(), han: "" };
  let anh = (v.anh || []).slice(0, 3), daSua = false;
  // việc mới: chưa chọn ai; việc có sẵn (kể cả kiểu cũ chỉ có "cho"): lấy người nhận hiện tại
  const gv = C.giaoVien(), ng = new Set((Array.isArray(v.nguoi) ? v.nguoi : nguoiCua(v)).filter(Boolean));
  const h = C.moHop(`<form class="tv-form" id="tv-form" novalidate><h3>${sua ? "Sửa / giao lại việc" : "Giao việc mới"}</h3>
    <label for="tvf-ten">Tên việc *<input id="tvf-ten" maxlength="200" required value="${esc(v.ten || v.viec || "")}" placeholder="VD: Chuẩn bị mẫu tượng cho buổi thi thử"></label>
    <fieldset class="tvf-ng"><legend>Giao cho *</legend><label class="tv-chk"><input type="checkbox" value="tatca"${ng.has("tatca") ? " checked" : ""}> Tất cả giáo viên</label>
      <div class="tvf-ng-ds">${gv.map(g => `<label class="tv-chk"><input type="checkbox" value="${esc(g.id)}"${ng.has(g.id) ? " checked" : ""}> ${esc(g.ten || g.id)}${g.coso ? ` <small>${esc(g.coso)}</small>` : ""}</label>`).join("") || '<p class="muted">Chưa có giáo viên nào. Trao quyền ở Quản lý trước.</p>'}</div></fieldset>
    <div class="tvf-luoi"><label for="tvf-cs">Cơ sở<select id="tvf-cs"><option value="">Không gắn cơ sở</option>${CO_SO.map(x => `<option${v.coSo === x ? " selected" : ""}>${x}</option>`).join("")}</select></label>
      <label for="tvf-giao">Ngày giao<input id="tvf-giao" type="date" value="${esc(v.ngayGiao || C.homNay())}"></label>
      <label for="tvf-han">Hạn hoàn thành<input id="tvf-han" type="date" value="${esc(v.han || "")}"></label>
      <label for="tvf-lap">Lặp lại<select id="tvf-lap">${Object.entries(LAP).map(([k, t]) => `<option value="${k}"${(v.lap || "") === k ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
    <fieldset class="tvf-uu"><legend>Mức ưu tiên</legend><div class="seg">${Object.entries(UU).map(([k, t]) => `<label><input type="radio" name="tvf-uu" value="${k}"${(v.uuTien || "tb") === k ? " checked" : ""}><span>${t}</span></label>`).join("")}</div></fieldset>
    <label for="tvf-mota">Mô tả, yêu cầu<textarea id="tvf-mota" rows="4" maxlength="3000" placeholder="Cần làm gì, tiêu chuẩn hoàn thành ra sao">${esc(v.moTa || "")}</textarea></label>
    <label for="tvf-buoc">Các bước nhỏ (mỗi dòng một bước, không bắt buộc)<textarea id="tvf-buoc" rows="3" maxlength="2000" placeholder="Mua giấy A2&#10;Dựng mẫu tượng&#10;Kiểm tra đèn">${esc((v.buoc || []).map(s => s.t).join("\n"))}</textarea></label>
    <div class="tvf-dk"><span class="tvf-nhan">Ảnh đính kèm (tối đa 3)</span><div class="tv-anh" id="tvf-anh"></div><label class="btn small" for="tvf-file">+ Thêm ảnh</label><input id="tvf-file" type="file" accept="image/*" multiple hidden></div>
    <label for="tvf-link">Link tài liệu (Drive, Canva…)<input id="tvf-link" inputmode="url" value="${esc(v.link || "")}" placeholder="https://"></label>
    <label class="tv-chk"><input type="checkbox" id="tvf-duyet"${v.canDuyet !== false ? " checked" : ""}> Quản lý kiểm tra trước khi tính là hoàn thành</label>
    <p class="tv-st" id="tvf-st" role="status" aria-live="polite"></p>
    <div class="tv-ct-nut"><button type="submit" class="btn primary" id="tvf-luu">${sua ? "Lưu thay đổi" : "Giao việc"}</button><button type="button" class="btn" data-dong>Huỷ</button></div></form>`, "Giao việc");
  h.el.classList.add("hop-rong");
  const f = h.el.querySelector("#tv-form"), st = h.el.querySelector("#tvf-st");
  f.addEventListener("input", () => { daSua = true; });
  h.chanDong = () => daSua ? "Việc đang soạn chưa lưu." : "";
  const tatCa = f.querySelector('.tvf-ng input[value="tatca"]'), cac = [...f.querySelectorAll(".tvf-ng-ds input")];
  const dongBo = () => cac.forEach(x => { x.disabled = tatCa.checked; }); tatCa.onchange = dongBo; dongBo();
  const veAnh = () => { h.el.querySelector("#tvf-anh").innerHTML = anh.map((a, i) => `<span class="tv-anh-o"><img src="${esc(a)}" alt="Ảnh ${i + 1}"><button type="button" data-boanh="${i}" aria-label="Bỏ ảnh ${i + 1}">✕</button></span>`).join("");
    h.el.querySelectorAll("[data-boanh]").forEach(b => b.onclick = () => { anh.splice(+b.dataset.boanh, 1); daSua = true; veAnh(); }); };
  veAnh();
  h.el.querySelector("#tvf-file").onchange = async e => {
    const files = [...e.target.files].slice(0, 3 - anh.length); e.target.value = "";
    if (!files.length) return C.toast("Đã đủ 3 ảnh. Bỏ bớt ảnh để thêm ảnh khác.", "err");
    st.textContent = "Đang nén ảnh…";
    for (const fl of files) { try { anh.push(await C.nenAnh(fl, 1280, 280000)); daSua = true; } catch (er) { C.toast(er.message || "Ảnh này không đọc được.", "err"); } }
    st.textContent = ""; veAnh();
  };
  f.onsubmit = async e => {
    e.preventDefault(); const nut = h.el.querySelector("#tvf-luu"); if (nut.disabled) return;
    const ten = h.el.querySelector("#tvf-ten").value.trim(), nguoi = tatCa.checked ? ["tatca"] : cac.filter(x => x.checked).map(x => x.value);
    const giao = h.el.querySelector("#tvf-giao").value || C.homNay(), han = h.el.querySelector("#tvf-han").value, link = h.el.querySelector("#tvf-link").value.trim();
    const loi = !ten ? "Nhập tên việc." : !nguoi.length ? "Chọn ít nhất một người nhận việc." : han && han < giao ? "Hạn hoàn thành phải sau ngày giao." : link && !/^https:\/\/[^\s"<>]+$/i.test(link) ? "Link phải bắt đầu bằng https://" : "";
    if (loi) { st.textContent = loi; st.className = "tv-st loi"; return; }
    const cuBuoc = sua ? (c.buoc || []) : [], buoc = h.el.querySelector("#tvf-buoc").value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 20).map(t => ({ t: t.slice(0, 200), xong: !!(cuBuoc.find(s => s.t === t) || {}).xong }));
    const du = { ten, moTa: h.el.querySelector("#tvf-mota").value.trim(), nguoi, cho: nguoi.length === 1 ? nguoi[0] : "nhieu", coSo: h.el.querySelector("#tvf-cs").value, ngayGiao: giao, han,
      uuTien: (f.querySelector('[name="tvf-uu"]:checked') || {}).value || "tb", lap: h.el.querySelector("#tvf-lap").value, canDuyet: h.el.querySelector("#tvf-duyet").checked, buoc, anh, link, capNhat: Date.now(), capNhatBoi: C.mail };
    if (!sua) Object.assign(du, { trangThai: "chua", xong: false, luc: Date.now(), tacGia: C.mail, tacGiaTen: C.ten, viec: ten });
    else du.viec = ten;
    nut.disabled = true; nut.textContent = "Đang lưu…"; st.className = "tv-st"; st.textContent = "";
    // mã việc tạo sẵn khi mở form: bấm Lưu nhiều lần (hoặc mạng gửi lại) cũng chỉ ra một việc
    try { await setDoc(ref, du, { merge: true }); daSua = false; C.toast(sua ? "Đã lưu thay đổi ✓" : "Đã giao việc ✓"); h.dong(false, true); }
    catch (er) { st.className = "tv-st loi"; st.textContent = er && er.code === "permission-denied" ? "Máy chủ chưa cho phép: cần dán luật bảo mật mới vào Firebase." : "Chưa lưu được — mạng chập chờn. Nội dung vẫn giữ nguyên, bấm lại để thử."; nut.disabled = false; nut.textContent = sua ? "Lưu thay đổi" : "Giao việc"; }
  };
  setTimeout(() => h.el.querySelector("#tvf-ten").focus(), 50);
}
