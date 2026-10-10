// =====================================================================
//  THƯ VIỆN VIDEO (YouTube) & EBOOK (Canva) — trang #video, #ebook
//  Học viên: danh mục bên trái, thẻ bên phải (cùng bố cục Giáo trình), xem nhúng, đánh dấu đã học.
//  Quản lý / giáo viên được cấp quyền: khu "Quản lý" — thêm, gửi duyệt, duyệt, xuất bản, ẩn, lưu trữ, phạm vi xem.
//  Luật nghiệp vụ ở thu-vien-luat.js; máy chủ chặn lại ở firestore.rules (tv_video, tv_ebook, tv_meta, tv_lichsu, tv_tiendo).
//  app.js gọi gan(layNguCanh) một lần, doiNguoi() khi đăng nhập/đăng xuất, ve(loai) khi mở trang.
// =====================================================================
import { THU_VIEN, DUYET, HIEN_THI, PHAM_VI, QUYEN_GV, TAB_QL, NOI_DUNG, kiemLink, khoaTrung, ytId, ytAnh, ytNhung, kiemCanva, httpsHopLe,
  coQuyen, coTheQuanLy, hocVienXem, thaoTac, chuyen, luuNoiDung, taiLieuMoi } from "./thu-vien-luat.js?v=20261011a";
import { VIDEO_MAU, DANH_MUC_MAU, MO_TA_MAU } from "../../data/video-mau.js?v=20261011a";

import * as Q from './quyen.js?v=20261011a';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bo = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const pad2 = n => String(n).padStart(2, "0");
const ngayGio = t => { if (!t) return ""; const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const LOAI = Object.keys(THU_VIEN);
const MAU_ID = id => "yt-" + id;
const KHOA = ["Hình hoạ cơ bản", "Hình hoạ người", "Hình hoạ tượng", "Màu & bố cục màu", "Mỹ thuật 2", "Ôn thi cấp tốc"];

let layCtx = null, nguoiKhoa = "";
const D = {}, V = {}, huy = [];
LOAI.forEach(l => { D[l] = { ds: new Map(), pub: new Map(), meta: null, loi: "", taiXong: false, ls: [] }; V[l] = { che: "tv", dm: "", loc: "tat", tim: "", mo: null, tab: "tat", soan: null, nhay: "", moThem: "" }; });
let tienDo = { video: {}, ebook: {} }, tienDoLop = {}, dangNghe = new Set(), quyenTV = null;

const C = () => layCtx ? layCtx() : {};
// quyenTV: quyền thư viện quản lý cấp cho giáo viên (nghe trực tiếp giaovien/<gmail> nên cấp xong là có, không phải tải lại)
const ai = loai => { const c = C(); return { admin: !!c.isAdmin, gv: !!c.isTeacher && !c.isAdmin, mail: c.mail || "", ten: c.ten || "", loai, p: c.myPQ || undefined, quyen: ((quyenTV || (c.myGvDoc || {}).quyenTV) || {})[loai] || {} }; };
const nguoiXem = () => { const c = C(); return { mail: c.mail || "", hocVien: !!c.approved || !!c.isTeacher, khoa: c.khoa || [] }; };

export function gan(fn) {
  layCtx = fn;
  // Bấm Nhắc việc: mở khu Quản lý, đúng tab, cuộn tới đúng tài liệu
  window.__tvMo = (loai, id) => { const v = V[loai]; if (!v) return; const d = id && D[loai].ds.get(id);
    v.che = "ql"; v.tab = C().isAdmin && (!d || d.duyet === "cho") ? "cho" : "tat"; v.nhay = id || ""; v.soan = null; ve(loai); };
}

/* ---------------- Nghe dữ liệu theo vai trò ---------------- */
export function doiNguoi() {
  huy.splice(0).forEach(u => { try { u(); } catch (e) {} });
  dangNghe.clear(); tienDo = { video: {}, ebook: {} }; tienDoLop = {}; quyenTV = null;
  LOAI.forEach(l => { Object.assign(D[l], { ds: new Map(), pub: new Map(), meta: null, loi: "", taiXong: false, ls: [] }); Object.assign(V[l], { che: "tv", mo: null, soan: null, tab: "tat" }); });
  const c = C(); nguoiKhoa = c.mail || "";
  if (c.isTeacher && !c.isAdmin && c.db) { const { db, fs: { doc, onSnapshot } } = c;
    huy.push(onSnapshot(doc(db, "giaovien", c.mail), s => { quyenTV = (s.exists() && s.data().quyenTV) || {}; LOAI.forEach(veNeuDangMo); }, () => {})); }
  if (c.isTeacher) LOAI.forEach(nghe); // quản lý / giáo viên: cần số chờ duyệt cho Nhắc việc
}
function nghe(loai) {
  const c = C(); if (!c.db || dangNghe.has(loai)) return; dangNghe.add(loai);
  const { db, fs: { collection, doc, query, where, onSnapshot } } = c, col = THU_VIEN[loai].col, d = D[loai];
  const nguon = new Map(); // mỗi truy vấn một phần, gộp lại theo id
  const gop = () => { d.ds = new Map(); nguon.forEach(m => m.forEach((v, k) => d.ds.set(k, v))); d.taiXong = true; veNeuDangMo(loai); C().capNhatNhac?.(); };
  const theo = (ten, q) => huy.push(onSnapshot(q, s => { nguon.set(ten, new Map(s.docs.map(x => [x.id, { id: x.id, ...x.data() }]))); d.loi = ""; gop(); },
    e => { d.loi = (e && e.code) || "loi"; d.taiXong = true; veNeuDangMo(loai); }));
  const pubCol = col + '_public';
  const xb = (...w) => query(collection(db, pubCol), where('hienThi','==','xuatban'), where('lichXuatBan','<=',Date.now()), ...w);
  if (c.isTeacher) huy.push(onSnapshot(collection(db,pubCol), snap => { d.pub = new Map(snap.docs.map(x => [x.id,{id:x.id,...x.data()}])); veNeuDangMo(loai); },()=>{}));
  const daNghePhamVi=new Set();
  const nghePhamVi=()=>{if(!c.isTeacher || c.isAdmin || !c.myPQ) return;
    for(const o of Q.oDuocXem(c.myPQ,Date.now(),d.meta?.danhMuc || []).filter(o=>o.loai===loai)) {
      const coCam=!!c.myPQ.camXem?.length,buoc=coCam ? 1 : 10;
      for(let i=0;i<o.dm.length;i+=buoc){const dm=o.dm.slice(i,i+buoc),key=o.cs+'|'+dm.join('|'); if(daNghePhamVi.has(key))continue;daNghePhamVi.add(key);
        const w=[where('coSo','==',o.cs),where('danhMuc',coCam ? '==' : 'in',coCam ? dm[0] : dm)];
        if(c.myPQ.camXem?.length)w.push(where('__name__','not-in',c.myPQ.camXem));
        theo(key,query(collection(db,col),...w));
      }
    }
  };
  if (c.isAdmin) theo("tat", collection(db, col));
  else if (c.isTeacher) {
    theo('cua-toi', query(collection(db,col),where('nguoiTao','==',c.mail)));
    if (!c.myPQ) theo('xb',query(collection(db,col),where('hienThi','==','xuatban')));
    else {
      nghePhamVi();
      for (const [key,g] of Object.entries(c.myPQ.cap || {})) if (key.startsWith('doc:') && g.a?.includes('VIEW')) {
        const id=key.slice(4);
        huy.push(onSnapshot(doc(db,col,id),snap => {
          const nd=snap.exists() ? {id:snap.id,...snap.data()} : null;
          if(nd && Q.xet(c.myPQ,'VIEW',{loai,dm:nd.danhMuc,cs:nd.coSo || 'chung',id},{laGV:true}).ok) nguon.set(key,new Map([[id,nd]])); else nguon.delete(key);
          gop();
        },()=>{}));
      }
    }
  }
  else {
    theo("congkhai", xb(where("phamViKieu", "==", "congkhai")));
    if (c.mail) theo("taikhoan", xb(where("phamViKieu", "==", "taikhoan"), where("phamViMail", "array-contains", c.mail)));
    if (c.approved) { theo("hocvien", xb(where("phamViKieu", "==", "hocvien"))); if (c.khoa?.length) theo('khoa',xb(where('phamViKieu','==','khoa'),where('phamViKhoa','array-contains-any',c.khoa.slice(0,30)))); }
  }
  huy.push(onSnapshot(doc(db, "tv_meta", loai), s => { d.meta = s.exists() ? s.data() : {}; nghePhamVi(); veNeuDangMo(loai); }, () => { d.meta = {}; veNeuDangMo(loai); }));
  if (c.mail && c.approved && !c.isTeacher && !dangNghe.has("td")) { dangNghe.add("td");
    huy.push(onSnapshot(doc(db, "tv_tiendo", c.mail), s => { const x = s.exists() ? s.data() : {}; tienDo = { video: x.video || {}, ebook: x.ebook || {} }; LOAI.forEach(veNeuDangMo); }, () => {})); }
  if (c.isTeacher && (c.isAdmin || coQuyen(ai(loai), "thongKe")) && !dangNghe.has("td-lop")) { dangNghe.add("td-lop");
    huy.push(onSnapshot(collection(db, "tv_tiendo"), s => { tienDoLop = {}; s.docs.forEach(x => tienDoLop[x.id] = x.data()); LOAI.forEach(veNeuDangMo); }, () => {})); }
  if (c.isAdmin) huy.push(onSnapshot(query(collection(db, "tv_lichsu"), where("thuVien", "==", loai)), s => {
    d.ls = s.docs.map(x => x.data()).sort((a, b) => b.luc - a.luc).slice(0, 40); veNeuDangMo(loai); }, () => {}));
}

/* ---------------- Dữ liệu hiển thị ---------------- */
const tatCa = loai => [...D[loai].ds.values()];
// Chưa nạp 17 video có sẵn vào thư viện: vẫn hiện từ data/video-mau.js cho học viên đã duyệt (không mất video cũ)
function videoMau() {
  return VIDEO_MAU.map(([link, tieuDe], i) => { const id = ytId(link);
    return { id: MAU_ID(id), mau: true, tieuDe, moTa: MO_TA_MAU, danhMuc: DANH_MUC_MAU, link, ytId: id, anh: ytAnh(id), thuTu: i, duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1, phamViKieu: "hocvien" }; });
}
function hocDuoc(loai) {
  const n = nguoiXem(), ds = [...(C().isTeacher ? D[loai].pub : D[loai].ds).values()].filter(d => hocVienXem(d,n));
  const meta = D[loai].meta || {};
  if (loai === "video" && !meta.daNapMau && n.hocVien) videoMau().forEach(m => { if (!D[loai].ds.has(m.id)) ds.push(m); });
  return ds.sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0) || String(a.tieuDe).localeCompare(String(b.tieuDe), "vi"));
}
const danhMucCua = (loai, ds) => { const thu = (D[loai].meta || {}).danhMuc || [];
  return [...new Set([...thu, ...ds.map(d => d.danhMuc || "Khác")])].filter(dm => ds.some(d => (d.danhMuc || "Khác") === dm)); };
