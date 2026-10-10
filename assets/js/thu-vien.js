/* ================= THƯ VIỆN NỘI DUNG: Video YouTube · Ebook Canva · Giáo trình · Khoá học =================
   Firestore: noidung/{id} (kho: nháp → chờ duyệt → đã duyệt, kèm noidung/{id}/ls lịch sử)
              thuvien/{id} (bản đã xuất bản cho học viên — sao y bản đã duyệt)
              phanquyen/{gmail} (quyền từng nhân sự, chỉ quản lý sửa — xem phan-quyen.js)
   Người tạo / người duyệt / người xuất bản / người quản lý quyền xem là 4 quyền tách biệt; luật máy chủ kiểm tra lại mọi bước.
   Trình duyệt chỉ dùng quyen.js để hiện đúng nút và giải thích lý do bị chặn. */
import * as Q from "./quyen.js?v=20261010pq";

let C = null, veMo = null, huy = [], ndHuy = [], pq = null, nd = new Map(), tv = new Map(), che = "", loc = { loai: "", tt: "", q: "" }, daKichHoat = new Set();
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const gio = t => t ? new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const tenNg = m => !m ? "" : m === C.mail ? "Anh/chị" : ((C.giaoVien() || []).find(g => g.id === m) || {}).ten || m.split("@")[0];
const ICON = { video: "▶", ebook: "📘", giaotrinh: "📐", khoahoc: "🎓" };
const NUT_NGUON = { video: "Xem trên YouTube", ebook: "Mở Ebook Canva", giaotrinh: "Mở tài liệu", khoahoc: "Mở khoá học" };

export function batDau(ctx) {
  dung(); C = ctx;
  const { db, fs: { collection, doc, query, where, onSnapshot } } = C;
  const loi = e => { const g = $("#thu-vien"); if (g) g.querySelector(".tl-than")?.insertAdjacentHTML("afterbegin", `<p class="tv-loi">Chưa tải được thư viện${e && e.code === "permission-denied" ? ": quản lý cần dán luật bảo mật mới vào Firebase." : ". Kiểm tra mạng rồi tải lại trang."}</p>`); };
  const nghe = (q, f) => { const u = onSnapshot(q, f, loi); huy.push(u); C.themHuy(u); };
  if (!C.isTeacher) {
    // Học viên: chỉ bản đang hiện, đúng phạm vi cơ sở của mình (luật máy chủ chặn mọi truy vấn rộng hơn)
    const cs = String(C.coSo() || "");
    nghe(query(collection(db, "thuvien"), where("hien", "==", true), where("phamVi", "in", cs && cs !== "tatca" ? ["tatca", cs] : ["tatca"])), s => {
      tv = new Map(s.docs.map(d => [d.id, d.data()])); ve(); });
    return ve();
  }
  nghe(collection(db, "thuvien"), s => { tv = new Map(s.docs.map(d => [d.id, d.data()])); kichHoatLich(); ve(); });
  if (C.isAdmin) { nghe(collection(db, "noidung"), s => { nd = new Map(s.docs.map(d => [d.id, d.data()])); kichHoatLich(); ve(); }); return ve(); }
  // Nhân sự: theo dõi bảng quyền của chính mình — quản lý thu hồi / khoá là có hiệu lực ngay, không cần đăng nhập lại
  nghe(doc(db, "phanquyen", C.mail), s => { pq = s.exists() ? s.data() : null; nghe2(); ve(); });
}
// Truy vấn kho theo đúng phạm vi được xem (xem quyen.js → oDuocXem)
function nghe2() {
  ndHuy.forEach(u => { try { u(); } catch (e) {} }); ndHuy = []; nd = new Map();
  const { db, fs: { collection, doc, query, where, onSnapshot } } = C, nhom = new Map();
  const gop = (k, docs) => { nhom.set(k, docs); nd = new Map(); for (const ds of nhom.values()) for (const [id, d] of ds) nd.set(id, d); kichHoatLich(); ve(); };
  const nghe = (k, q) => { const u = onSnapshot(q, s => gop(k, s.docs ? s.docs.map(d => [d.id, d.data()]) : s.exists() ? [[s.id, s.data()]] : []), () => gop(k, [])); ndHuy.push(u); C.themHuy(u); };
  nghe("lq", query(collection(db, "noidung"), where("lq", "array-contains", C.mail)));
  if (!pq || pq.khoa) return;
  const cam = (pq.camXem || []).slice(0, 10);
  for (const o of Q.oDuocXem(pq)) {
    if (!cam.length) nghe(o.loai + o.cs, query(collection(db, "noidung"), where("loai", "==", o.loai), where("cs", "==", o.cs), where("dm", "in", o.dm)));
    else o.dm.forEach(dm => nghe(o.loai + o.cs + dm, query(collection(db, "noidung"), where("loai", "==", o.loai), where("cs", "==", o.cs), where("dm", "==", dm), where("ma", "not-in", cam))));
  }
  // Tài liệu được cấp quyền riêng
  Object.entries(pq.cap || {}).filter(([k, g]) => k.startsWith("doc:") && (g.a || []).length).forEach(([k]) => nghe(k, doc(db, "noidung", k.slice(4))));
}
export function dung() { [...huy, ...ndHuy].forEach(u => { try { u(); } catch (e) {} }); huy = []; ndHuy = []; pq = null; nd = new Map(); tv = new Map(); C = null; }