const daHoc = (loai, id) => !!(tienDo[loai] || {})[id];
const anhCua = (loai, d) => d.anh || (d.ytId ? ytAnh(d.ytId) : "");
const nhungCua = (loai, d) => loai === "video" ? (d.ytId ? ytNhung(d.ytId) : "") : (kiemCanva(d.link).nhung || "");

/* ---------------- Vẽ ---------------- */
function veNeuDangMo(loai) { if (location.hash === "#" + loai) ve(loai); }
export function ve(loai) {
  const box = document.getElementById("tv-" + loai); if (!box) return;
  nghe(loai);
  const c = C(), v = V[loai], A = ai(loai);
  if (!c.db) { box.innerHTML = `<p class="muted gt-trong">Đang kết nối máy chủ…</p>`; return; }
  const ql = coTheQuanLy(A);
  if (!ql) v.che = "tv";
  // Đang gõ trong khung soạn: không vẽ lại cả trang (tránh mất chữ đang nhập)
  const form=box.querySelector('.tv-soan');
  if (v.che === 'ql' && v.soan && form && form.dataset.soanid === (v.soan.id || '')) { veDanhSachQL(loai); return; }
  if (box.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && box.dataset.che === v.che && v.che === "ql") { veDanhSachQL(loai); return; }
  box.dataset.che = v.che;
  const dau = ql ? `<div class="tabs tv-che" role="tablist" aria-label="${THU_VIEN[loai].ten}"><button type="button" class="tab" role="tab" data-tv-che="tv" aria-selected="${v.che === "tv"}">Thư viện</button><button type="button" class="tab" role="tab" data-tv-che="ql" aria-selected="${v.che === "ql"}">Quản lý ${THU_VIEN[loai].tenNho}${soCho(loai) ? ` <span class="nbadge num">${soCho(loai)}</span>` : ""}</button></div>` : "";
  box.innerHTML = dau + (v.che === "ql" ? veQL(loai) : veThuVien(loai));
  box.querySelectorAll("[data-tv-che]").forEach(b => b.onclick = () => { v.che = b.dataset.tvChe; v.mo = null; ve(loai); });
  if (v.che === "ql") ganQL(loai); else ganThuVien(loai);
}
const soCho = loai => tatCa(loai).filter(d => d.duyet === "cho").length;
const thongBaoLoi = loai => D[loai].loi ? `<div class="vh-loi"><b>Thư viện ${THU_VIEN[loai].tenNho} chưa bật được trên máy chủ.</b><p class="muted">Cần đưa luật bảo mật mới (firestore.rules) lên Firebase. Mã: ${esc(D[loai].loi)}</p></div>` : "";

function veThuVien(loai) {
  const v = V[loai], T = THU_VIEN[loai], c = C(), ds = hocDuoc(loai), hv = !!c.approved && !c.isTeacher;
  if (!ds.length) {
    const chuaDN = !c.mail;
    return thongBaoLoi(loai) + `<p class="muted gt-trong">${!D[loai].taiXong && !D[loai].loi ? "Đang tải…" : chuaDN ? `${T.ten} dành cho học viên đã được duyệt. <a href="#tai-khoan">Đăng nhập</a> để xem.` : `Chưa có ${T.tenNho} nào${coTheQuanLy(ai(loai)) ? " — mở tab Quản lý để thêm." : "."}`}</p>`;
  }
  const dms = danhMucCua(loai, ds);
  if (v.dm && !dms.includes(v.dm)) v.dm = "";
  const trongDM = ds.filter(d => !v.dm || (d.danhMuc || "Khác") === v.dm);
  const q = bo(v.tim).split(/\s+/).filter(Boolean);
  const loc = trongDM.filter(d => q.every(w => bo(`${d.tieuDe} ${d.moTa} ${d.danhMuc}`).includes(w)))
    .filter(d => v.loc === "tat" || (v.loc === "xong") === daHoc(loai, d.id));
  const xong = n => n.filter(d => daHoc(loai, d.id)).length;
  const nut = (k, ten, n) => `<button type="button" class="gt-mon-nut" data-tv-dm="${esc(k)}" aria-pressed="${v.dm === k}"><b>${esc(ten)}</b><small class="num">${hv ? `${xong(n)}/${n.length}` : n.length} ${T.tenNho}</small></button>`;
  const pt = trongDM.length ? Math.round(xong(trongDM) / trongDM.length * 100) : 0;
  const mo = v.mo && ds.find(d => d.id === v.mo);
  const the = (d, i) => `<button type="button" class="gt-the tt-${hv ? (daHoc(loai, d.id) ? "xong" : "chua") : "gv"}" data-tv-xem="${esc(d.id)}">
      <span class="gt-anh tv-anh-${loai}">${anhCua(loai, d) ? `<img src="${esc(anhCua(loai, d))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="gt-ph">${T.icon}</span>`}</span>
      <span class="gt-noi"><small class="gt-so">${T.ten} ${pad2(i + 1)}${d.thoiLuong ? " · " + esc(d.thoiLuong) : ""}</small><b class="gt-ten">${esc(d.tieuDe)}</b><span class="gt-mota">${esc(d.moTa || d.danhMuc || "")}</span>
      <span class="gt-tt">${hv ? (daHoc(loai, d.id) ? `<span class="gt-chip xong"><i aria-hidden="true">✓</i>Đã học</span>` : `<span class="gt-chip"><i aria-hidden="true">○</i>Chưa học</span>`) : `<span class="gt-chip">${esc(d.danhMuc || "Khác")}</span>`}</span></span></button>`;
  return thongBaoLoi(loai) + `<div class="gt-wrap tv-wrap${mo ? " dang-doc" : ""}">
    <aside class="gt-side"><div class="gt-mon" role="navigation" aria-label="Danh mục ${T.tenNho}">${nut("", "Tất cả", ds)}${dms.map(dm => nut(dm, dm, ds.filter(d => (d.danhMuc || "Khác") === dm))).join("")}</div>
      <section class="gt-td" aria-label="Thống kê"><p class="eyebrow">${esc(v.dm || "Tất cả danh mục")}</p>
        ${hv ? `<div class="gt-td-so"><b class="num">${xong(trongDM)}/${trongDM.length}</b><span>${T.tenNho} đã học</span><b class="num gt-pt">${pt}%</b></div>
        <div class="gt-bar" role="progressbar" aria-valuenow="${pt}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ"><i style="width:${pt}%"></i></div>`
        : `<div class="gt-td-so"><b class="num">${trongDM.length}</b><span>${T.tenNho}${c.mail ? "" : " công khai"}</span></div>`}</section></aside>
    <div class="gt-main">
      <label class="tv-tim"><span class="sr-only">Tìm ${T.tenNho}</span><input type="search" id="tv-tim-${loai}" value="${esc(v.tim)}" placeholder="Tìm ${T.tenNho} theo tên, mô tả (không dấu cũng được)" autocomplete="off"></label>
      ${hv ? `<div class="tabs nho gt-loc" aria-label="Lọc">${[["tat", "Tất cả", trongDM.length], ["chua", "Chưa học", trongDM.length - xong(trongDM)], ["xong", "Đã học", xong(trongDM)]].map(([k, t, n]) => `<button type="button" class="tab" data-tv-loc="${k}" aria-selected="${v.loc === k}">${t} <span class="num">${n}</span></button>`).join("")}</div>` : ""}
      <div class="gt-ds">${loc.length ? `<div class="gt-luoi">${loc.map(d => the(d, trongDM.indexOf(d))).join("")}</div>` : `<p class="muted gt-trong">Không có ${T.tenNho} phù hợp.</p>`}</div>
      ${mo ? veChiTiet(loai, mo, hv, trongDM.indexOf(mo)) : ""}
    </div></div>`;
}
function veChiTiet(loai, d, hv, i) {
  const T = THU_VIEN[loai], nhung = nhungCua(loai, d), xong = daHoc(loai, d.id);
  return `<article class="lesson gt-bai tv-bai" id="tv-bai-${loai}" aria-label="${esc(d.tieuDe)}">
    <button type="button" class="gtb-ve" data-tv-dong>← Danh sách ${T.tenNho}</button>
    <div class="gtb-dau"><p class="eyebrow">${esc(d.danhMuc || "")} · ${T.ten} ${pad2(Math.max(i, 0) + 1)}</p><h2>${esc(d.tieuDe)}</h2>${hv ? `<span class="gt-chip ${xong ? "xong" : ""}">${xong ? "✓ Đã học" : "○ Chưa học"}</span>` : ""}</div>
    ${nhung ? `<div class="tv-khung tv-khung-${loai}"><iframe src="${esc(nhung)}" title="${esc(d.tieuDe)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ""}
    ${d.moTa ? `<p class="muted">${esc(d.moTa)}</p>` : ""}
    <div class="ctas"><a class="btn" href="${esc(d.link)}" target="_blank" rel="noopener">Mở trên ${T.nen} ↗</a>${d.pdf && httpsHopLe(d.pdf) ? `<a class="btn" href="${esc(d.pdf)}" target="_blank" rel="noopener">Tải bản PDF</a>` : ""}</div>
    ${hv ? `<button type="button" class="btn ${xong ? "" : "primary"} gtb-xong" data-tv-xong="${esc(d.id)}">${xong ? "Bỏ đánh dấu đã học" : "✓ Đánh dấu đã học"}</button>` : ""}
  </article>`;
}
function ganThuVien(loai) {
  const box = document.getElementById("tv-" + loai), v = V[loai];
  box.querySelectorAll("[data-tv-dm]").forEach(b => b.onclick = () => { v.dm = b.dataset.tvDm; v.mo = null; ve(loai); });
  box.querySelectorAll("[data-tv-loc]").forEach(b => b.onclick = () => { v.loc = b.dataset.tvLoc; ve(loai); });
  box.querySelectorAll("[data-tv-xem]").forEach(b => b.onclick = () => { v.mo = b.dataset.tvXem; ve(loai); requestAnimationFrame(() => C().cuonToi?.(document.getElementById("tv-bai-" + loai))); });
  box.querySelectorAll("[data-tv-dong]").forEach(b => b.onclick = () => { v.mo = null; ve(loai); requestAnimationFrame(() => C().cuonToi?.(box)); });
  box.querySelectorAll("[data-tv-xong]").forEach(b => b.onclick = () => danhDauHoc(loai, b.dataset.tvXong, b));
  const tim = box.querySelector("#tv-tim-" + loai);
  if (tim) tim.oninput = () => { v.tim = tim.value; const pos = tim.selectionStart; ve(loai); const t2 = document.getElementById("tv-tim-" + loai); if (t2) { t2.focus(); try { t2.setSelectionRange(pos, pos); } catch (e) {} } };
}
async function danhDauHoc(loai, id, btn) {
  const c = C(); if (!c.mail || !c.approved || c.isTeacher) return;
  const { db, fs: { doc, setDoc, deleteField } } = c, xong = daHoc(loai, id);
  btn.disabled = true;
  try {
    await setDoc(doc(db, "tv_tiendo", c.mail), { [loai]: { [id]: xong ? deleteField() : Date.now() }, capNhat: Date.now() }, { merge: true });
    c.toast(xong ? "Đã bỏ đánh dấu." : "Đã lưu: em đã học xong ✓");
  } catch (e) { c.toast("Chưa lưu được tiến độ. Kiểm tra mạng rồi bấm lại.", "err"); }
  finally { btn.disabled = false; }
}

/* ---------------- Khu quản lý ---------------- */
function veQL(loai) {
  const v = V[loai], A = ai(loai), T = THU_VIEN[loai], ds = tatCa(loai), c = C();
  const tab = TAB_QL.find(t => t[0] === v.tab) || TAB_QL[0];
  const canCreate = coQuyen(A,'them') || (!!A.p && Q.CO_SO.concat('chung').some(coSo => Q.danhMucCua(A.p).some(danhMuc => coQuyen(A,'them',{coSo,danhMuc}))));
  const soan = v.soan ? veSoan(loai) : (canCreate ? `<button type="button" class="btn primary" data-tv-them>＋ Thêm ${T.tenNho} bằng link ${T.nen}</button>` : "");
  const mau = loai === "video" && A.admin && !(D[loai].meta || {}).daNapMau ? `<div class="card tv-mau"><b>17 video chân dung tham khảo có sẵn</b><p class="muted">Đang hiện tạm cho học viên từ danh sách cũ. Nạp vào thư viện để sắp xếp, ẩn, phân quyền như video khác. Link YouTube giữ nguyên.</p><button type="button" class="btn small primary" data-tv-napmau>Nạp 17 video có sẵn</button></div>` : "";
  return thongBaoLoi(loai) + `<div class="tv-ql" id="tv-ql-${loai}">${mau}<div class="tv-soan-o">${soan}</div>
    <div class="tabs nho tv-tab" role="tablist" aria-label="Trạng thái">${TAB_QL.map(([k, t, f]) => `<button type="button" class="tab" role="tab" data-tv-tab="${k}" aria-selected="${tab[0] === k}">${t} <span class="num">${ds.filter(f).length}</span></button>`).join("")}</div>
    <div class="tv-ds-ql" id="tv-ds-ql-${loai}">${dsQL(loai)}</div>
    ${A.admin || !A.p && coQuyen(A, "danhMuc") ? veDanhMuc(loai) : ""}
    ${A.admin ? veQuyenGV(loai) + veLichSu(loai) : ""}
    ${!c.isAdmin ? `<p class="muted tv-ghi">Giáo viên không tự duyệt được tài liệu của mình; quản lý duyệt rồi mới xuất bản cho học viên.</p>` : ""}</div>`;
}
function dsQL(loai) {
  const v = V[loai], A = ai(loai), T = THU_VIEN[loai];
  const tab = TAB_QL.find(t => t[0] === v.tab) || TAB_QL[0];
  const ds = tatCa(loai).filter(tab[2]).sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0));
  if (!ds.length) return `<p class="muted gt-trong">Không có ${T.tenNho} nào ở mục này.</p>`;
  const hocXong = id => Object.values(tienDoLop).filter(x => (x[loai] || {})[id]).length;
  return ds.map((d, i) => {
    const tt = thaoTac(A, d), chinh = tt.find(x => x.chinh), phu = tt.filter(x => x !== chinh);
    const nd = d.banSua ? { ...d, ...d.banSua } : d;
    const pv = d.phamViKieu === "khoa" ? `Khoá: ${(d.phamViKhoa || []).join(", ")}` : d.phamViKieu === "taikhoan" ? `${(d.phamViMail || []).length} tài khoản` : PHAM_VI[d.phamViKieu] || "";
    const nutTT = x => `<button type="button" class="btn small${x.chinh ? " primary" : ""}${x.xacNhan ? " tv-nguy" : ""}" data-tv-tt="${x.k}" data-id="${esc(d.id)}">${esc(x.nhan)}</button>`;
    return `<article class="card tv-the${v.nhay === d.id ? " nhac-nhay" : ""}" data-tv-id="${esc(d.id)}">
      <span class="gt-anh tv-anh-${loai}">${anhCua(loai, nd) ? `<img src="${esc(anhCua(loai, nd))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="gt-ph">${T.icon}</span>`}</span>
      <div class="tv-the-noi"><b class="tv-the-ten">${esc(nd.tieuDe)}</b>
        <p class="tv-the-chip"><span class="chip tv-d-${d.duyet}">${DUYET[d.duyet] || d.duyet}</span><span class="chip tv-h-${d.hienThi}">${HIEN_THI[d.hienThi] || d.hienThi}${d.lichXuatBan > Date.now() ? " · từ " + ngayGio(d.lichXuatBan) : ""}</span>${d.banSua ? `<span class="chip warn">Có bản sửa</span>` : ""}</p>
        <small class="muted">${esc(nd.danhMuc || "Chưa có danh mục")} · ${esc(pv)} · ${esc(d.tenNguoiTao || d.nguoiTao)}${d.guiLuc ? " · gửi " + ngayGio(d.guiLuc) : ""}${(A.admin || coQuyen(A, "thongKe")) && d.hienThi === "xuatban" ? ` · <b>${hocXong(d.id)}</b> học viên đã học` : ""}</small>
        ${d.lyDo && ["sua", "tuchoi"].includes(d.duyet) ? `<p class="tv-lydo"><b>Lý do:</b> ${esc(d.lyDo)}</p>` : ""}
        <div class="tv-the-nut"><button type="button" class="btn small" data-tv-tt="xem" data-id="${esc(d.id)}">Xem trước</button>${chinh ? nutTT(chinh) : ""}
          ${coQuyen(A, "sapXep") && v.tab === "tat" ? `<button type="button" class="btn small" data-tv-tt="len" data-id="${esc(d.id)}" aria-label="Đưa lên"${i ? "" : " disabled"}>↑</button><button type="button" class="btn small" data-tv-tt="xuong" data-id="${esc(d.id)}" aria-label="Đưa xuống"${i < ds.length - 1 ? "" : " disabled"}>↓</button>` : ""}
          ${phu.length ? `<details class="tv-them" data-them="${esc(d.id)}"${v.moThem === d.id ? " open" : ""}><summary aria-label="Thao tác khác">⋯</summary><div class="tv-them-ds">${phu.map(nutTT).join("")}</div></details>` : ""}</div></div></article>`;
  }).join("");
}
function veDanhSachQL(loai) { const l = document.getElementById("tv-ds-ql-" + loai); if (l) { l.innerHTML = dsQL(loai); ganDS(loai); } }

function veSoan(loai) {
  const v = V[loai], T = THU_VIEN[loai], d = v.soan.id ? D[loai].ds.get(v.soan.id) : null, nd = d ? { ...d, ...(d.banSua || {}) } : v.soan.nhap || {};
  const dms = [...new Set([...((D[loai].meta || {}).danhMuc || []), ...tatCa(loai).map(x => x.danhMuc).filter(Boolean)])];
  const A = ai(loai);
  return `<form class="card tv-soan" data-soanid="${esc(v.soan.id || '')}" id="tv-soan-${loai}" novalidate><h3>${d ? (d.phienDuyet > 0 ? "Tạo bản sửa (bản đang hiển thị giữ nguyên tới khi xuất bản bản sửa)" : "Sửa " + T.tenNho) : "Thêm " + T.tenNho}</h3>
    <label>Link ${T.nen}<input id="tvs-link" type="url" inputmode="url" required maxlength="500" value="${esc(nd.link || "")}" placeholder="${loai === "video" ? "https://www.youtube.com/watch?v=… hoặc https://youtu.be/…" : "https://www.canva.com/design/…/view"}"></label>
    <p class="status" id="tvs-link-tt" role="status"></p>
    <div class="tv-anh-xt" id="tvs-anh-xt" aria-live="polite"></div>
    ${loai === "video" ? `<button type="button" class="btn small" id="tvs-lay">Lấy tiêu đề & ảnh từ YouTube</button>` : ""}
    <div class="fgrid"><label>Tiêu đề<input id="tvs-ten" required maxlength="150" value="${esc(nd.tieuDe || "")}"></label>
      <label>Danh mục<input id="tvs-dm" list="tvs-dm-ds" maxlength="80" value="${esc(nd.danhMuc || "")}" placeholder="VD: Hình họa chân dung"><datalist id="tvs-dm-ds">${dms.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      ${loai === "video" ? `<label>Thời lượng (không bắt buộc)<input id="tvs-tl" maxlength="20" value="${esc(nd.thoiLuong || "")}" placeholder="VD: 12:30"></label>
      <label>Ảnh bìa riêng (link ảnh https, để trống = tự lấy ảnh từ YouTube)<input id="tvs-anh" type="url" inputmode="url" maxlength="500" value="${esc(nd.anh && nd.ytId && nd.anh === ytAnh(nd.ytId) ? "" : nd.anh || "")}"></label>` : `<label>Ảnh bìa (dán link ảnh https, không bắt buộc)<input id="tvs-anh" type="url" inputmode="url" maxlength="500" value="${esc(nd.anh || "")}"></label>
      <label>Bản PDF (link https, chỉ khi có quyền chia sẻ)<input id="tvs-pdf" type="url" maxlength="500" value="${esc(nd.pdf || "")}"></label>`}</div>
    <label>Cơ sở<select id="tvs-cs"${d ? " disabled" : ""}>${Object.entries(Q.CS_TAI_LIEU).map(([k,t]) => '<option value="'+k+'"'+((nd.coSo || 'chung') === k ? ' selected' : '')+'>'+esc(t)+'</option>').join('')}</select></label>
    <label>Mô tả<textarea id="tvs-mt" maxlength="1000">${esc(nd.moTa || "")}</textarea></label>
    <div class="tv-xemtruoc" id="tvs-xt"></div>
    <div class="ctas"><button type="button" class="btn" data-tvs="huy">Huỷ</button><button type="button" class="btn small" data-tvs="xt">Xem trước</button>
      <button type="button" class="btn" data-tvs="nhap">Lưu nháp</button><button type="submit" class="btn primary" data-tvs="gui">${A.admin ? "Lưu & gửi vào hàng chờ duyệt" : "Gửi duyệt"}</button></div></form>`;
}
function docSoan(loai) {
  const g = id => (document.getElementById(id) || {}).value?.trim() || "";
  const k = kiemLink(loai, g("tvs-link"));
  if (k.loi) return { loi: k.loi };
  const nd = { tieuDe: g("tvs-ten").slice(0, 150), moTa: g("tvs-mt").slice(0, 1000), danhMuc: g("tvs-dm").slice(0, 80), coSo: g("tvs-cs") || "chung", link: k.link };
  if (!nd.tieuDe) return { loi: "Nhập tiêu đề." };
  // Ảnh bìa: video tự lấy ảnh thu nhỏ từ link YouTube, dán link ảnh riêng thì dùng ảnh đó
  if (!httpsHopLe(g("tvs-anh"))) return { loi: "Ảnh bìa phải là link https://" };
  if (loai === "video") Object.assign(nd, { ytId: k.ytId, anh: g("tvs-anh") || k.anh, thoiLuong: g("tvs-tl").slice(0, 20) });
  else { nd.anh = g("tvs-anh"); nd.pdf = g("tvs-pdf"); if (!httpsHopLe(nd.pdf)) return { loi: "Link PDF phải là https://" }; }
  return { nd, nhung: k.nhung };
}
function trungLink(loai, link, boQua) {
  const k = khoaTrung(loai, link);
  return tatCa(loai).find(d => d.id !== boQua && d.hienThi !== "luutru" && [d.link, d.banSua?.link].some(x => x && khoaTrung(loai, x) === k));
}

function ganQL(loai) {
  const box = document.getElementById("tv-" + loai), v = V[loai];
  box.querySelectorAll("[data-tv-tab]").forEach(b => b.onclick = () => { v.tab = b.dataset.tvTab; ve(loai); });
  const them = box.querySelector("[data-tv-them]"); if (them) them.onclick = () => { v.soan = {}; ve(loai); requestAnimationFrame(() => { $("#tvs-link")?.focus(); }); };
  const nap = box.querySelector("[data-tv-napmau]"); if (nap) nap.onclick = () => napMau(nap);
  ganSoan(loai); ganDS(loai); ganDanhMuc(loai); ganQuyenGV(loai);
  if (v.nhay) { const el = box.querySelector(`[data-tv-id="${CSS.escape(v.nhay)}"]`); v.nhay = ""; if (el) requestAnimationFrame(() => C().cuonToi?.(el, "center")); }
}
function ganSoan(loai) {
  const f = document.getElementById("tv-soan-" + loai); if (!f) return;
  const v = V[loai], st = f.querySelector("#tvs-link-tt"), say = (t, loi) => { st.textContent = t; st.classList.toggle("err", !!loi); };
  const link = f.querySelector("#tvs-link");
  const kiem = () => { const k = kiemLink(loai, link.value); if (!link.value.trim()) return say("");
    if (k.loi) return say(k.loi, true);
    const tr = trungLink(loai, k.link, v.soan.id); say(tr ? `Trùng với “${tr.tieuDe}” (${DUYET[tr.duyet]}, ${HIEN_THI[tr.hienThi]}).` : "Link hợp lệ ✓", !!tr); };
  // Ảnh xem trước ngay khi dán link: ảnh bìa riêng nếu có, không thì ảnh thu nhỏ của video YouTube
  const oAnh = f.querySelector("#tvs-anh"), xtAnh = f.querySelector("#tvs-anh-xt");
  const veAnh = () => { const rieng = (oAnh && oAnh.value.trim()) || "", k = kiemLink(loai, link.value), src = httpsHopLe(rieng) && rieng ? rieng : k.anh || "";
    xtAnh.innerHTML = src ? `<img src="${esc(src)}" alt="Ảnh bìa xem trước" referrerpolicy="no-referrer"><small class="muted">${rieng ? "Ảnh bìa từ link đã dán" : "Ảnh tự lấy từ YouTube"}</small>` : ""; };
  link.oninput = () => { kiem(); veAnh(); }; kiem(); veAnh();
  if (oAnh) oAnh.oninput = veAnh;
  const lay = f.querySelector("#tvs-lay");
  if (lay) lay.onclick = async () => {
    const k = kiemLink("video", link.value); if (k.loi) return say(k.loi, true);
    lay.disabled = true; say("Đang lấy thông tin…");
    // oEmbed công khai của YouTube: chỉ gửi link video, không gửi dữ liệu học viên. Không lấy được thì nhập tay.
    try { const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(k.link)}&format=json`); if (!r.ok) throw 0;
      const j = await r.json(); const t = f.querySelector("#tvs-ten"); if (j.title && !t.value) t.value = String(j.title).slice(0, 150); say("Đã lấy tiêu đề ✓ (thời lượng nhập tay nếu cần)"); }
    catch (e) { say("Không lấy được thông tin tự động (video riêng tư hoặc mạng chặn). Nhập tiêu đề tay nhé.", true); }
    finally { lay.disabled = false; }
  };
  f.querySelectorAll("[data-tvs]").forEach(b => b.onclick = e => {
    const k = b.dataset.tvs; if (k === "gui") return; e.preventDefault();
    if (k === "huy") { v.soan = null; return ve(loai); }
    const s = docSoan(loai); if (s.loi) return say(s.loi, true);
    if (k === "xt") return xemTruocKhung(f.querySelector("#tvs-xt"), loai, s);
    luuSoan(loai, s, false, b);
  });
  f.onsubmit = e => { e.preventDefault(); const s = docSoan(loai); if (s.loi) return say(s.loi, true); luuSoan(loai, s, true, f.querySelector('[data-tvs="gui"]')); };
}
const xemTruocKhung = (el, loai, s) => { el.innerHTML = s.nhung ? `<div class="tv-khung tv-khung-${loai}"><iframe src="${esc(s.nhung)}" title="Xem trước" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
  <p class="muted">${loai === "ebook" ? "Nếu khung báo lỗi quyền truy cập: trong Canva bật Chia sẻ → “Bất kỳ ai có liên kết” rồi lấy link xem." : "Video riêng tư / bị tắt nhúng sẽ báo lỗi trong khung — kiểm tra quyền chia sẻ trên YouTube."}</p>` : ""; };