/* ---------- Quyền ---------- */
const xetQ = (act, d) => Q.xet(pq, act, { loai: d.loai, dm: d.dm, cs: d.cs, id: d.ma }, { laQL: C.isAdmin, laGV: C.isTeacher });
function duoc(hd, d) {
  let r = xetQ(Q.QUYEN_CUA[hd], d);
  // Quyền tác giả (giống luật máy chủ): người tạo còn quyền Tạo thì được sửa / gửi duyệt bài của mình
  if (!r.ok && ((hd === "sua" && d.tacGia === C.mail) || (hd === "gui" && (d.nguoi || []).includes(C.mail))) && xetQ("CREATE", d).ok) r = { ok: true, ly: "Quyền tác giả" };
  if (!r.ok) return r;
  const s = Q.xetTrangThai(hd, d, C.mail, tv.get(d.ma));
  return s.ok ? { ok: true, ly: s.ly || r.ly } : { ok: false, muc: 8, ly: s.ly };
}
const duocDoiNguon = d => xetQ("SOURCE", d).ok || (d.tacGia === C.mail && !d.duyet && xetQ("CREATE", d).ok);
function coTheTao() {
  if (C.isAdmin) return true; if (!pq || pq.khoa) return false;
  return Object.keys(Q.LOAI).some(l => Q.DANH_MUC.some(dm => ["Bình Phú", "Kim Quan", "chung"].some(cs => xetQ("CREATE", { loai: l, dm, cs, ma: "" }).ok)));
}

/* ---------- Ghi (luôn kèm nhật ký; luật máy chủ từ chối nếu thiếu) ---------- */
async function ghi(id, n, them = [], nx = "") {
  const { db, fs: { doc, writeBatch } } = C, b = writeBatch(db);
  b.set(doc(db, "noidung", id), n);
  b.set(doc(db, "noidung", id, "ls", n.hdMa), Q.nhatKy(n, C.mail, n.hdLuc, nx));
  them.forEach(([p, d, sua]) => sua ? b.update(doc(db, ...p), d) : b.set(doc(db, ...p), d));
  await b.commit();
}
const baoLoi = (e, viec) => C.toast(e && e.code === "permission-denied" ? `Máy chủ từ chối ${viec}: quyền hoặc trạng thái đã thay đổi. Tải lại để xem quyền mới nhất.` : `Chưa ${viec} được. Kiểm tra mạng rồi thử lại.`, "err");
async function thucHien(hd, d, them = {}) {
  const luc = Date.now(), ma = Q.maHd(luc), id = d.ma, tv0 = tv.get(id), nx = (them.nx || "").trim();
  const ten = Q.TEN_THAO_TAC[hd].toLowerCase();
  try {
    if (["gui", "duyet", "yeucausua", "tuchoi", "khoiphuc"].includes(hd)) await ghi(id, Q.chuyen(d, hd, C.mail, luc, ma, nx), [], nx);
    else if (hd === "thuhoi" || hd === "luutru") {
      const n = Q.chuyen(d, hd, C.mail, luc, ma, nx), an = tv0 && (tv0.hien || tv0.hd === "lichxb");
      await ghi(id, n, an ? [[["thuvien", id], { hien: false, hd: "an", lyDo: (nx || Q.TEN_THAO_TAC[hd]).slice(0, 300), hdBoi: C.mail, hdLuc: luc, hdMa: ma }, true]] : [], nx);
    } else if (hd === "xuatban") {
      const b = Q.banXuatBan(d, { phamVi: them.phamVi, tu: them.tu }, C.mail, luc, ma);
      await ghi(id, { ...d, hd: b.hd, hdBoi: C.mail, hdLuc: luc, hdMa: ma }, [[["thuvien", id], b]]);
    } else if (hd === "an" || hd === "phamvi") {
      const sua = hd === "an" ? { hien: false, lyDo: nx.slice(0, 300) } : { phamVi: them.phamVi };
      await ghi(id, { ...d, hd, hdBoi: C.mail, hdLuc: luc, hdMa: ma }, [[["thuvien", id], { ...sua, hd, hdBoi: C.mail, hdLuc: luc, hdMa: ma }, true]], nx);
    } else if (hd === "xoa") { await C.fs.deleteDoc(C.fs.doc(C.db, "noidung", id)); }
    C.toast(hd === "xuatban" && them.tu > luc ? "Đã hẹn giờ xuất bản " + gio(them.tu) : "Đã " + ten + ".", "ok");
    return true;
  } catch (e) { baoLoi(e, ten); return false; }
}
// Tới giờ hẹn: nhân sự đang mở web sẽ kích hoạt; máy chủ xét lại quyền người lên lịch + bản duyệt ngay lúc này
function kichHoatLich() {
  if (!C || !C.isTeacher) return;
  const now = Date.now();
  for (const [id, t] of tv) {
    if (t.hien || t.hd !== "lichxb" || t.tu > now || daKichHoat.has(id + t.hdMa)) continue;
    const d = nd.get(id); if (!d) continue;
    daKichHoat.add(id + t.hdMa);
    const luc = Date.now(), ma = Q.maHd(luc);
    ghi(id, { ...d, hd: "kichhoat", hdBoi: C.mail, hdLuc: luc, hdMa: ma }, [[["thuvien", id], { hien: true, hd: "kichhoat", hdBoi: C.mail, hdLuc: luc, hdMa: ma }, true]]).catch(() => {});
  }
  const sau = [...tv.values()].filter(t => !t.hien && t.hd === "lichxb" && t.tu > now).map(t => t.tu).sort((a, b) => a - b)[0];
  clearTimeout(kichHoatLich.h); if (sau && sau - now < 864e5) kichHoatLich.h = setTimeout(kichHoatLich, sau - now + 1500);
}