async function luuSoan(loai, s, gui, nut) {
  const c = C(), v = V[loai], A = ai(loai), T = THU_VIEN[loai];
  const tr = trungLink(loai, s.nd.link, v.soan.id); if (tr) return c.toast(`Link trùng với “${tr.tieuDe}”. Mở tài liệu đó để sửa thay vì thêm mới.`, "err");
  if (nut.disabled) return; nut.disabled = true;
  const { db, fs: { collection, doc, runTransaction } } = c, col = THU_VIEN[loai].col;
  try {
    await runTransaction(db, async tx => {
      if (v.soan.id) {
        const ref = doc(db, col, v.soan.id), snap = await tx.get(ref); if (!snap.exists()) throw { tv: "Tài liệu không còn." };
        const d = { id: snap.id, ...snap.data() };
        if ((d.v || 0) !== v.soan.baseVersion) throw {tv:'Tài liệu vừa được người khác cập nhật. Đóng khung và mở lại trước khi lưu.'};
        if (!coQuyen(A,'sua',d) && !(d.nguoiTao === A.mail && coQuyen(A,'them',d))) throw {tv:'Không đủ quyền chỉnh sửa.'};
        if (s.nd.link !== (d.banSua || d).link && A.p && !coQuyen(A,'nguon',d) && !(d.phienDuyet === 0 && d.nguoiTao === A.mail && coQuyen(A,'them',d))) throw {tv:'Cần quyền Thay link nguồn.'};
        const moi = { ...luuNoiDung(A, d, s.nd, gui), capNhat: Date.now(), v: (d.v || 0) + 1 };
        tx.update(ref, moi); ghiLS(tx, c, loai, ref.id, gui ? "gui" : "luunhap", d, { ...d, ...moi });
      } else {
        if (!coQuyen(A,'them',s.nd)) throw {tv:'Không đủ quyền tạo trong danh mục và cơ sở này.'};
        const ref = doc(collection(db, col)), moi = taiLieuMoi(A, loai, s.nd, gui);
        tx.set(ref, moi); ghiLS(tx, c, loai, ref.id, gui ? "gui" : "tao", null, moi);
      }
    });
    v.soan = null; c.toast(gui ? `Đã gửi duyệt. Quản lý duyệt xong ${T.tenNho} mới hiện cho học viên.` : "Đã lưu bản nháp."); ve(loai);
  } catch (e) { c.toast(e.tv || "Chưa lưu được (mạng hoặc không đủ quyền). Nội dung đang gõ vẫn còn.", "err"); }
  finally { nut.disabled = false; }
}
function banCongBo(d) {
  const fields=[...NOI_DUNG,'thuTu','hienThi','phienDuyet','phamViKieu','phamViKhoa','phamViMail','lichXuatBan'];
  return Object.fromEntries(fields.map(k => [k,d[k] ?? (k === 'coSo' ? 'chung' : k === 'lichXuatBan' ? 0 : '')]));
}
function ghiLS(tx, c, loai, ma, hanhDong, truoc, sau, lyDo = "") {
  const { db, fs: { collection, doc } } = c;
  tx.set(doc(collection(db, "tv_lichsu")), { thuVien: loai, ma, hanhDong, tu: truoc ? { duyet: truoc.duyet, hienThi: truoc.hienThi } : null,
    den: { duyet: sau.duyet, hienThi: sau.hienThi }, tieuDe: String((sau.banSua || {}).tieuDe || sau.tieuDe || "").slice(0, 150), lyDo: String(lyDo || "").slice(0, 500), ai: c.mail, luc: Date.now() });
}

function ganDS(loai) {
  const box = document.getElementById("tv-ds-ql-" + loai); if (!box) return;
  box.querySelectorAll("[data-tv-tt]").forEach(b => b.onclick = () => hanhDong(loai, b.dataset.tvTt, b.dataset.id, b));
  // Nhớ menu "⋯" đang mở: dữ liệu mới về vẽ lại danh sách không làm menu tự đóng giữa lúc đang bấm
  box.querySelectorAll("[data-them]").forEach(x => x.ontoggle = () => { const v = V[loai]; if (x.open) v.moThem = x.dataset.them; else if (v.moThem === x.dataset.them) v.moThem = ""; });
}
function hanhDong(loai, k, id, nut) {
  const c = C(), d = D[loai].ds.get(id), v = V[loai], A = ai(loai), T = THU_VIEN[loai]; if (!d) return;
  if (k === "xem") return xemTruoc(loai, d);
  if (k === "sua") { v.soan = { id,baseVersion:d.v || 0 }; ve(loai); requestAnimationFrame(() => C().cuonToi?.(document.getElementById("tv-soan-" + loai))); return; }
  if (k === "len" || k === "xuong") return sapXep(loai, d, k === "len" ? -1 : 1, nut);
  const tt = thaoTac(A, d).find(x => x.k === k); if (!tt) return c.toast("Thao tác không còn hợp lệ.", "err");
  if (k === "phamvi") return moPhamVi(loai, d);
  if (k === "lich") return moLich(loai, d);
  if (tt.lyDo || tt.xacNhan) {
    const h = c.moHop(`<h3>${esc(tt.nhan)}: “${esc(d.tieuDe)}”</h3>
      ${tt.lyDo ? `<label>Lý do (giáo viên sẽ thấy)<textarea id="tv-lydo" maxlength="500" required></textarea></label>` : `<p class="muted">${{ an: `Học viên sẽ không thấy ${T.tenNho} này nữa cho tới khi khôi phục.`, luutru: "Ngừng sử dụng: ẩn khỏi học viên, chuyển vào Lưu trữ.", xoa: "Xoá vĩnh viễn, không khôi phục được. Tiến độ học viên với tài liệu này không còn ý nghĩa.", thuhoi: "Bỏ trạng thái đã duyệt, đưa về Chờ duyệt.", tuchoi: "" }[k] || ""}</p>`}
      <p class="status" id="tv-hop-tt" role="status"></p>
      <div class="hop-nut"><button type="button" class="btn" data-dong>Huỷ</button><button type="button" class="btn primary" id="tv-hop-ok">${esc(tt.nhan)}</button></div>`, tt.nhan);
    const ok = h.el.querySelector("#tv-hop-ok");
    ok.onclick = async () => { const lyDo = (h.el.querySelector("#tv-lydo") || {}).value || "";
      if (tt.lyDo && !lyDo.trim()) { const s = h.el.querySelector("#tv-hop-tt"); s.textContent = "Cần nhập lý do."; s.classList.add("err"); return; }
      if (await doiTrangThai(loai, d, k, { lyDo }, ok)) h.dong(); };
    return;
  }
  doiTrangThai(loai, d, k, {}, nut);
}
// Đổi trạng thái trong một giao dịch: đọc lại bản mới nhất, so mã phiên bản v với bản đang thấy.
// Hai quản lý cùng bấm: người sau nhận thông báo "vừa được xử lý", không ghi đè.
async function doiTrangThai(loai, d, k, them, nut) {
  const c = C(), A = ai(loai); if (nut && nut.disabled) return false; if (nut) nut.disabled = true;
  const { db, fs: { doc, runTransaction, deleteDoc } } = c, ref = doc(db, THU_VIEN[loai].col, d.id);
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref); if (!snap.exists()) throw { tv: "Tài liệu không còn." };
      const moiNhat = { id: snap.id, ...snap.data() };
      if ((moiNhat.v || 0) !== (d.v || 0)) throw { tv: "Tài liệu vừa được người khác xử lý. Danh sách đã cập nhật, kiểm tra lại rồi thao tác." };
      if (k === "xoa") { if (moiNhat.hienThi !== "luutru") throw { tv: "Chỉ xoá được tài liệu đã lưu trữ." }; tx.delete(ref); ghiLS(tx, c, loai, d.id, "xoa", moiNhat, { duyet: "", hienThi: "daxoa", tieuDe: moiNhat.tieuDe }); return; }
      const moi = chuyen(A, moiNhat, k, them); if (moi.loi) throw { tv: moi.loi };
      Object.assign(moi, { capNhat: Date.now(), v: (moiNhat.v || 0) + 1 });
      const sau = {...moiNhat,...moi};
      if (['xuatban','lich','khoiphuc','an','luutru','thuhoi','phamvi'].includes(k)) {
        const pubRef=doc(db,THU_VIEN[loai].col+'_public',d.id);
        if (['xuatban','lich'].includes(k) || k === 'khoiphuc' && moiNhat.hienThi === 'an') tx.set(pubRef,banCongBo(sau));
        else if (k === 'phamvi' && sau.hienThi === 'xuatban') tx.update(pubRef,{phamViKieu:sau.phamViKieu,phamViKhoa:sau.phamViKhoa,phamViMail:sau.phamViMail});
        else if (['an','luutru','thuhoi'].includes(k)) tx.delete(pubRef);
      }
      tx.update(ref, moi); ghiLS(tx, c, loai, d.id, k, moiNhat, sau, them.lyDo);
    });
    c.toast({ duyet: "Đã duyệt ✓", xuatban: "Đã xuất bản ✓", an: "Đã ẩn.", khoiphuc: "Đã khôi phục ✓", luutru: "Đã lưu trữ.", xoa: "Đã xoá.", gui: "Đã gửi duyệt ✓", tuchoi: "Đã từ chối, giáo viên sẽ thấy lý do.", yeucausua: "Đã yêu cầu chỉnh sửa.", thuhoi: "Đã thu hồi phê duyệt.", phamvi: "Đã lưu phạm vi xem ✓", lich: "Đã lên lịch xuất bản ✓" }[k] || "Đã lưu ✓");
    return true;
  } catch (e) { c.toast(e.tv || "Chưa thực hiện được (mạng hoặc không đủ quyền).", "err"); return false; }
  finally { if (nut) nut.disabled = false; }
}
function xemTruoc(loai, d) {
  const nd = d.banSua ? { ...d, ...d.banSua } : d, T = THU_VIEN[loai], nhung = nhungCua(loai, nd);
  C().moHop(`<h3>${esc(nd.tieuDe)}</h3>${d.banSua ? `<p class="chip warn">Bản sửa đang chờ — học viên vẫn thấy bản cũ “${esc(d.tieuDe)}”</p>` : ""}
    ${nhung ? `<div class="tv-khung tv-khung-${loai}"><iframe src="${esc(nhung)}" title="Xem trước" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ""}
    <p class="muted">${esc(nd.moTa || "")}</p><p><a href="${esc(nd.link)}" target="_blank" rel="noopener">Mở trên ${T.nen} ↗</a></p>
    <div class="hop-nut"><button type="button" class="btn" data-dong>Đóng</button></div>`, "Xem trước");
}
function moPhamVi(loai, d) {
  const c = C();
  const h = c.moHop(`<h3>Ai được xem “${esc(d.tieuDe)}”?</h3>
    <label>Phạm vi<select id="tv-pv">${Object.entries(PHAM_VI).map(([k, t]) => `<option value="${k}"${d.phamViKieu === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <fieldset id="tv-pv-khoa" class="khoa-cap"><legend>Khoá học</legend>${KHOA.map(k => `<label><input type="checkbox" value="${esc(k)}"${(d.phamViKhoa || []).includes(k) ? " checked" : ""}><span>${esc(k)}</span></label>`).join("")}</fieldset>
    <label id="tv-pv-mail">Gmail được xem (mỗi dòng một Gmail)<textarea id="tv-pv-ds">${esc((d.phamViMail || []).join("\n"))}</textarea></label>
    <p class="muted">Quyền xem trên web không thay quyền chia sẻ trên YouTube/Canva: video/ebook phải được chia sẻ bằng link ở nền tảng gốc thì học viên mới mở được.</p>
    <p class="status" id="tv-pv-tt" role="status"></p>
    <div class="hop-nut"><button type="button" class="btn" data-dong>Huỷ</button><button type="button" class="btn primary" id="tv-pv-ok">Lưu phạm vi</button></div>`, "Phạm vi xem");
  const sel = h.el.querySelector("#tv-pv"), hien = () => { h.el.querySelector("#tv-pv-khoa").hidden = sel.value !== "khoa"; h.el.querySelector("#tv-pv-mail").hidden = sel.value !== "taikhoan"; };
  sel.onchange = hien; hien();
  const ok = h.el.querySelector("#tv-pv-ok");
  ok.onclick = async () => {
    const them = { kieu: sel.value, khoa: [...h.el.querySelectorAll("#tv-pv-khoa input:checked")].map(x => x.value), mail: h.el.querySelector("#tv-pv-ds").value.split(/[\s,;]+/) };
    const kq = chuyen(ai(loai), d, "phamvi", them); if (kq.loi) { const s = h.el.querySelector("#tv-pv-tt"); s.textContent = kq.loi; s.classList.add("err"); return; }
    if (await doiTrangThai(loai, d, "phamvi", them, ok)) h.dong();
  };
}
function moLich(loai, d) {
  const c = C();
  const h = c.moHop(`<h3>Lên lịch xuất bản “${esc(d.tieuDe)}”</h3><label>Thời điểm<input type="datetime-local" id="tv-lich"></label>
    <p class="muted">Tới giờ đã hẹn, ${THU_VIEN[loai].tenNho} tự hiện cho học viên trong phạm vi xem.</p><p class="status" id="tv-lich-tt" role="status"></p>
    <div class="hop-nut"><button type="button" class="btn" data-dong>Huỷ</button><button type="button" class="btn primary" id="tv-lich-ok">Lên lịch</button></div>`, "Lên lịch xuất bản");
  const ok = h.el.querySelector("#tv-lich-ok");
  ok.onclick = async () => { const t = Date.parse(h.el.querySelector("#tv-lich").value || "");
    if (!(t > Date.now())) { const s = h.el.querySelector("#tv-lich-tt"); s.textContent = "Chọn thời điểm trong tương lai."; s.classList.add("err"); return; }
    if (await doiTrangThai(loai, d, "lich", { lichXuatBan: t }, ok)) h.dong(); };
}
async function sapXep(loai, d, huong, nut) {
  const c = C(), ds = tatCa(loai).sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0)), i = ds.findIndex(x => x.id === d.id), b = ds[i + huong]; if (!b) return;
  const { db, fs: { doc, writeBatch } } = c, col = THU_VIEN[loai].col, w = writeBatch(db);
  const ta = a => a.thuTu || 0, x = ta(d) === ta(b) ? ta(d) + huong : ta(b), y = ta(d);
  w.update(doc(db, col, d.id), { thuTu: x, v: (d.v || 0) + 1, capNhat: Date.now() }); w.update(doc(db, col, b.id), { thuTu: y, v: (b.v || 0) + 1, capNhat: Date.now() });
  nut.disabled = true; try { await w.commit(); } catch (e) { c.toast("Chưa sắp xếp được.", "err"); } finally { nut.disabled = false; }
}
async function napMau(nut) {
  const c = C(), { db, fs: { doc, writeBatch, setDoc } } = c; nut.disabled = true;
  try {
    const w = writeBatch(db), luc = Date.now();
    VIDEO_MAU.forEach(([link, tieuDe], i) => { const id = ytId(link); if (D.video.ds.has(MAU_ID(id))) return;
      w.set(doc(db, "tv_video", MAU_ID(id)), { ...taiLieuMoi(ai("video"), "video", { tieuDe, moTa: MO_TA_MAU, danhMuc: DANH_MUC_MAU, link, ytId: id, anh: ytAnh(id) }, false, luc),
        thuTu: i, duyet: 'daduyet', hienThi: 'xuatban', phienDuyet: 1, xbPhien:1, xuLyBoi: c.mail, xuLyLuc: luc });
      w.set(doc(db,'tv_video_public',MAU_ID(id)),banCongBo({...taiLieuMoi(ai('video'),'video',{tieuDe,moTa:MO_TA_MAU,danhMuc:DANH_MUC_MAU,link,ytId:id,anh:ytAnh(id)},false,luc),coSo:'chung',thuTu:i,hienThi:'xuatban',phienDuyet:1})); });
    w.set(doc(db, "tv_meta", "video"), { daNapMau: true, danhMuc: [...new Set([DANH_MUC_MAU, ...((D.video.meta || {}).danhMuc || [])])] }, { merge: true });
    await w.commit(); c.toast("Đã nạp 17 video vào danh mục Hình họa chân dung ✓");
  } catch (e) { c.toast("Chưa nạp được (cần đưa luật bảo mật mới lên Firebase).", "err"); } finally { nut.disabled = false; }
}