/* ---------- Trạng thái hiển thị ---------- */
function nhom(d) {
  const t = tv.get(d.ma);
  if (d.luuTru) return "luu";
  if (t && t.hien) return "hien";
  if (t && t.hd === "lichxb") return "lich";
  if (d.tt === "cho") return "cho";
  if (d.tt === "sua" || d.tt === "tuchoi") return "sua";
  if (d.duyet) return "duyet";
  return "nhap";
}
const NHOM = { cho: "Chờ duyệt", nhap: "Bản nháp", sua: "Cần sửa / Từ chối", duyet: "Đã duyệt, chưa xuất bản", hien: "Đang xuất bản", lich: "Hẹn giờ", luu: "Lưu trữ" };
function chipTT(d) {
  const t = tv.get(d.ma), ra = [`<span class="tl-tt t-${d.tt}">${Q.TT[d.tt]} · v${d.ban}</span>`];
  if (t && t.hien) ra.push(`<span class="tl-tt t-hien">Đang hiện v${t.ban}</span>`);
  else if (t && t.hd === "lichxb") ra.push(`<span class="tl-tt t-lich">Hẹn ${gio(t.tu)}</span>`);
  if (d.luuTru) ra.push(`<span class="tl-tt t-luu">Lưu trữ</span>`);
  return ra.join("");
}
const anhVideo = u => { const m = Q.maYoutube(u); return m ? `https://i.ytimg.com/vi/${m}/hqdefault.jpg` : ""; };

/* ---------- Vẽ ---------- */
export function ve() {
  const g = $("#thu-vien"); if (!g || !C) return;
  const dangGo = g.contains(document.activeElement) && document.activeElement.id === "tl-q";
  if (!C.isTeacher) che = "tv";
  else if (!che) che = "kho";
  const soCho = C.isTeacher ? [...nd.values()].filter(d => d.tt === "cho" && !d.luuTru && duoc("duyet", d).ok).length : 0;
  g.innerHTML = `<div class="sec-head"><div><p class="eyebrow">Thư viện học tập</p><h2 id="h-tl">Video, Ebook &amp; tài liệu</h2></div>
      <p class="muted">${C.isTeacher ? "Soạn → gửi duyệt → người có quyền Phê duyệt kiểm tra → người có quyền Xuất bản đưa lên cho học viên. Mỗi bước được ghi lịch sử." : "Video và ebook anh chị đã chọn lọc cho em. Bấm vào để mở trên YouTube / Canva."}</p></div>
    ${C.isTeacher ? `<div class="tl-thanh"><div class="seg" role="group" aria-label="Chế độ xem"><button type="button" data-tlche="kho" aria-pressed="${che === "kho"}">Kho nội dung${soCho ? ` <span class="nbadge num">${soCho}</span>` : ""}</button><button type="button" data-tlche="tv" aria-pressed="${che === "tv"}">Học viên đang thấy</button></div>
      ${coTheTao() ? `<button type="button" class="btn primary" id="tl-tao">+ Thêm nội dung</button>` : ""}</div>
      ${pq && pq.khoa && !C.isAdmin ? `<p class="tv-loi">Tài khoản của anh/chị đang bị khoá trong Phân quyền hệ thống: mọi quyền nội bộ tạm ngừng.</p>` : ""}` : ""}
    <div class="tl-loc">
      <div class="tabs nho" role="tablist" aria-label="Loại tài liệu">${[["", "Tất cả"], ...Object.entries(Q.LOAI)].map(([k, t]) => `<button type="button" class="tab" data-tlloai="${k}" aria-selected="${loc.loai === k}">${t}</button>`).join("")}</div>
      <input id="tl-q" type="search" placeholder="Tìm theo tên…" value="${esc(loc.q)}" aria-label="Tìm trong thư viện" autocomplete="off">
      ${che === "kho" ? `<select id="tl-tt" aria-label="Trạng thái"><option value="">Mọi trạng thái</option>${Object.entries(NHOM).map(([k, t]) => `<option value="${k}"${loc.tt === k ? " selected" : ""}>${t}</option>`).join("")}</select>` : ""}
    </div>
    <div class="tl-than">${che === "kho" ? veKho() : veThuVien()}</div>`;
  gan(g);
  if (veMo) veMo();
  if (dangGo) { const q = $("#tl-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
const khopTim = d => { const w = bo(loc.q).split(" ").filter(Boolean); return w.every(x => bo(d.tieuDe + " " + d.moTa + " " + d.dm).includes(x)); };
function veThuVien() {
  const ds = [...tv.entries()].filter(([, t]) => t.hien && (!loc.loai || t.loai === loc.loai) && khopTim(t))
    .sort((a, b) => Q.DANH_MUC.indexOf(a[1].dm) - Q.DANH_MUC.indexOf(b[1].dm) || (b[1].tu || 0) - (a[1].tu || 0));
  if (!ds.length) return `<div class="tv-trong"><b>${tv.size ? "Không có tài liệu khớp bộ lọc." : "Thư viện chưa có tài liệu nào."}</b><span>${C.isTeacher ? "Tài liệu chỉ hiện ở đây sau khi đã được duyệt và xuất bản." : "Khi anh chị xuất bản video / ebook mới, em sẽ thấy ở đây."}</span></div>`;
  return `<ul class="tl-luoi">${ds.map(([id, t]) => { const anh = t.loai === "video" ? anhVideo(t.nguon) : "";
    return `<li class="tl-the l-${esc(t.loai)}">${t.nguon ? `<a class="tl-anh" href="${esc(t.nguon)}" target="_blank" rel="noopener" aria-label="${esc(NUT_NGUON[t.loai])}: ${esc(t.tieuDe)}">${anh ? `<img src="${esc(anh)}" alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">${ICON[t.loai]}</span>`}</a>` : `<span class="tl-anh"><span aria-hidden="true">${ICON[t.loai]}</span></span>`}
      <div class="tl-noi"><span class="tl-nhan">${esc(Q.LOAI[t.loai])} · ${esc(t.dm)}${C.isTeacher ? ` · ${esc(Q.PHAM_VI[t.phamVi] || t.phamVi)}` : ""}</span><b>${esc(t.tieuDe)}</b>${t.moTa ? `<p>${esc(t.moTa)}</p>` : ""}
      ${t.nguon ? `<a class="btn small" href="${esc(t.nguon)}" target="_blank" rel="noopener">${esc(NUT_NGUON[t.loai])} ↗</a>` : ""}${C.isTeacher ? `<button type="button" class="linkish" data-tlmo="${esc(id)}">Chi tiết</button>` : ""}</div></li>`; }).join("")}</ul>`;
}
function veKho() {
  const ds = [...nd.values()].filter(d => (!loc.loai || d.loai === loc.loai) && (loc.tt ? nhom(d) === loc.tt : nhom(d) !== "luu") && khopTim(d))
    .sort((a, b) => Number(nhom(b) === "cho") - Number(nhom(a) === "cho") || (b.hdLuc || 0) - (a.hdLuc || 0));
  if (!ds.length) return `<div class="tv-trong"><b>${nd.size ? "Không có tài liệu khớp bộ lọc." : "Kho chưa có tài liệu nào anh/chị được xem."}</b><span>${coTheTao() ? "Bấm “+ Thêm nội dung” để soạn video / ebook đầu tiên." : "Khi quản lý cấp quyền, tài liệu thuộc phạm vi của anh/chị sẽ hiện ở đây."}</span></div>`;
  return `<ul class="tl-kho">${ds.slice(0, 120).map(d => {
    const nut = [["gui", "Gửi duyệt", ""], ["duyet", "Duyệt", "primary"], ["xuatban", "Xuất bản", "primary"]].find(([hd]) => duoc(hd, d).ok);
    return `<li class="tl-dong" data-tl="${esc(d.ma)}"><button type="button" class="tl-mo" data-tlmo="${esc(d.ma)}">
      <span class="tl-dong1"><span aria-hidden="true">${ICON[d.loai]}</span> <b>${esc(d.tieuDe)}</b></span>
      <span class="tl-dong2">${chipTT(d)}<span class="tl-cs">${esc(Q.LOAI[d.loai])} · ${esc(d.dm)} · ${esc(Q.CS_TAI_LIEU[d.cs])}</span></span>
      <span class="tl-dong3 muted">${esc(tenNg(d.hdBoi))} · ${esc((Q.TEN_THAO_TAC[d.hd] || d.hd || "").toLowerCase())} · ${gio(d.hdLuc)}${d.nx && (d.tt === "sua" || d.tt === "tuchoi") ? ` · <span class="tl-nx">“${esc(d.nx)}”</span>` : ""}</span></button>
      ${nut ? `<button type="button" class="btn small ${nut[2]}" data-tlhd="${nut[0]}" data-id="${esc(d.ma)}">${nut[1]}</button>` : ""}</li>`; }).join("")}</ul>`;
}
function gan(g) {
  g.querySelectorAll("[data-tlche]").forEach(b => b.onclick = () => { che = b.dataset.tlche; ve(); });
  g.querySelectorAll("[data-tlloai]").forEach(b => b.onclick = () => { loc.loai = b.dataset.tlloai; ve(); });
  const q = g.querySelector("#tl-q"); if (q) q.oninput = () => { loc.q = q.value; ve(); };
  const tt = g.querySelector("#tl-tt"); if (tt) tt.onchange = () => { loc.tt = tt.value; ve(); };
  const tao = g.querySelector("#tl-tao"); if (tao) tao.onclick = () => moForm(null);
  g.querySelectorAll("[data-tlmo]").forEach(b => b.onclick = () => moChiTiet(b.dataset.tlmo));
  g.querySelectorAll("[data-tlhd]").forEach(b => b.onclick = () => { const d = nd.get(b.dataset.id); if (d) hoiThaoTac(b.dataset.tlhd, d); });
}

/* ---------- Soạn / sửa ---------- */
function moForm(d) {
  const moi = !d, tuyChon = [];
  if (moi) for (const l of Object.keys(Q.LOAI)) for (const dm of Q.DANH_MUC) for (const cs of ["Bình Phú", "Kim Quan", "chung"]) if (xetQ("CREATE", { loai: l, dm, cs, ma: "" }).ok) tuyChon.push({ l, dm, cs });
  if (moi && !tuyChon.length) return C.toast("Anh/chị chưa được cấp quyền Tạo nội dung.", "err");
  const doiNguon = moi || duocDoiNguon(d);
  const h = C.moHop(`<h3>${moi ? "Thêm nội dung mới" : "Sửa: " + esc(d.tieuDe)}</h3>
    ${moi ? `<div class="fgrid"><label>Loại<select id="tl-loai"></select></label><label>Danh mục<select id="tl-dm"></select></label><label>Cơ sở<select id="tl-cs"></select></label></div>`
      : `<p class="muted">${esc(Q.LOAI[d.loai])} · ${esc(d.dm)} · ${esc(Q.CS_TAI_LIEU[d.cs])} — ${d.tt === "nhap" ? "đang là bản nháp v" + d.ban : `sửa sẽ tạo phiên bản mới v${d.ban + 1} và cần duyệt lại`}${d.duyet ? `; bản đã duyệt v${d.duyet.ban}${tv.get(d.ma)?.hien ? " vẫn hiện cho học viên tới khi bản mới được duyệt và xuất bản" : " được giữ nguyên"}` : ""}.</p>`}
    <label>Tiêu đề<input id="tl-td" maxlength="150" required value="${esc(d ? d.tieuDe : "")}"></label>
    <label>Link nguồn <small class="muted" id="tl-ng-gy"></small><input id="tl-ng" type="url" inputmode="url" maxlength="500" value="${esc(d ? d.nguon : "")}"${doiNguon ? "" : " readonly aria-describedby=\"tl-ng-kq\""}></label>
    ${doiNguon ? "" : `<p class="muted" id="tl-ng-kq">🔒 Anh/chị chưa có quyền <b>Thay link nguồn</b> của tài liệu này — chỉ sửa được tiêu đề và mô tả.</p>`}
    <label>Mô tả / lời dặn<textarea id="tl-mt" maxlength="2000">${esc(d ? d.moTa : "")}</textarea></label>
    <p class="tl-loi" role="alert" hidden></p>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn" type="button" id="tl-luu">Lưu bản nháp</button><button class="btn primary" type="button" id="tl-gui">Lưu &amp; gửi duyệt</button></div>`, moi ? "Thêm nội dung" : "Sửa nội dung");
  const E = s => h.el.querySelector(s), goc = () => [E("#tl-td").value, E("#tl-ng").value, E("#tl-mt").value].join("|");
  const dau = goc(); h.chanDong = () => goc() !== dau ? "Nội dung chưa lưu." : "";
  const loai = () => moi ? E("#tl-loai").value : d.loai;
  const goiY = () => { E("#tl-ng-gy").textContent = { video: "(link YouTube)", ebook: "(link Canva: canva.com/… hoặc canva.link/…)", giaotrinh: "(https://…, không bắt buộc)", khoahoc: "(https://…, không bắt buộc)" }[loai()]; };
  if (moi) {
    const dat = (sel, vals, ten = x => x) => { const cu = E(sel).value; E(sel).innerHTML = vals.map(v => `<option value="${esc(v)}"${v === cu ? " selected" : ""}>${esc(ten(v))}</option>`).join(""); };
    const dongBo = () => { dat("#tl-loai", [...new Set(tuyChon.map(o => o.l))], v => Q.LOAI[v]);
      dat("#tl-dm", [...new Set(tuyChon.filter(o => o.l === E("#tl-loai").value).map(o => o.dm))]);
      dat("#tl-cs", tuyChon.filter(o => o.l === E("#tl-loai").value && o.dm === E("#tl-dm").value).map(o => o.cs), v => Q.CS_TAI_LIEU[v]); goiY(); };
    dongBo(); E("#tl-loai").onchange = dongBo; E("#tl-dm").onchange = dongBo;
  } else goiY();
  let dang = false;
  const luu = async gui => {
    if (dang) return; const loi = E(".tl-loi"), bao = t => { loi.textContent = t; loi.hidden = !t; };
    const f = { tieuDe: E("#tl-td").value.trim(), moTa: E("#tl-mt").value.trim(), nguon: E("#tl-ng").value.trim() };
    if (!f.tieuDe) return bao("Nhập tiêu đề.");
    if (!Q.nguonHopLe(loai(), f.nguon)) return bao(loai() === "video" ? "Link YouTube chưa đúng (VD: https://youtu.be/… hoặc https://www.youtube.com/watch?v=…)." : loai() === "ebook" ? "Link Canva chưa đúng (VD: https://www.canva.com/design/…)." : "Link phải bắt đầu bằng https://");
    if (!moi && f.tieuDe === d.tieuDe && f.moTa === d.moTa && f.nguon === d.nguon && !gui) return h.dong(false, true);
    dang = true; bao("");
    const luc = Date.now(), ma = Q.maHd(luc);
    try {
      let n;
      if (moi) { const id = C.fs.doc(C.fs.collection(C.db, "noidung")).id; n = Q.taoMoi(id, { loai: E("#tl-loai").value, dm: E("#tl-dm").value, cs: E("#tl-cs").value, ...f }, C.mail, luc, ma); await ghi(id, n); }
      else if (f.tieuDe !== d.tieuDe || f.moTa !== d.moTa || f.nguon !== d.nguon) { n = Q.sua(d, f, C.mail, luc, ma); await ghi(d.ma, n); }
      else n = d;
      if (gui && ["nhap", "sua", "tuchoi"].includes(n.tt)) { const l2 = Math.max(Date.now(), luc + 1); await ghi(n.ma, Q.chuyen(n, "gui", C.mail, l2, Q.maHd(l2))); }
      h.dong(false, true); C.toast(gui ? "Đã gửi duyệt. Người có quyền Phê duyệt sẽ kiểm tra." : "Đã lưu bản nháp.", "ok");
    } catch (e) { dang = false; bao(e && e.code === "permission-denied" ? "Máy chủ từ chối: anh/chị không còn quyền này hoặc tài liệu vừa được người khác thay đổi." : "Chưa lưu được. Kiểm tra mạng rồi thử lại."); }
  };
  E("#tl-luu").onclick = () => luu(false); E("#tl-gui").onclick = () => luu(true);
  E("#tl-td").focus();
}

/* ---------- Chi tiết + thao tác ---------- */
const THU_TU = ["sua", "gui", "duyet", "yeucausua", "tuchoi", "xuatban", "phamvi", "an", "thuhoi", "luutru", "khoiphuc", "xoa"];
const TEN_NUT = { sua: "Sửa", gui: "Gửi duyệt", duyet: "Phê duyệt", yeucausua: "Yêu cầu sửa", tuchoi: "Từ chối", xuatban: "Xuất bản / hẹn giờ", phamvi: "Đổi phạm vi xem",
  an: "Ẩn khỏi thư viện", thuhoi: "Thu hồi phê duyệt", luutru: "Lưu trữ", khoiphuc: "Khôi phục", xoa: "Xoá hẳn" };
async function moChiTiet(id) {
  const d0 = nd.get(id), t0 = tv.get(id);
  if (!d0) { if (t0) return C.toast("Anh/chị chỉ được xem bản đã xuất bản của tài liệu này.", ""); return; }
  const h = C.moHop(`<div id="tl-ct"></div>`, "Chi tiết nội dung");
  let ls = null;
  const ve1 = () => {
    const d = nd.get(id); if (!d) return h.dong(false, true); const t = tv.get(id);
    const nxCu = h.el.querySelector("#tl-nx")?.value || "", goNx = document.activeElement?.id === "tl-nx";
    const cac = THU_TU.map(hd => [hd, duoc(hd, d)]), duocLam = cac.filter(([, r]) => r.ok), khong = cac.filter(([, r]) => !r.ok);
    const ban = (ten, b, them = "") => `<div class="tl-ban"><b>${ten}</b>${them}<p><span class="muted">Tiêu đề:</span> ${esc(b.tieuDe)}</p>${b.moTa ? `<p><span class="muted">Mô tả:</span> ${esc(b.moTa)}</p>` : ""}${b.nguon ? `<p><span class="muted">Nguồn:</span> <a href="${esc(b.nguon)}" target="_blank" rel="noopener">${esc(b.nguon)}</a></p>` : ""}</div>`;
    h.el.querySelector("#tl-ct").innerHTML = `<h3>${ICON[d.loai]} ${esc(d.tieuDe)}</h3>
      <p class="tl-dong2">${chipTT(d)}<span class="tl-cs">${esc(Q.LOAI[d.loai])} · ${esc(d.dm)} · ${esc(Q.CS_TAI_LIEU[d.cs])}</span></p>
      <p class="muted">Tác giả: ${esc(tenNg(d.tacGia))} · Người soạn phiên bản v${d.ban}: ${esc((d.nguoi || []).map(tenNg).join(", "))}</p>
      ${d.nx ? `<p class="tl-nx-o">💬 ${esc(tenNg(d.nxBoi))}: “${esc(d.nx)}”</p>` : ""}
      <div class="tl-bans">${ban(`Bản đang soạn · v${d.ban} · ${Q.TT[d.tt]}`, d)}
        ${d.duyet && (d.duyet.ban !== d.ban || d.tt !== "duyet") ? ban(`Bản đã duyệt · v${d.duyet.ban}`, d.duyet, `<small class="muted"> — ${esc(tenNg(d.duyet.boi))} duyệt ${gio(d.duyet.luc)}</small>`) : d.duyet ? `<p class="muted">✓ ${esc(tenNg(d.duyet.boi))} duyệt v${d.duyet.ban} lúc ${gio(d.duyet.luc)}</p>` : ""}
        ${t ? `<p class="tl-xb">${t.hien ? "🟢 Đang hiện" : t.hd === "lichxb" ? "🕒 Hẹn giờ " + gio(t.tu) : "⚪ Đã ẩn"} trong thư viện: v${t.ban} · ${esc(Q.PHAM_VI[t.phamVi] || t.phamVi)} · ${esc(tenNg(t.xbBoi))} xuất bản ${gio(t.xbLuc)}${!t.hien && t.lyDo ? ` · lý do ẩn: “${esc(t.lyDo)}”` : ""}</p>` : `<p class="muted">Chưa xuất bản.</p>`}</div>
      ${duocLam.length ? `<label class="tl-nxo">Nhận xét / lý do <small class="muted">(bắt buộc khi yêu cầu sửa, từ chối, thu hồi)</small><textarea id="tl-nx" maxlength="500"></textarea></label>
        <div class="tl-nuts">${duocLam.map(([hd, r]) => `<button type="button" class="btn small${["duyet", "xuatban"].includes(hd) ? " primary" : ["tuchoi", "thuhoi", "xoa"].includes(hd) ? " nguy" : ""}" data-ct="${hd}"${r.ly ? ` title="${esc(r.ly)}"` : ""}>${TEN_NUT[hd]}</button>`).join("")}</div>`
        : `<p class="muted">Anh/chị chỉ được xem tài liệu này.</p>`}
      <details class="tl-vi"><summary>Vì sao một số thao tác không làm được (${khong.length})</summary><ul>${khong.map(([hd, r]) => `<li><b>${TEN_NUT[hd]}</b>: ${esc(r.ly)}${r.muc ? ` <small class="muted">(mức ${r.muc})</small>` : ""}</li>`).join("")}</ul></details>
      <details class="tl-ls" open><summary>Lịch sử thao tác</summary><div id="tl-ls">${ls ? veLs(ls) : "<p class='muted'>Đang tải…</p>"}</div></details>`;
    const nxO = h.el.querySelector("#tl-nx"); if (nxO) { nxO.value = nxCu; if (goNx) nxO.focus(); }
    h.el.querySelectorAll("[data-ct]").forEach(b => b.onclick = () => hoiThaoTac(b.dataset.ct, nd.get(id), h.el.querySelector("#tl-nx")?.value || "", () => ve1()));
  };
  ve1();
  const { getDocs, collection, query, orderBy } = C.fs;
  getDocs(query(collection(C.db, "noidung", id, "ls"), orderBy("luc", "desc"))).then(s => { ls = s.docs.map(x => x.data()); const o = h.el.querySelector("#tl-ls"); if (o) o.innerHTML = veLs(ls); })
    .catch(() => { const o = h.el.querySelector("#tl-ls"); if (o) o.innerHTML = "<p class='muted'>Chưa tải được lịch sử.</p>"; });
  veMo = ve1; h.khiDong = () => { veMo = null; };
}
const veLs = ls => ls.length ? `<ol class="tl-lsds">${ls.map(x => `<li><span class="num">${gio(x.luc)}</span> <b>${esc(tenNg(x.ai))}</b> ${esc((Q.TEN_THAO_TAC[x.hd] || x.hd).toLowerCase())} v${x.ban}${x.nx ? ` — “${esc(x.nx)}”` : ""}</li>`).join("")}</ol>` : "<p class='muted'>Chưa có.</p>";

async function hoiThaoTac(hd, d, nx = "", sau) {
  if (!d) return;
  const r = duoc(hd, d); if (!r.ok) return C.toast(r.ly, "err");
  if (hd === "sua") return moForm(d);
  if (["yeucausua", "tuchoi", "thuhoi"].includes(hd) && !nx.trim()) return C.toast("Ghi lý do vào ô Nhận xét / lý do trước.", "err");
  if (hd === "xuatban" || hd === "phamvi") return moXuatBan(hd, d);
  if (["thuhoi", "luutru", "xoa", "an", "tuchoi"].includes(hd)) {
    const t = tv.get(d.ma), canh = { thuhoi: `Thu hồi phê duyệt v${d.duyet?.ban}.${t && (t.hien || t.hd === "lichxb") ? " Bản đang hiện / hẹn giờ trong thư viện sẽ bị ẩn ngay." : ""}`,
      luutru: "Lưu trữ tài liệu." + (t && t.hien ? " Bản đang hiện sẽ bị ẩn." : ""), xoa: "Xoá hẳn tài liệu (lịch sử vẫn được giữ).", an: "Ẩn bản này khỏi thư viện học viên.", tuchoi: "Từ chối phiên bản này." }[hd];
    if (!confirm(canh + "\nTiếp tục?")) return;
  }
  if (await thucHien(hd, d, { nx }) && sau) sau();
}
function moXuatBan(hd, d) {
  const t = tv.get(d.ma), ql = xetQ("MANAGE_ACCESS", d).ok, mac = Q.phamViMacDinh(d.cs);
  const pv = Q.phamViCho(d.cs).filter(v => v === mac || ql), cur = hd === "phamvi" ? t.phamVi : mac;
  const h = C.moHop(`<h3>${hd === "phamvi" ? "Đổi phạm vi người xem" : "Xuất bản v" + d.duyet.ban}</h3>
    ${hd === "xuatban" ? `<p class="muted">Sẽ đưa lên đúng <b>phiên bản đã duyệt v${d.duyet.ban}</b> (${esc(tenNg(d.duyet.boi))} duyệt ${gio(d.duyet.luc)}).${d.tt !== "duyet" ? ` Bản đang soạn v${d.ban} chưa duyệt nên <b>không</b> được đưa lên.` : ""}</p>` : ""}
    <label>Phạm vi học viên được xem<select id="xb-pv">${pv.map(v => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(Q.PHAM_VI[v])}</option>`).join("")}</select></label>
    ${!ql && Q.phamViCho(d.cs).length > 1 ? `<p class="muted">🔒 Chọn phạm vi khác mặc định cần quyền <b>Quản lý quyền xem</b>.</p>` : ""}
    ${hd === "xuatban" ? `<fieldset class="xb-khi"><legend>Thời điểm</legend><label class="tv-chk"><input type="radio" name="xb-khi" value="ngay" checked> Xuất bản ngay</label>
      <label class="tv-chk"><input type="radio" name="xb-khi" value="hen"> Hẹn giờ</label><input type="datetime-local" id="xb-tu" aria-label="Giờ xuất bản" disabled>
      <small class="muted">Tới giờ hẹn, hệ thống kiểm tra lại: bản vẫn còn được duyệt và người hẹn vẫn còn quyền Xuất bản thì mới hiện.</small></fieldset>` : ""}
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="xb-ok">${hd === "phamvi" ? "Lưu phạm vi" : "Xuất bản"}</button></div>`, "Xuất bản");
  const E = s => h.el.querySelector(s);
  h.el.querySelectorAll("[name=xb-khi]").forEach(r => r.onchange = () => { E("#xb-tu").disabled = r.value !== "hen" || !r.checked; E("#xb-ok").textContent = r.value === "hen" && r.checked ? "Hẹn giờ" : "Xuất bản"; });
  let dang = false;
  E("#xb-ok").onclick = async () => {
    if (dang) return; let tu = 0;
    if (hd === "xuatban" && h.el.querySelector("[name=xb-khi]:checked").value === "hen") {
      tu = Date.parse(E("#xb-tu").value); if (!tu || tu <= Date.now() + 60000) return C.toast("Chọn giờ hẹn sau thời điểm hiện tại ít nhất 1 phút.", "err");
    }
    dang = true; if (await thucHien(hd, nd.get(d.ma) || d, { phamVi: E("#xb-pv").value, tu })) h.dong(false, true); else dang = false;
  };
}