/* ---------------- Danh mục · quyền giáo viên · lịch sử ---------------- */
function veDanhMuc(loai) {
  const ds = (D[loai].meta || {}).danhMuc || [];
  return `<details class="card tv-phu"><summary><b>Danh mục ${THU_VIEN[loai].tenNho}</b> <small class="muted">· ${ds.length} danh mục, thứ tự hiển thị</small></summary>
    <label>Mỗi dòng một danh mục, dòng trên hiện trước<textarea id="tv-dm-${loai}" rows="5">${esc(ds.join("\n"))}</textarea></label>
    <button type="button" class="btn small primary" id="tv-dm-luu-${loai}">Lưu danh mục</button></details>`;
}
function ganDanhMuc(loai) {
  const b = document.getElementById("tv-dm-luu-" + loai); if (!b) return;
  b.onclick = async () => { const c = C(), { db, fs: { doc, setDoc } } = c;
    const ds = [...new Set(document.getElementById("tv-dm-" + loai).value.split("\n").map(x => x.trim().slice(0, 80)).filter(Boolean))].slice(0, 60);
    b.disabled = true; try { await setDoc(doc(db, "tv_meta", loai), { danhMuc: ds }, { merge: true }); c.toast("Đã lưu danh mục ✓"); } catch (e) { c.toast("Chưa lưu được danh mục.", "err"); } finally { b.disabled = false; } };
}
function veQuyenGV(loai) {
  const gv = (C().giaoVien || []).filter(g => g && g.id);
  return `<details class="card tv-phu"><summary><b>Quyền giáo viên với ${THU_VIEN[loai].ten}</b> <small class="muted">· độc lập với ${loai === "video" ? "Ebook" : "Video"}</small></summary>
    ${gv.length ? `<div class="roster-wrap"><table class="roster tv-quyen"><thead><tr><th>Giáo viên</th>${QUYEN_GV.map(([, t]) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${gv.map(g => {
      const q = ((g.quyenTV || {})[loai]) || {};
      return `<tr><td class="hv-o"><b>${esc(g.ten || g.id)}</b><small>${esc(g.chucVu || "")}</small></td>${QUYEN_GV.map(([k, t]) => `<td data-l="${t}"><input type="checkbox" data-tvq="${esc(g.id)}" data-k="${k}" aria-label="${esc(t)} — ${esc(g.ten || g.id)}"${q[k] ? " checked" : ""}></td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`
      : `<p class="muted">Chưa có giáo viên nào.</p>`}<p class="muted">Không ai được tự duyệt tài liệu của mình hay tự cấp quyền; chỉ quản lý duyệt và cấp quyền.</p></details>`;
}
function ganQuyenGV(loai) {
  document.querySelectorAll(`#tv-${loai} [data-tvq]`).forEach(o => o.onchange = async () => {
    const c = C(), { db, fs: { doc, setDoc } } = c; o.disabled = true;
    try { await setDoc(doc(db, "giaovien", o.dataset.tvq), { quyenTV: { [loai]: { [o.dataset.k]: o.checked } } }, { merge: true }); c.toast("Đã cập nhật quyền ✓"); }
    catch (e) { o.checked = !o.checked; c.toast("Chưa đổi được quyền.", "err"); } finally { o.disabled = false; }
  });
}
function veLichSu(loai) {
  const ls = D[loai].ls, TEN = { tao: "Tạo", luunhap: "Lưu nháp", gui: "Gửi duyệt", duyet: "Duyệt", yeucausua: "Yêu cầu sửa", tuchoi: "Từ chối", xuatban: "Xuất bản", lich: "Lên lịch", thuhoi: "Thu hồi duyệt", an: "Ẩn", khoiphuc: "Khôi phục", luutru: "Lưu trữ", xoa: "Xoá", phamvi: "Đổi phạm vi" };
  return `<details class="card tv-phu"><summary><b>Lịch sử thao tác</b> <small class="muted">· ${ls.length} gần nhất</small></summary>
    ${ls.length ? `<ul class="tv-ls">${ls.map(x => `<li><span class="num muted">${ngayGio(x.luc)}</span> <b>${esc(TEN[x.hanhDong] || x.hanhDong)}</b> “${esc(x.tieuDe)}” · ${esc(x.ai)}${x.lyDo ? ` · <i>${esc(x.lyDo)}</i>` : ""}</li>`).join("")}</ul>` : `<p class="muted">Chưa có thao tác nào.</p>`}</details>`;
}

/* ---------------- Nhắc việc (chuông) ---------------- */
export function veLai() { LOAI.forEach(veNeuDangMo); }
export function nhacViec() {
  const c = C(), ds = []; if (!c.isTeacher) return ds;
  LOAI.forEach(loai => {
    const T = THU_VIEN[loai], all = tatCa(loai);
    if (c.isAdmin) {
      const cho = all.filter(d => d.duyet === "cho").sort((a, b) => (b.guiLuc || 0) - (a.guiLuc || 0));
      cho.slice(0, 3).forEach(d => ds.push({ id: `tv-cho-${d.id}-${d.v}`, icon: T.icon, muc: "gap", tieuDe: `${T.ten} chờ duyệt: ${(d.banSua || d).tieuDe}`,
        nd: `${d.tenNguoiTao || d.nguoiTao} gửi ${ngayGio(d.guiLuc)}`, link: "#" + loai, mo: "__tvMo", moArg: [loai, d.id], dich: `[data-tv-id="${CSS.escape(d.id)}"]` }));
      if (cho.length > 3) ds.push({ id: `tv-cho-${loai}-${cho.length}`, icon: T.icon, muc: "", tieuDe: `Còn ${cho.length - 3} ${T.tenNho} chờ duyệt khác`, link: "#" + loai, mo: "__tvMo", moArg: [loai, ""], dich: `#tv-ql-${loai}` });
    } else {
      const ba = Date.now() - 3 * 864e5;
      all.filter(d => d.nguoiTao === c.mail && (["sua", "tuchoi"].includes(d.duyet) || (d.duyet === "daduyet" && d.xuLyLuc > ba))).forEach(d => ds.push({
        id: `tv-kq-${d.id}-${d.v}`, icon: T.icon, muc: d.duyet === "daduyet" ? "" : "gap",
        tieuDe: `${T.ten} “${(d.banSua || d).tieuDe}”: ${DUYET[d.duyet]}`, nd: d.lyDo ? "Lý do: " + d.lyDo : "Quản lý đã duyệt.", link: "#" + loai, mo: "__tvMo", moArg: [loai, d.id], dich: `[data-tv-id="${CSS.escape(d.id)}"]` }));
    }
  });
  return ds;
}
export { NOI_DUNG };
