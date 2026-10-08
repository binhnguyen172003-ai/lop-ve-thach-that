// =====================================================================
//  LOGIC CỦA WEB — thường không cần sửa file này.
//  Nội dung (liên hệ, lịch thi, thời gian biểu, ảnh) nằm ở data/noi-dung.js
// =====================================================================
import { firebaseConfig, ADMIN_EMAIL, EMAIL_NHAN_THONG_BAO } from "../../config/firebase-config.js?v=20261009b";
import { FILE_LIMITS, FILE_TYPES, fileExt, fileSize, validateFiles, attachmentStorage, uploadError, validAttachmentPath } from "./attachments.js?v=20261009b";
import { LIEN_HE, NAM_THI, LICH_THI, BO_LOC_TRUONG, CA_HOC, THOI_GIAN_BIEU, BAI_VE, BANG_VANG, TRUONG, MUC_TIEU, GIAO_VIEN, VIDEO_BIA, BAI_NOI_BAT } from "../../data/noi-dung.js?v=20261009d";

// Firebase được tải riêng, để phần giới thiệu vẫn chạy kể cả khi mạng chậm hoặc chưa cấu hình.
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
let initializeApp, getAuth, onAuthStateChanged, signOut;
let createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile;
let getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, where;
async function loadFirebase() {
  const [a, au, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  ({ initializeApp } = a);
  ({ getAuth, onAuthStateChanged, signOut,
     createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } = au);
  ({ getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, where } = fs);
}

const $ = s => document.querySelector(s);
window.__appOk = true;
document.querySelectorAll(".slow-bar").forEach(el => el.remove());

/* ---------- Thông báo nhỏ ở cuối màn hình: luôn cho người dùng biết đã lưu hay chưa ---------- */
function toast(text, kind = "") {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.onclick = () => t.hidden = true;
  t.textContent = text; t.className = kind; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, kind === "err" ? 6000 : 2800);
}
/* ---------- Mất mạng: báo rõ, không để người dùng tưởng web hỏng ---------- */
function netBar() {
  let b = document.getElementById("net-bar");
  if (!b) { b = document.createElement("div"); b.id = "net-bar"; b.setAttribute("role", "status"); document.body.prepend(b); }
  b.textContent = "Đang mất mạng. Em vẫn xem được những gì đã mở; việc em vừa làm sẽ tự lưu khi có mạng lại (đừng đóng trang).";
  b.hidden = navigator.onLine;
}
addEventListener("offline", netBar);
addEventListener("online", () => { netBar(); toast("Đã có mạng lại."); });
if (!navigator.onLine) netBar();
/* ---------- Lỗi bất ngờ: báo và cho tải lại, không để trang "đứng hình" ---------- */
addEventListener("error", e => {
  if (!e.filename || !e.filename.includes(location.host)) return;
  toast("Có lỗi nhỏ trên trang. Chạm vào đây để tải lại.", "err");
  $("#toast").onclick = () => location.reload();
});
/* ---------- Mở tức thì ở lần sau + dùng được khi mạng yếu ---------- */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !/[?&]khongcache/.test(location.search))
  addEventListener("load", () => navigator.serviceWorker.register("sw.js?v=20261009b").catch(() => {}));

/* ---------- Đo tốc độ: mở web kèm ?chandoan=1 để xem từng bước mất bao lâu ---------- */
const DIAG = /[?&]chandoan/.test(location.search);
const T0 = performance.now();
const diagLines = [];
function mark(label, since = T0) {
  if (!DIAG) return;
  const ms = Math.round(performance.now() - since);
  diagLines.push(`${label}: ${ms >= 1000 ? (ms / 1000).toFixed(1) + " giây" : ms + " ms"}`);
  let box = document.getElementById("diag");
  if (!box) {
    box = document.createElement("pre"); box.id = "diag";
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99;max-height:45vh;overflow:auto;margin:0;padding:10px 12px;background:#111;color:#9f9;font:12px/1.5 monospace;border-radius:8px;white-space:pre-wrap";
    document.body.appendChild(box);
  }
  box.textContent = "ĐO TỐC ĐỘ (chụp màn hình gửi Claude)\n" + navigator.userAgent.slice(0, 90) + "\n" + diagLines.join("\n");
}
/* ---------- Báo lỗi máy chủ rõ ràng, không để người dùng "đứng hình" ---------- */
function serverIssue(e) {
  const code = (e && e.code) || "";
  const msg = String((e && e.message) || "");
  let text;
  if (/does not exist|not-found/i.test(code + " " + msg) && /database/i.test(msg))
    text = "Máy chủ dữ liệu chưa được tạo. Thầy vào Firebase → Firestore Database → bấm Tạo cơ sở dữ liệu.";
  else if (code === "permission-denied")
    text = isAdmin ? "Máy chủ từ chối: luật bảo mật chưa đúng. Thầy vào Firebase → Firestore → Quy tắc, dán lại luật mới rồi bấm Xuất bản."
                   : "Tài khoản này chưa có quyền làm việc đó. Nếu em đã được thầy duyệt, hãy tải lại trang.";
  else if (code === "unavailable" || /offline|network/i.test(code + msg))
    text = "Mạng đang chập chờn nên chưa lưu được. Kiểm tra wifi/4G rồi thử lại.";
  else if (code === "failed-precondition")
    text = "Máy chủ chưa sẵn sàng. Thầy kiểm tra Firestore Database đã được tạo chưa.";
  else text = "Có lỗi khi kết nối máy chủ" + (code ? " (mã: " + code + ")" : "") + ". Tải lại trang rồi thử lại.";
  let bar = document.getElementById("server-issue");
  if (!bar) {
    bar = document.createElement("div"); bar.id = "server-issue"; bar.setAttribute("role", "alert");
    bar.innerHTML = `<span></span><button type="button" aria-label="Đóng">✕</button>`;
    bar.querySelector("button").onclick = () => bar.hidden = true;
    document.body.prepend(bar);
  }
  bar.querySelector("span").textContent = text; bar.hidden = false;
  mark("✗ " + text);
}
// Đo thời gian chờ máy chủ của mọi thao tác ghi
const timed = (label, p) => { const t = performance.now(); Promise.resolve(p).then(() => mark("✓ " + label, t), e => { mark("✗ LỖI " + label, t); serverIssue(e); }); return p; };
addEventListener("load", () => mark("Trang tải xong"));
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
/* ---------- Tự lưu nháp biểu mẫu: lỡ tắt trang, mất mạng hay chuyển ứng dụng cũng không mất chữ đã gõ ---------- */
const formFields = form => Array.from(form.querySelectorAll("input[id], select[id], textarea[id]")).filter(i => i.type !== "checkbox" && i.type !== "hidden" && i.type !== "file");
const formValues = form => Object.fromEntries(formFields(form).map(i => [i.id, i.value]));
function fillForm(form, vals) {
  if (!vals) return;
  formFields(form).forEach(i => { if (vals[i.id] != null && vals[i.id] !== "") i.value = vals[i.id]; });
}
function keepDraft(form, keyFn) {
  let h;
  form.addEventListener("input", () => {
    clearTimeout(h);
    h = setTimeout(() => { const k = keyFn(); if (k) store.set(k, formValues(form)); }, 300);
  });
}
const dropDraft = k => { try { localStorage.removeItem(k); } catch (e) {} };
function copyText(text, statusEl, okMsg, selectEl) {
  const fallback = () => {
    const r = document.createRange(); r.selectNodeContents(selectEl);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    statusEl.textContent = "Đã chọn sẵn chữ, bấm giữ để sao chép.";
  };
  try { navigator.clipboard.writeText(text).then(() => statusEl.textContent = okMsg, fallback); } catch (e) { fallback(); }
}

/* ================= Điều hướng ================= */
const PAGES = ["giao-trinh", "bai-tap", "tai-khoan", "duyet", "diem-danh", "lam-viec"];
function route() {
  const h = location.hash.replace("#", "");
  const page = PAGES.includes(h) ? h : "home";
  $("#v-home").hidden = page !== "home";
  PAGES.forEach(p => $("#v-" + p).hidden = page !== p);
  $$("nav a.link").forEach(a => {
    const on = page === "home" ? a.getAttribute("href") === "#" + (h || "gioi-thieu") : a.dataset.nav === page;
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  $("#acc-nav").dataset.page = page;
  $$("#acc-nav [data-acc]").forEach(a => { if (a.dataset.acc === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (page === "home") $("#nav-acct").removeAttribute("aria-current"); else $("#nav-acct").setAttribute("aria-current", "page");
  if (window.__lvReady) { renderAccNav(); if (page === "lam-viec") lvOnShow(); }
  if (page !== "home") window.scrollTo(0, 0);
  else if (h) { const el = document.getElementById(h); if (el) el.scrollIntoView(); }
}
addEventListener("hashchange", route);
route();

/* ================= Lịch thi 2027 ================= */
const MONTH = {};
[...new Set(LICH_THI.map(e => e.ngay.slice(5, 7)))].sort().forEach(m => MONTH[m] = "Tháng " + Number(m));
function daysUntil(iso) {
  const now = new Date();
  const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
  const today = Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate());
  const [y, m, d] = String(iso).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}
let examFilter = "all";
function renderExams() {
  const list = LICH_THI.map(e => ({ t: e.truong, truong: e.ten, dot: e.dot, ngay: e.ngay, hien: e.hienThi, n: daysUntil(e.ngay) }));
  const shown = list.filter(e => examFilter === "all" || e.t === examFilter || e.t === "THPT");
  const next = shown.filter(e => e.n >= 0 && e.t !== "THPT").sort((a, b) => a.n - b.n)[0];
  if (next) {
    const w = Math.floor(next.n / 7);
    $("#cd-lead").innerHTML =
      `<div class="cd-big">${next.n}<small>ngày</small></div>
       <div><p class="eyebrow">${examFilter === "all" ? "Kỳ thi năng khiếu gần nhất" : "Kỳ thi gần nhất của trường này"}</p>
       <h3>${esc(next.truong)} <span class="chip">${esc(next.dot)}</span></h3>
       <p class="muted">Ngày thi dự kiến ${esc(next.hien)}/${NAM_THI}</p>
       <p style="margin-top:8px">Còn khoảng <b class="num">${w}</b> tuần. Nếu học 4 buổi mỗi tuần, em còn khoảng <b class="num">${w * 4}</b> buổi để luyện.</p></div>`;
  } else {
    $("#cd-lead").innerHTML = `<p>Mùa thi này đã kết thúc. Lớp sẽ cập nhật lịch năm sau.</p>`;
  }
  // Điện thoại: chỉ hiện 3 kỳ thi gần nhất, bấm để xem cả lịch
  const gan = new Set(shown.filter(e => e.n >= 0).sort((a, b) => a.n - b.n).slice(0, 3));
  // Sơ đồ cây: thân là dòng thời gian, mỗi tháng một mốc, mỗi ngày thi một nhánh, các trường là lá
  const MA = { XD: "HUCE", QG: "SIS", SP: "NUAE", MTCN: "MTCN", HAU: "HAU" };
  const mau = t => t === "THPT" ? "#8a919c" : (TRUONG[MA[t]] || {}).mau || "#5b6068";
  let side = 0;
  $("#months").className = "months tl" + ($("#months").classList.contains("gon") ? " gon" : "");
  $("#months").innerHTML = Object.keys(MONTH).map(m => {
    const evs = shown.filter(e => e.ngay.slice(5, 7) === m);
    if (!evs.length) return "";
    const ngays = [...new Set(evs.map(e => e.ngay))].sort();
    return `<div class="tl-m${evs.some(e => gan.has(e)) ? "" : " xa"}"><span>${MONTH[m]}</span></div>` + ngays.map(ng => {
      const g = evs.filter(e => e.ngay === ng), e0 = g[0], qua = e0.n < 0;
      return `<div class="tl-n ${side++ % 2 ? "R" : "L"}${qua ? " past" : ""}${g.some(e => gan.has(e)) ? "" : " xa"}">
        <i class="tl-dot" style="--c:${mau(e0.t)}"></i>
        <div class="tl-card">
          <div class="tl-d"><b class="num">${esc(e0.hien)}</b><span class="num">${qua ? "Đã thi" : "Còn " + e0.n + " ngày"}</span></div>
          <ul>${g.map(e => `<li style="--c:${mau(e.t)}"><i>${esc(e.t === "THPT" ? "THPT" : MA[e.t] || e.t)}</i><span>${esc(e.truong.replace("ĐHQG Hà Nội · Trường KH Liên ngành & Nghệ thuật", "ĐHQG HN · KH Liên ngành & Nghệ thuật"))}<em>${esc(e.dot)}</em></span></li>`).join("")}</ul>
        </div></div>`;
    }).join("");
  }).join("");
  const con = shown.length - gan.size;
  let more = $("#months-more");
  if (!more) { more = document.createElement("button"); more.type = "button"; more.id = "months-more"; more.className = "btn months-more"; $("#months").after(more);
    more.onclick = () => { $("#months").classList.toggle("gon"); renderExams(); }; }
  if (!$("#months").dataset.init) { $("#months").dataset.init = "1"; $("#months").classList.add("gon"); }
  more.hidden = con <= 0;
  more.textContent = $("#months").classList.contains("gon") ? `Xem cả lịch (${shown.length} kỳ thi) ▼` : "Thu gọn ▲";
}
$("#exam-filters").innerHTML = [{ truong: "all", ten: "Tất cả" }, ...BO_LOC_TRUONG]
  .map(f => `<button class="tab" data-f="${esc(f.truong)}" aria-selected="${f.truong === "all"}">${esc(f.ten)}</button>`).join("");
$$("#exam-filters .tab").forEach(b => b.onclick = () => {
  examFilter = b.dataset.f;
  $$("#exam-filters .tab").forEach(x => x.setAttribute("aria-selected", x === b));
  renderExams();
});
renderExams();
setInterval(renderExams, 3600000);

/* ================= Thời gian biểu ================= */
const SLOT = { "Hình hoạ": "hh", "Màu": "mau", "Mỹ thuật 2": "mt2" };
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const CO_SO = Object.keys(THOI_GIAN_BIEU);
$("#ca-hoc-text").textContent = CA_HOC.map(c => `Ca ${c.ten.toLowerCase()} ${c.gio}`).join(" · ") + ".";
const TEN_NGAY = { T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5", T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật" };
function todayKey() {
  const now = new Date(); const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
  return DAYS[(vn.getDay() + 6) % 7];
}
function renderSched(k) {
  const tkb = THOI_GIAN_BIEU[k] || {}; const today = todayKey();
  const chip = mon => `<span class="slot ${SLOT[mon] || "mt2"}">${esc(mon)}</span>`;
  $("#sched").innerHTML = `<thead><tr><th>Ca học</th>${DAYS.map(d => `<th class="${d === today ? "today" : ""}">${TEN_NGAY[d]}${d === today ? "<br><small>Hôm nay</small>" : ""}</th>`).join("")}</tr></thead>
    <tbody>${CA_HOC.map(c => `<tr><td><b>${esc(c.ten)}</b><br><span class="muted num">${esc(c.gio)}</span></td>${DAYS.map(d => {
      const mon = (tkb[c.ma] || {})[d]; return `<td class="${d === today ? "today" : ""}">${mon ? chip(mon) : ""}</td>`;
    }).join("")}</tr>`).join("")}</tbody>`;
  // Điện thoại: mỗi ngày một dòng, không phải kéo ngang
  $("#sched-days").innerHTML = DAYS.map(d => {
    const ca = CA_HOC.filter(c => (tkb[c.ma] || {})[d]);
    return `<div class="sd ${d === today ? "today" : ""} ${ca.length ? "" : "off"}"><b>${TEN_NGAY[d]}${d === today ? ' <span class="chip">Hôm nay</span>' : ""}</b>
      <div>${ca.length ? ca.map(c => `<span class="sd-ca">${chip(tkb[c.ma][d])} ${esc(c.ten)} <span class="muted num">${esc(c.gio)}</span></span>`).join("") : '<span class="muted">Nghỉ</span>'}</div></div>`;
  }).join("");
}
$("#sched-tabs").innerHTML = CO_SO.map((k, i) => `<button class="tab" role="tab" data-s="${esc(k)}" aria-selected="${i === 0}">${esc(k)}</button>`).join("");
$$("#sched-tabs .tab").forEach(b => b.onclick = () => {
  $$("#sched-tabs .tab").forEach(x => x.setAttribute("aria-selected", x === b));
  renderSched(b.dataset.s);
});
renderSched(CO_SO[0]);

/* ================= Liên hệ & mạng xã hội ================= */
$("#lien-he").innerHTML =
  `<div><dt>Quản lý lớp</dt><dd class="num">${esc(LIEN_HE.sdt)}</dd></div>
   <div><dt>Email</dt><dd>${esc(LIEN_HE.email)}</dd></div>
   ${LIEN_HE.coSo.map(c => `<div><dt>${esc(c.ten)}</dt><dd>${esc(c.diaChi)}</dd></div>`).join("")}
   <div><dt>Instagram</dt><dd><a href="${esc(LIEN_HE.instagram.link)}" target="_blank" rel="noopener">${esc(LIEN_HE.instagram.ten)}</a></dd></div>`;
$("#link-ig").href = LIEN_HE.instagram.link;
$("#ten-ig").textContent = LIEN_HE.instagram.ten;
$("#link-pin").href = LIEN_HE.pinterest.link;

/* ================= Bài vẽ học viên ================= */
const LOAI_BAI = [
  { ten: "Cơ bản", art: "v-khoi", moTa: "Khối cơ bản, tĩnh vật, sáng tối" },
  { ten: "Hình hoạ người", img: "assets/img/hinh-hoa-nguoi.png", moTa: "Chân dung, bán thân, toàn thân" },
  { ten: "Tượng", img: "assets/img/hinh-hoa-tuong.png", moTa: "Tượng thạch cao theo các góc thi" },
  { ten: "Màu", art: "v-mau", moTa: "Bố cục trang trí màu Khối H" },
  { ten: "Mỹ thuật 2", art: "v-mt2", moTa: "Bố cục tạo hình Khối V" },
];
let galFilter = "all", galList = [], galCur = 0;
const artCard = (l, note) => `<div class="gal-art">${l.img ? `<span class="art art-img" style="-webkit-mask-image:url(${l.img});mask-image:url(${l.img})" aria-hidden="true"></span>` : `<svg class="art" aria-hidden="true"><use href="#${l.art}"/></svg>`}
  <b>${esc(l.ten)}</b><span class="muted">${esc(l.moTa)}</span><span class="soon">${note}</span></div>`;
function renderGallery() {
  const has = BAI_VE.length > 0;
  const count = t => BAI_VE.filter(b => b.loai === t).length;
  $("#gal-filters").hidden = !has;
  if (has) $("#gal-filters").innerHTML = [`<button class="tab" data-g="all" aria-selected="${galFilter === "all"}">Tất cả <span class="num">${BAI_VE.length}</span></button>`]
    .concat(LOAI_BAI.map(l => `<button class="tab" data-g="${esc(l.ten)}" aria-selected="${galFilter === l.ten}">${esc(l.ten)} <span class="num">${count(l.ten)}</span></button>`)).join("");
  $$("#gal-filters .tab").forEach(b => b.onclick = () => { galFilter = b.dataset.g; renderGallery(); });
  if (!has) { $("#gallery").className = "gallery arts"; $("#gallery").innerHTML = LOAI_BAI.map(l => artCard(l, "Ảnh bài thật sắp cập nhật")).join(""); return; }
  galList = BAI_VE.filter(b => galFilter === "all" || b.loai === galFilter);
  if (!galList.length) { const l = LOAI_BAI.find(x => x.ten === galFilter); $("#gallery").className = "gallery arts"; $("#gallery").innerHTML = artCard(l, "Phần này chưa có ảnh"); return; }
  $("#gallery").className = "gallery";
  $("#gallery").innerHTML = galList.map((b, i) =>
    `<button type="button" aria-label="Xem lớn bài vẽ ${i + 1}"><img src="${esc(b.anh)}" alt="${esc(b.moTa || "Bài vẽ học viên")}" loading="lazy" decoding="async" width="300" height="400">
      <span class="cap">${esc(b.hocVien || b.loai || "")}</span></button>`).join("");
  const ds = galList;
  $$("#gallery button").forEach((b, i) => b.onclick = () => { galList = ds; showLb(i); });
}
function showLb(i) {
  galCur = (i + galList.length) % galList.length; const b = galList[galCur];
  $("#lb-img").src = b.anh; $("#lb-img").alt = b.moTa || "";
  $("#lb-cap").textContent = `${galCur + 1} / ${galList.length} · ${[b.hocVien, b.loai, b.moTa].filter(Boolean).join(" · ")}`;
  $("#lb").hidden = false;
}
$("#lb-prev").onclick = () => showLb(galCur - 1);
$("#lb-next").onclick = () => showLb(galCur + 1);
$("#lb-close").onclick = () => $("#lb").hidden = true;
$("#lb").addEventListener("click", e => { if (e.target === $("#lb")) $("#lb").hidden = true; });
document.addEventListener("keydown", e => {
  if ($("#lb").hidden) return;
  if (e.key === "Escape") $("#lb").hidden = true;
  if (e.key === "ArrowLeft") showLb(galCur - 1);
  if (e.key === "ArrowRight") showLb(galCur + 1);
});
renderGallery();

/* ================= Vòng xoay 3D dùng chung (Giáo viên, Khoá học) =================
   Thẻ giữa to nhất, hai bên xoay nghiêng và lùi ra sau, tự quay mỗi 3,5 giây.
   Dừng khi người xem chạm / để chuột / đang xem ảnh; vuốt hoặc bấm mũi tên để chuyển. */
function vongXoay(box, st, cards, dots, prev, next, onCenter) {
  const n = cards.length;
  let cur = 0, timer = 0, paused = false, inView = false;
  const draw = () => {
    const mob = innerWidth < 640;
    cards.forEach((c, i) => {
      let d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      const a = Math.abs(d);
      c.style.transform = `translateX(${d * (mob ? 62 : 72)}%) translateZ(${-a * (mob ? 140 : 180)}px) rotateY(${-d * 28}deg)`;
      c.style.opacity = a > 2 ? 0 : a === 2 ? .45 : a === 1 ? .85 : 1;
      c.style.zIndex = 10 - a; c.style.pointerEvents = a > 2 ? "none" : "";
      c.classList.toggle("on", d === 0); c.setAttribute("aria-hidden", a > 2);
    });
    dots.forEach((d, i) => d.setAttribute("aria-current", i === cur));
  };
  const go = i => { cur = (i + n) % n; draw(); };
  const tick = () => { clearTimeout(timer); if (!paused && inView && !document.hidden) timer = setTimeout(() => { go(cur + 1); tick(); }, 3500); };
  const pause = p => { paused = p; tick(); };
  prev.onclick = () => { go(cur - 1); tick(); };
  next.onclick = () => { go(cur + 1); tick(); };
  dots.forEach(d => d.onclick = () => { go(Number(d.dataset.i)); tick(); });
  cards.forEach((c, i) => c.addEventListener("click", () => {
    if (i !== cur) { go(i); tick(); return; }   // bấm thẻ bên cạnh: xoay tới thẻ đó
    if (onCenter) onCenter(c);
  }));
  let x0 = null, moved = false;
  st.addEventListener("pointerdown", e => { x0 = e.clientX; moved = false; pause(true); });
  st.addEventListener("pointermove", e => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) moved = true; });
  st.addEventListener("pointerup", e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); setTimeout(() => pause(false), 4000); });
  st.addEventListener("pointercancel", () => { x0 = null; pause(false); });
  st.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  // Thẻ bên cạnh nằm "lùi sâu" trong không gian 3D nên chuột hay trúng lớp nền → tự tìm thẻ dưới con trỏ
  const theDuoiChuot = (x, y) => cards.map((c, i) => ({ c, i, z: +c.style.zIndex || 0, r: c.getBoundingClientRect() }))
    .filter(o => o.c.style.pointerEvents !== "none" && x >= o.r.left && x <= o.r.right && y >= o.r.top && y <= o.r.bottom)
    .sort((a, b) => b.z - a.z)[0];
  st.addEventListener("click", e => {
    if (cards.some(c => c.contains(e.target))) return;
    const o = theDuoiChuot(e.clientX, e.clientY); if (o) o.c.click();
  });
  st.addEventListener("mousemove", e => { const o = theDuoiChuot(e.clientX, e.clientY); st.style.cursor = o && o.i !== cur ? "pointer" : ""; });
  st.addEventListener("dragstart", e => e.preventDefault());
  box.addEventListener("mouseenter", () => pause(true)); box.addEventListener("mouseleave", () => pause(false));
  box.addEventListener("focusin", () => pause(true)); box.addEventListener("focusout", () => pause(false));
  box.tabIndex = 0;
  box.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { go(cur + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(cur - 1); e.preventDefault(); }
    if (e.key === "Enter" && e.target === box) cards[cur].click();
  });
  document.addEventListener("visibilitychange", tick);
  addEventListener("resize", draw, { passive: true });
  new IntersectionObserver(es => { inView = es[0].isIntersecting; tick(); }, { threshold: .3 }).observe(box);
  draw();
  return { pause, go };
}

/* ================= Hạng học viên (F → SSS+): leo hạng nhờ đi học, làm bài, có bài nổi bật ================= */
const RANK = [
  { ma: "F", xp: 0, mau: "#9aa3ad", ten: "Mới bắt đầu", mo: "Vừa vào lớp, bắt đầu hành trình." },
  { ma: "E", xp: 100, mau: "#3fcf5b", ten: "Đang làm quen", mo: "Đã có bài đầu tiên được chọn hoặc đi học đều." },
  { ma: "C", xp: 250, mau: "#3ec6e0", ten: "Bắt nhịp", mo: "Tiềm năng bắt đầu lộ rõ." },
  { ma: "B", xp: 500, mau: "#3d6bff", ten: "Vững vàng", mo: "Nền tảng chắc, làm bài đầy đủ." },
  { ma: "A", xp: 800, mau: "#9b5cff", ten: "Giỏi", mo: "Trên mức trung bình của lớp." },
  { ma: "S", xp: 1200, mau: "#ffc400", ten: "Xuất sắc", mo: "Được cả lớp công nhận." },
  { ma: "SS", xp: 1700, mau: "#ff8a1f", ten: "Tinh hoa", mo: "Nhóm học viên giỏi nhất." },
  { ma: "SSS", xp: 2300, mau: "#ff3b3b", ten: "Huyền thoại", mo: "Rất ít người đạt được." },
  { ma: "SSS+", xp: 3000, mau: "rainbow", ten: "Đỉnh cao", mo: "Vượt mọi giới hạn." },
];
// Cách tính điểm kinh nghiệm (XP) — thầy sửa số ở đây nếu muốn
const XP = { buoi: 10, baiTap: 15, baiHoc: 5, diemGioi: 10, noiBat: 100, top1: 25 };
// Mùa xếp hạng bắt đầu: mọi học viên khởi đầu ở hạng F (1 sao), chỉ tính hoạt động SAU ngày này
const RANK_BAT_DAU = "2026-10-09";
function tinhRank(dd, prog, fb, ten) {
  const moc = new Date(RANK_BAT_DAU + "T23:59:59+07:00").getTime();
  const sau = v => typeof v === "number" && v > moc;
  const buoi = Object.entries(dd || {}).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}_/.test(k) && v === "co" && k.slice(0, 10) > RANK_BAT_DAU).length;
  const baiTap = Object.values((prog || {}).baitap || {}).filter(sau).length;
  const baiHoc = Object.values((prog || {}).bai || {}).filter(sau).length;
  const gioi = Object.values(fb || {}).filter(x => x && sau(x.luc) && soDiem(x.diem) !== null && soDiem(x.diem) >= 8).length;
  const bo = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const nb = ten ? BAI_NOI_BAT.filter(b => !b.tg && b.hocVien && b.ngay > RANK_BAT_DAU && bo(ten).endsWith(bo(b.hocVien))) : [];
  const top1 = nb.filter(b => b.hang === 1).length;
  const xp = buoi * XP.buoi + baiTap * XP.baiTap + baiHoc * XP.baiHoc + gioi * XP.diemGioi + nb.length * XP.noiBat + top1 * XP.top1;
  let i = 0; RANK.forEach((r, j) => { if (xp >= r.xp) i = j; });
  const r = RANK[i], next = RANK[i + 1] || null;
  const pct = next ? Math.round((xp - r.xp) / (next.xp - r.xp) * 100) : 100;
  return { xp, r, i, next, pct, buoi, baiTap, baiHoc, gioi, nb: nb.length, top1 };
}
const huyHieu = (r, i, cls = "") => `<span class="rk-badge ${cls}${r.mau === "rainbow" ? " rb" : ""}" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}" title="Hạng ${r.ma} · ${r.ten}">
  <svg viewBox="0 0 64 64" aria-hidden="true"><path class="w" d="M6 22c6 2 10 6 12 12-6-1-10-5-12-12zM58 22c-6 2-10 6-12 12 6-1 10-5 12-12z"/><path class="s" d="M32 6l20 9v16c0 13-9 22-20 27C21 53 12 44 12 31V15z"/></svg>
  <b>${r.ma}</b><i>${"★".repeat(i + 1)}</i></span>`;
function theRank(t) {
  return `<div class="rk-card" style="--rc:${t.r.mau === "rainbow" ? "#ffd6ff" : t.r.mau}">
    ${huyHieu(t.r, t.i, "lg")}
    <div class="rk-in"><p class="eyebrow">Hạng của em</p><h3>Hạng ${t.r.ma} <span>· ${t.r.ten}</span></h3>
      <div class="rk-bar"><i style="width:${t.pct}%"></i></div>
      <p class="rk-sub"><b class="num">${t.xp} XP</b>${t.next ? ` · còn <b class="num">${t.next.xp - t.xp} XP</b> nữa lên hạng ${t.next.ma}` : " · đã đạt hạng cao nhất!"}</p>
      <ul class="rk-chi"><li>${t.buoi} buổi đi học</li><li>${t.baiTap} bài tập đã nộp</li><li>${t.baiHoc} bài giáo trình</li><li>${t.gioi} bài điểm ≥ 8</li><li>${t.nb} bài nổi bật</li></ul>
      <details class="rk-cach"><summary>Cách leo hạng ▾</summary>
        <p>Mỗi buổi đi học +${XP.buoi} XP · nộp 1 bài tập +${XP.baiTap} · học xong 1 bài giáo trình +${XP.baiHoc} · bài được chấm từ 8 điểm +${XP.diemGioi} · có bài lên Top nổi bật +${XP.noiBat} (Top 1 thêm +${XP.top1}).</p>
        <div class="rk-list">${RANK.map((r, j) => `<span class="${j === t.i ? "on" : ""}">${huyHieu(r, j, "sm")}<small>${r.xp}+</small></span>`).join("")}</div>
      </details></div></div>`;
}

/* Bảng xếp hạng công khai trên trang chủ */
(function bangXepHang() {
  const bang = $("#xh-bang"); if (!bang) return;
  bang.innerHTML = `<div class="xh-row xh-th" role="row"><span>Hạng</span><span>Huy hiệu</span><span>Mô tả</span><span>Cần</span></div>` +
    RANK.map((r, i) => `<div class="xh-row" role="row" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}">
      <b class="xh-ma${r.mau === "rainbow" ? " rb" : ""}">${r.ma}<small> RANK</small></b>${huyHieu(r, i, "sm")}
      <span class="xh-mo"><b>${r.ten}</b><span>${r.mo}</span><i>${"★".repeat(i + 1)}</i></span><span class="xh-xp num">${r.xp} XP</span></div>`).join("");
  $("#xh-cach").innerHTML = `<h3>Cách kiếm XP</h3><ul>
    <li><b>+${XP.buoi}</b><span>Mỗi buổi đi học (thầy điểm danh có mặt)</span></li>
    <li><b>+${XP.baiTap}</b><span>Mỗi bài tập đã nộp</span></li>
    <li><b>+${XP.baiHoc}</b><span>Mỗi bài giáo trình học xong</span></li>
    <li><b>+${XP.diemGioi}</b><span>Mỗi bài được chấm từ 8 điểm</span></li>
    <li><b>+${XP.noiBat}</b><span>Có bài lên Bài vẽ nổi bật</span></li>
    <li><b>+${XP.top1}</b><span>Thêm nếu bài đạt Top 1</span></li></ul>
    <p class="muted">Mùa xếp hạng bắt đầu từ ${fmtDate(new Date(RANK_BAT_DAU + "T00:00"))}. Mọi học viên khởi đầu ở hạng F.</p>`;
  // Học viên có hạng nổi bật (từ Bài vẽ nổi bật)
  const ten = [...new Set(BAI_NOI_BAT.filter(b => !b.tg && b.hocVien).map(b => b.hocVien))];
  const ds = ten.map(t => ({ t, k: tinhRank(null, null, null, t) })).sort((a, b) => b.k.xp - a.k.xp);
  $("#xh-top").innerHTML = ds.length ? `<h3>Học viên đang leo hạng</h3><div class="xh-hv">${ds.map(({ t, k }) => `<div style="--rc:${k.r.mau === "rainbow" ? "#ffd6ff" : k.r.mau}">${huyHieu(k.r, k.i, "sm")}<b>${esc(t)}</b><span>Hạng ${k.r.ma} · ${k.xp} XP</span></div>`).join("")}</div>
    <p class="muted xh-note">Tính từ bài vẽ nổi bật. Hạng đầy đủ (gồm đi học, bài tập) xem trong Tài khoản của từng em.</p>` : "";
})();
/* ================= Bài vẽ nổi bật: tuần / tháng / năm, vòng xoay 3D ================= */
(function noiBat() {
  const box = $("#nb-ring"); if (!box) return;
  const TEN = { tuan: "tuần", thang: "tháng", nam: "năm" };
  const mau = GIAO_VIEN.filter(g => g.anh).map((g, i) => ({ anh: g.bai || "assets/img/giao-vien/" + g.anh + "-bai.jpg", hocVien: g.ten, loai: "Bài mẫu giáo viên", mau: true }));
  let ky = "tuan", vx = null;
  // Tự chuyển mục theo ngày chọn bài: 0–7 ngày = tuần, 8–30 = tháng, 31–365 = năm
  const KHOANG = { tuan: [0, 7], thang: [7, 30], nam: [30, 365] };
  const tuoi = b => b.ngay ? (Date.now() - new Date(b.ngay + "T00:00:00+07:00").getTime()) / 864e5 : null;
  const mucCua = b => { const t = tuoi(b); if (t === null) return b.ky || "tuan"; return Object.keys(KHOANG).find(k => t >= KHOANG[k][0] - 1 && t < KHOANG[k][1]) || ""; };
  const locNoiBat = k => BAI_NOI_BAT.filter(b => mucCua(b) === k)
    .sort((a, b) => (a.tg ? 1 : 0) - (b.tg ? 1 : 0) || (a.hang || 99) - (b.hang || 99) || (b.diem || 0) - (a.diem || 0) || (tuoi(a) || 0) - (tuoi(b) || 0));
  const ve = () => {
    let ds = locNoiBat(ky);
    const tam = !ds.length;
    if (tam) { box.innerHTML = `<p class="nb-rong">Chưa có bài nổi bật ${TEN[ky]}. Bài Top Tuần sẽ tự chuyển sang đây khi ${ky === "thang" ? "qua 1 tuần" : "qua 1 tháng"}.</p>`; return; }
    box.innerHTML = `<div class="gv-stage nb-stage">${ds.map((b, i) => `<figure class="nb-card" data-i="${i}">
        <img src="${esc(b.anh)}" alt="${esc((b.loai || "Bài vẽ") + " · " + (b.hocVien || ""))}" loading="lazy" decoding="async" draggable="false">
        ${b.hang && b.hang <= 3 ? `<span class="nb-medal h${Number(b.hang)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l1 5-3 1zM17 2h-4l-1 5 3 1z" class="rb"/><circle cx="12" cy="15" r="6.5" class="md"/><text x="12" y="18.2" text-anchor="middle">${Number(b.hang)}</text></svg><b>TOP ${Number(b.hang)}</b><i>${TEN[ky]}</i></span>` : ""}
        <figcaption><b>${esc(b.hocVien || "")} ${!b.tg && !tam ? (t => huyHieu(t.r, t.i, "xs"))(tinhRank(null, null, null, b.hocVien)) : ""}</b><span>${esc([b.loai, b.ghiChu].filter(Boolean).join(" · "))}</span></figcaption></figure>`).join("")}</div>
      <div class="gv-ctl"><button type="button" class="gv-nav" aria-label="Bài trước">‹</button>
        <div class="gv-dots">${ds.map((b, i) => `<button type="button" data-i="${i}" aria-label="Bài ${i + 1}"></button>`).join("")}</div>
        <button type="button" class="gv-nav" aria-label="Bài sau">›</button></div>
      ${tam ? `<p class="muted nb-note">Bài nổi bật ${TEN[ky]} này đang được thầy chọn. Tạm xem bài mẫu của đội ngũ giáo viên.</p>` : ""}`;
    const [p, n] = box.querySelectorAll(".gv-nav");
    const cards = [...box.querySelectorAll(".nb-card")];
    vx = vongXoay(box, box.querySelector(".nb-stage"), cards, [...box.querySelectorAll(".gv-dots button")], p, n, c => {
      galList = ds; showLb(Number(c.dataset.i));
    });
  };
  $$("#nb-tabs [data-k]").forEach(t => t.onclick = () => { ky = t.dataset.k; $$("#nb-tabs [data-k]").forEach(x => x.setAttribute("aria-selected", x === t)); ve(); });
  // Mặc định mở mục có bài gần nhất (tuần → tháng → năm)
  ky = ["tuan", "thang", "nam"].find(k => locNoiBat(k).length) || "tuan";
  $$("#nb-tabs [data-k]").forEach(x => x.setAttribute("aria-selected", x.dataset.k === ky));
  ve();
})();

/* Khoá học: biến 6 thẻ khoá học thành vòng xoay giống phần Giáo viên */
(function khoaHocXoay() {
  const box = $("#khoa-hoc .courses"); if (!box) return;
  const cards = $$("#khoa-hoc .courses > .course"); if (cards.length < 3) return;
  const stage = document.createElement("div"); stage.className = "gv-stage cs-stage";
  cards.forEach((c, i) => { c.dataset.i = i; stage.appendChild(c); });
  box.className = "gv-ring cs-ring"; box.setAttribute("aria-roledescription", "vòng xoay"); box.setAttribute("aria-label", "Các khoá học");
  box.appendChild(stage);
  const ctl = document.createElement("div"); ctl.className = "gv-ctl";
  ctl.innerHTML = `<button type="button" class="gv-nav" aria-label="Khoá trước">‹</button>
    <div class="gv-dots">${cards.map((c, i) => `<button type="button" data-i="${i}" aria-label="${esc((c.querySelector("h3") || {}).textContent || "")}"></button>`).join("")}</div>
    <button type="button" class="gv-nav" aria-label="Khoá sau">›</button>`;
  box.appendChild(ctl);
  const [prev, next] = ctl.querySelectorAll(".gv-nav");
  vongXoay(box, stage, cards, [...ctl.querySelectorAll(".gv-dots button")], prev, next, () => { location.hash = "#dang-ky"; });
})();

/* ================= Đội ngũ giáo viên ================= */
function renderGiaoVien() {
  const box = $("#gv-grid"); if (!box) return;
  if (!GIAO_VIEN.length) { $("#giao-vien").hidden = true; return; }
  const IMG = "assets/img/giao-vien/", n = GIAO_VIEN.length;
  box.innerHTML = `<div class="gv-stage" id="gv-stage">${GIAO_VIEN.map((g, i) => {
    const t = g.truong ? TRUONG[g.truong] : null;
    return `<article class="gv${g.chinh ? " chinh" : ""}" data-i="${i}" aria-roledescription="thẻ" aria-label="${i + 1} / ${n}: ${esc(g.ten)}">
      <button type="button" class="gv-in" data-i="${i}" tabindex="-1">
        ${g.anh ? `<img class="gv-bai${g.bai ? " gv-art-full" : ""}" src="${esc(g.bai || IMG + g.anh + "-bai.jpg")}" alt="" loading="lazy" decoding="async" width="348" height="234" draggable="false">`
          : g.chinh ? `<span class="gv-bai gv-bai-trong"><b>6</b><small>năm đứng lớp<br>luyện thi năng khiếu</small></span>`
          : `<span class="gv-bai gv-bai-trong alt"><b>${esc(g.khoi.replace("Khối ", ""))}</b><small>${esc(g.vaiTro)} ${esc(g.khoi)}</small></span>`}
        <span class="gv-ava">${g.anh ? `<img src="${IMG}${esc(g.anh)}.jpg" alt="" loading="lazy" decoding="async" width="96" height="96" draggable="false">` : `<i>${esc(initials(g.ten))}</i>`}</span>
        <span class="gv-txt">
          <span class="gv-vt">${esc(g.vaiTro)} · ${esc(g.khoi)}</span>
          <b class="gv-ten">${esc(g.ten)}</b>
          <span class="gv-ng">${t ? `<i class="gv-tr" style="--c:${esc(t.mau)}" title="${esc(t.ten)}">${esc(g.truong)}</i>` : ""}${esc(g.nganh)}</span>
        </span>
      </button></article>`;
  }).join("")}</div>
  <div class="gv-ctl">
    <button type="button" class="gv-nav" id="gv-prev" aria-label="Thầy cô trước">‹</button>
    <div class="gv-dots" id="gv-dots">${GIAO_VIEN.map((g, i) => `<button type="button" data-i="${i}" aria-label="${esc(g.ten)}"></button>`).join("")}</div>
    <button type="button" class="gv-nav" id="gv-next" aria-label="Thầy cô sau">›</button>
  </div>`;

  const ds = GIAO_VIEN.filter(g => g.anh);
  const vx = vongXoay(box, $("#gv-stage"), $$("#gv-stage .gv"), $$("#gv-dots button"), $("#gv-prev"), $("#gv-next"), (c) => {
    const g = GIAO_VIEN[Number(c.dataset.i)]; if (!g.anh) return;   // bấm thẻ giữa: xem cả tấm thẻ + bài vẽ
    galList = ds.map(x => ({ anh: IMG + x.anh + "-the.jpg", hocVien: x.ten, loai: x.vaiTro + " " + x.khoi, moTa: x.nganh }));
    vx.pause(true); showLb(ds.indexOf(g));
  });
  $("#lb-close").addEventListener("click", () => vx.pause(false));
}

/* ================= Bảng vàng thi năng khiếu ================= */
const BV_NAM = [...new Set(BANG_VANG.map(x => Number(x.nam)))].filter(Boolean).sort((a, b) => b - a);
let bvYear = 0, bvSchool = "", bvMore = false; // chỉ hiện top 3 có ảnh + 7 bạn tiếp theo
const initials = t => String(t || "").trim().split(/\s+/).slice(-2).map(w => w[0] || "").join("").toUpperCase();
const fmtDiem = d => Number(d).toLocaleString("vi-VN", { minimumFractionDigits: Number(d) % 1 ? 1 : 1, maximumFractionDigits: 2 });
const tr = k => TRUONG[k] || { ten: k, mau: "#5b6068" };
const hopNam = (x, nam) => !nam || Number(x.nam) === nam;
const chipTr = k => `<span class="trc" style="--c:${esc(tr(k).mau)}" title="${esc(tr(k).ten)}">${esc(k)}</span>`;
// Gộp các dòng của cùng một bạn; xếp theo điểm vẽ cao nhất, rồi tổng 2 điểm cao nhất.
function gomHocVien(nam, truong) {
  const map = new Map();
  BANG_VANG.filter(x => hopNam(x, nam) && (!truong || x.truong === truong)).forEach(r => {
    const k = r.ten.trim().toLowerCase() + "|" + r.nam;
    if (!map.has(k)) map.set(k, { ten: r.ten.trim(), nam: Number(r.nam), anh: r.anh, kq: [] });
    const s = map.get(k); s.kq.push(r); if (r.anh) s.anh = r.anh;
  });
  return [...map.values()].map(s => {
    const ve = s.kq.flatMap(r => Object.entries(r.diem || {}).filter(([m]) => !/phỏng vấn/i.test(m)).map(([m, d]) => ({ m, d: Number(d), tr: r.truong })))
      .filter(x => !isNaN(x.d)).sort((a, b) => b.d - a.d);
    return { ...s, top: ve[0] || null, sum: (ve[0] ? ve[0].d : 0) + (ve[1] ? ve[1].d : 0), truongs: [...new Set(s.kq.map(r => r.truong))] };
  }).sort((a, b) => ((b.top ? b.top.d : -1) - (a.top ? a.top.d : -1)) || (b.sum - a.sum) || a.ten.localeCompare(b.ten, "vi"));
}
function renderHonor() {
  if (!BANG_VANG.length) {
    $("#bv-years").hidden = true;
    $("#bv-body").innerHTML = `<div class="bv-empty"><svg class="art" aria-hidden="true"><use href="#v-cup"/></svg>
      <div><h3>Bảng vàng mùa thi đang được cập nhật</h3><p class="muted">Lớp sẽ đăng điểm năng khiếu của học viên ngay khi các trường công bố kết quả.</p>
      <a class="btn primary" href="#dang-ky">Đăng ký học để có tên ở đây</a></div></div>`;
    return;
  }
  $("#bv-years").hidden = false;
  $("#bv-years").innerHTML = `<button class="tab" data-y="0" aria-selected="${!bvYear && !bvSchool}">Tất cả các khoá</button>` + BV_NAM.map(y => `<button class="tab" data-y="${y}" aria-selected="${y === bvYear && !bvSchool}">Mùa thi ${y}</button>`).join("")
    + `<span class="bv-sep"></span>` + Object.keys(TRUONG).filter(k => BANG_VANG.some(x => hopNam(x, bvYear) && x.truong === k))
      .map(k => `<button class="tab trtab" data-t="${esc(k)}" style="--c:${esc(tr(k).mau)}" aria-selected="${bvSchool === k}">${esc(k)}</button>`).join("");
  $$("#bv-years [data-y]").forEach(b => b.onclick = () => { bvYear = Number(b.dataset.y); bvSchool = ""; bvMore = false; renderHonor(); });
  $$("#bv-years [data-t]").forEach(b => b.onclick = () => { bvSchool = bvSchool === b.dataset.t ? "" : b.dataset.t; renderHonor(); });

  const all = gomHocVien(bvYear, "");
  const list = bvSchool ? gomHocVien(bvYear, bvSchool) : all;
  const scored = list.filter(x => x.top);
  const luot = BANG_VANG.filter(x => hopNam(x, bvYear)).length;
  const tatCa = !bvYear, nhanNam = x => tatCa ? ` · Khoá ${x.nam}` : "";
  const ava = x => x.anh ? `<img src="${esc(x.anh)}" alt="" loading="lazy" decoding="async" width="96" height="96">` : `<span>${esc(initials(x.ten))}</span>`;
  const diemCua = x => x.top ? `<b class="sc num">${fmtDiem(x.top.d)}</b><span class="sm">${esc(x.top.m)} · ${esc(x.top.tr)}</span>` : `<span class="sm">Đỗ ${esc(x.truongs.join(", "))}</span>`;
  const chiTiet = x => x.kq.map(r => `<li>${chipTr(r.truong)} <span>${esc(tr(r.truong).ten)}</span>
      <span class="ds">${Object.entries(r.diem || {}).map(([m, d]) => `${esc(m)} <b class="num">${fmtDiem(d)}</b>`).join(" · ") || "Đỗ"}</span></li>`).join("");
  // Kiểu MotoGP "Top 9": bục 3 thẻ (vàng – đỏ – xanh lá) + danh sách hạng 4–9, còn lại bấm "Xem tất cả"
  const rankOf = new Map(scored.map((x, i) => [x, i + 1]));
  const cards = scored.slice(0, 3);
  const VT = { "Hình hoạ": "HH", "Bố cục màu": "BCM", "Bố cục": "BC", "Ký hoạ": "KH", "Phỏng vấn": "PV", "Khối V": "KV" };
  const tachTen = t => { const w = String(t).trim().split(/\s+/); return [w.slice(0, -1).join(" "), w.slice(-1)[0] || ""]; };
  const mgCard = x => {
    const r = rankOf.get(x), [ho, ten] = tachTen(x.ten);
    return `<li class="mg-card c${r}">${r === 1 ? `<span class="mg-crown" aria-hidden="true"><svg viewBox="0 0 64 44"><path d="M6 14l14 12 12-22 12 22 14-12-6 26H12z"/><rect x="12" y="38" width="40" height="5" rx="2"/><circle cx="6" cy="12" r="4"/><circle cx="32" cy="4" r="4"/><circle cx="58" cy="12" r="4"/></svg></span>` : ""}
      <div class="mg-top">
        <span class="mg-big num" aria-hidden="true">${r}</span>
        ${x.anh ? `<img src="${esc(x.anh)}" alt="${esc(x.ten)}" loading="lazy" decoding="async" width="240" height="240">` : `<span class="mg-ini">${esc(initials(x.ten))}</span>`}
        <span class="mg-badge">${x.truongs.map(k => `<i style="--c:${esc(tr(k).mau)}">${esc(k)}</i>`).join("")}</span>
        <span class="mg-pts"><b class="num">${x.top ? fmtDiem(x.top.d) : "–"}</b><small>${x.top ? esc(VT[x.top.m] || x.top.m) : ""}</small></span>
      </div>
      <div class="mg-name"><span>${esc(ho)}</span><b>${esc(ten)}</b>${tatCa ? `<em class="mg-yr">Khoá ${x.nam}</em>` : ""}
        <span class="mg-sub2">${x.top ? `${esc(x.top.m)} · ${esc(x.top.tr)}` : `Đỗ ${esc(x.truongs.join(", "))}`}</span>
        <details class="mg-kq"><summary>Xem điểm từng trường ▾</summary><ul class="kq">${chiTiet(x)}</ul></details></div></li>`;
  };
  const rest = list.filter(x => !cards.includes(x));
  $("#bv-body").innerHTML = `
    <div class="bv-stats">
      <div><b class="num">${all.length}</b><span>học viên được vinh danh</span></div>
      <div><b class="num">${luot}</b><span>lượt đỗ / có điểm</span></div>
      <div><b class="num">${all[0] && all[0].top ? fmtDiem(all[0].top.d) : "–"}</b><span>điểm vẽ cao nhất</span></div>
      <div><b class="num">${all.filter(x => x.top && x.top.d >= 8.5).length}</b><span>bạn đạt từ 8,5 điểm</span></div>
    </div>
    ${bvSchool ? `<p class="bv-filter">Đang xem: <b>${esc(tr(bvSchool).ten)}</b> <button type="button" class="linkish" id="bv-clear">Xem tất cả</button></p>` : ""}
    <div class="mg-board">
      <h3 class="mg-title">TOP ${Math.min(9, list.length)} <span>· ${tatCa ? "Tất cả các khoá" : `Mùa thi ${bvYear}`}</span></h3>
      <ol class="mg-pod">${cards.map(mgCard).join("")}</ol>
      <ol class="mg-rows ${bvMore ? "" : "gon"}">${rest.map((x, i) => `<li class="${i >= 6 ? "them" : ""}"><details>
        <summary><span class="mg-rk num">${x.top ? rankOf.get(x) : "–"}</span>
          <span class="mg-tr">${x.truongs.map(k => `<i style="--c:${esc(tr(k).mau)}">${esc(k)}</i>`).join("")}</span>
          <b class="mg-nm">${esc(x.ten)}</b>
          <span class="mg-sub">${x.top ? `${esc(x.top.m)} · ${esc(x.top.tr)}${nhanNam(x)}` : `Đỗ ${esc(x.truongs.join(", "))}${nhanNam(x)}`}</span>
          <span class="mg-sc"><b class="num">${x.top ? fmtDiem(x.top.d) : "–"}</b><small>Đ</small></span></summary>
        <ul class="kq">${chiTiet(x)}</ul></details></li>`).join("")}</ol>
      ${rest.length > 6 ? `<button type="button" class="mg-more" id="bv-more">${bvMore ? "Thu gọn ▲" : `Xem tất cả ${list.length} học viên ▼`}</button>` : ""}
    </div>
    <p class="muted bv-note">Bấm vào tên để xem điểm từng trường. Xếp theo điểm môn vẽ cao nhất của mỗi bạn.</p>`;
  if ($("#bv-clear")) $("#bv-clear").onclick = () => { bvSchool = ""; renderHonor(); };
  if ($("#bv-more")) $("#bv-more").onclick = () => { bvMore = !bvMore; renderHonor(); if (!bvMore) $("#bang-vang").scrollIntoView({ block: "start" }); };
}
renderHonor();
renderGiaoVien();

/* ================= Đăng ký học thử ================= */
// Gửi thẳng cho thầy qua email (không bắt phụ huynh tự sao chép), kèm nút Gọi / Zalo dự phòng.
const SDT_LOP = String(LIEN_HE.sdt || "").replace(/\D/g, "");
$("#dk-call").href = "tel:" + SDT_LOP;
$("#dk-zalo").href = "https://zalo.me/" + SDT_LOP;

/* ================= Đếm ngược tới ngày thi ngay trong form đăng ký =================
   Chọn "Trường muốn thi" là đồng hồ đổi sang kỳ thi của trường đó (tính tới 7h sáng ngày thi). */
(function demNguoc() {
  const sel = $("#dk-truong"), lop = $("#dk-lop"); if (!sel || !lop) return;
  const TEN = {}; LICH_THI.forEach(e => { if (e.truong !== "THPT") TEN[e.truong] = TEN[e.truong] || e.ten; });
  sel.insertAdjacentHTML("beforeend", BO_LOC_TRUONG.filter(b => TEN[b.truong]).map(b => `<option value="${esc(TEN[b.truong])}" data-t="${esc(b.truong)}">${esc(TEN[b.truong])}</option>`).join("")
    + `<option value="Trường khác">Trường khác</option>`);
  // Mỗi lớp thi một năm khác nhau: lớp 12 (2k9) thi năm NAM_THI, lớp 11 thi năm sau, lớp 10 sau 2 năm…
  // Năm sau chưa có lịch chính thức nên lấy theo ngày của mùa thi NAM_THI, ghi rõ "dự kiến".
  const SAU = { "Lớp 12": 0, "Thi lại": 0, "Lớp 11": 1, "Lớp 10": 2, "Lớp 9": 3, "Lớp 6–8": 4 };
  const moc = (e, them) => { const [y, m, d] = e.ngay.split("-").map(Number); return Date.UTC(y + them, m - 1, d, 0, 0, 0); }; // 7h sáng giờ VN
  const chon = () => {
    const them = lop.value in SAU ? SAU[lop.value] : 0;
    if (lop.value === "Người lớn học vẽ") return null;
    const t = sel.selectedOptions[0] && sel.selectedOptions[0].dataset.t;
    const ds = LICH_THI.filter(e => e.truong !== "THPT" && (!t || e.truong === t) && moc(e, them) > Date.now()).sort((a, b) => moc(a, them) - moc(b, them));
    return ds[0] ? { ...ds[0], them, nam: Number(ds[0].ngay.slice(0, 4)) + them } : null;
  };
  let ky = chon(), timer = 0, thay = false;
  const hai = n => String(n).padStart(2, "0");
  const ve = () => {
    if (!ky) { $("#dk-cd").hidden = true; return; }
    $("#dk-cd").hidden = false;
    const con = Math.max(0, moc(ky, ky.them) - Date.now()), s = Math.floor(con / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), giay = s % 60;
    $("#cd-d").textContent = d; $("#cd-h").textContent = hai(h); $("#cd-m").textContent = hai(m); $("#cd-s").textContent = hai(giay);
    const ai = lop.value && lop.value in SAU ? `${lop.value} · thi ${lop.value === "Lớp 6–8" ? "từ năm" : "năm"} ${ky.nam}` : `Học sinh lớp 12 · thi năm ${ky.nam}`;
    const truong = sel.value && sel.value !== "Trường khác" ? ky.ten : "kỳ thi năng khiếu đầu tiên · " + ky.ten;
    $("#dk-cd-t").textContent = `${ai} · ${truong} · ${ky.them ? "dự kiến " : ""}${ky.hienThi}/${ky.nam}`;
    const buoi = Math.floor(d / 7) * 4;
    $("#dk-cd-f").innerHTML = ky.them
      ? `≈ <b>${buoi} buổi học</b> nếu học 4 buổi mỗi tuần. Học sớm từ ${lop.value.toLowerCase()} là lợi thế lớn: <b>vững hình hoạ trước, năm cuối chỉ cần luyện đề</b>.`
      : `≈ <b>${buoi} buổi học</b> nếu học 4 buổi mỗi tuần. Mỗi tuần chậm trễ là bớt 4 buổi luyện, <b>đăng ký học thử ngay hôm nay</b>.`;
  };
  const chay = () => { clearInterval(timer); if (thay && !document.hidden) timer = setInterval(ve, 1000); };
  const doi = () => { ky = chon(); ve(); };
  sel.addEventListener("change", doi); lop.addEventListener("change", doi);
  document.addEventListener("visibilitychange", chay);
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { thay = es[0].isIntersecting; if (thay) ve(); chay(); }).observe($("#dk-cd"));
  else { thay = true; chay(); }
  ve();
})();

/* ================= Tìm kiếm nhanh trên toàn web (Ctrl + K hoặc nút kính lúp) ================= */
(function timKiem() {
  const ov = $("#tk-ov"), q = $("#tk-q"), ul = $("#tk-kq"); if (!ov) return;
  const bo = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  let idx = null, sel = 0, kq = [];
  const lap = () => {
    const ds = [];
    const them = (loai, ten, mo, url, chu) => ds.push({ loai, ten, mo, url, k: bo(ten + " " + mo + " " + (chu || "")), kt: bo(ten) });
    $$("#v-home > section[id], #v-home > header[id]").forEach(sec => {
      const h = sec.querySelector("h2, h1"); if (!h) return;
      them("Mục", h.textContent.trim(), (sec.querySelector(".sec-head p.muted, .cine-lede") || {}).textContent || "", "#" + sec.id, sec.textContent.slice(0, 900));
    });
    $$(".course").forEach(c => them("Khoá học", (c.querySelector("h3") || {}).textContent || "", [(c.querySelector(".eyebrow") || {}).textContent, (c.querySelector(".len") || {}).textContent].filter(Boolean).join(" · "), "#khoa-hoc", c.textContent));
    GIAO_VIEN.forEach(g => them("Giáo viên", g.ten, `${g.vaiTro} · ${g.khoi}${g.truong ? " · " + g.truong : ""}`, "#giao-vien", g.nganh));
    const hv = new Map();
    BANG_VANG.forEach(r => { const k = r.ten + "|" + r.nam; const d = Object.entries(r.diem || {}).map(([m, v]) => `${m} ${fmtDiem(v)}`).join(", ");
      hv.set(k, (hv.get(k) || []).concat(`${r.truong}${d ? ": " + d : ""}`)); });
    hv.forEach((v, k) => { const [ten, nam] = k.split("|"); them("Bảng vàng", ten, `Khoá ${nam} · ${v.join(" · ")}`, "#bang-vang"); });
    LICH_THI.forEach(e => them("Lịch thi", e.ten, `${e.dot} · ${e.hienThi}/${e.ngay.slice(0, 4)}`, "#lich-thi", e.truong));
    them("Trang", "Đăng ký học thử", "Gửi thông tin, thầy gọi lại tư vấn · đếm ngược ngày thi", "#dang-ky", "dang ky hoc thu tu van hoc phi lien he so dien thoai zalo");
    them("Trang", "Tài khoản học viên", "Đăng nhập, giáo trình, bài tập, nhắn tin thầy cô", "#tai-khoan", "dang nhap dang ky tai khoan giao trinh bai tap");
    them("Liên hệ", "Gọi / Zalo " + (LIEN_HE.sdt || ""), "Cơ sở Bình Phú · Kim Quan, Thạch Thất", "#dang-ky", "lien he dien thoai zalo dia chi co so");
    return ds;
  };
  const tim = s => {
    idx = idx || lap();
    const tu = bo(s).split(/\s+/).filter(Boolean);
    if (!tu.length) return idx.filter(x => x.loai === "Mục" || x.loai === "Trang").slice(0, 8);
    return idx.map(x => ({ x, d: tu.every(t => x.k.includes(t)) ? (tu.every(t => x.kt.includes(t)) ? 2 : 1) + (x.kt.startsWith(tu[0]) ? 1 : 0) : 0 }))
      .filter(r => r.d).sort((a, b) => b.d - a.d).slice(0, 12).map(r => r.x);
  };
  const to = (t, s) => { // tô đậm chữ khớp
    const tu = bo(s).split(/\s+/).filter(Boolean); if (!tu.length) return esc(t);
    const b = bo(t); let out = "", i = 0;
    while (i < t.length) { const m = tu.find(w => b.startsWith(w, i)); if (m) { out += "<mark>" + esc(t.substr(i, m.length)) + "</mark>"; i += m.length; } else { out += esc(t[i]); i++; } }
    return out;
  };
  const ve = () => {
    kq = tim(q.value); sel = Math.min(sel, Math.max(0, kq.length - 1));
    ul.innerHTML = kq.length ? kq.map((x, i) => `<li role="option" aria-selected="${i === sel}"><a href="${x.url}" data-i="${i}"><i>${esc(x.loai)}</i><b>${to(x.ten, q.value)}</b><span>${to(x.mo, q.value)}</span></a></li>`).join("")
      : `<li class="tk-rong">Không tìm thấy “${esc(q.value)}”. Thử từ khác, hoặc <a href="#dang-ky">nhắn thầy</a>.</li>`;
    $("#tk-goi").textContent = q.value ? `${kq.length} kết quả · ↑↓ để chọn · Enter để mở` : "Gợi ý: “hình hoạ”, “kiến trúc”, “9,5”, “Kim Quan”, tên học viên…";
  };
  const mo = () => { ov.hidden = false; document.body.style.overflow = "hidden"; q.value = ""; sel = 0; ve(); setTimeout(() => q.focus(), 20); };
  const dong = () => { ov.hidden = true; document.body.style.overflow = ""; };
  $("#nav-search").onclick = mo; $("#tk-x").onclick = dong;
  ov.addEventListener("click", e => { if (e.target === ov) dong(); if (e.target.closest("a")) dong(); });
  q.addEventListener("input", () => { sel = 0; ve(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(kq.length - 1, sel + 1); ve(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); ve(); e.preventDefault(); }
    if (e.key === "Enter" && kq[sel]) { location.hash = kq[sel].url; dong(); }
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && !ov.hidden) dong();
    const go = e.target.matches && e.target.matches("input, textarea, select, [contenteditable]");
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !go)) { e.preventDefault(); ov.hidden ? mo() : dong(); }
  });
})();

/* ================= Giao diện điện ảnh: hero, menu, thanh gọi nhanh ================= */
(function cine() {
  const nav = $("nav"), hero = $("#gioi-thieu"), root = document.documentElement;
  // Số liệu trên hero lấy thẳng từ Bảng vàng + lịch thi, thầy không phải sửa tay
  if (BANG_VANG.length) {
    const diem = BANG_VANG.flatMap(r => Object.entries(r.diem || {}).filter(([m]) => !/phỏng vấn/i.test(m)).map(([, d]) => Number(d))).filter(d => !isNaN(d));
    if (diem.length) $("#hs-top").textContent = fmtDiem(Math.max(...diem));
    const co = new Set(BANG_VANG.map(r => r.truong));
    $("#hero-schools").innerHTML = Object.keys(TRUONG).filter(k => co.has(k)).map(k => `<a href="#bang-vang" data-t="${esc(k)}" style="--c:${esc(TRUONG[k].mau)}" title="Xem học viên đỗ ${esc(TRUONG[k].ten)}">${esc(k)}</a>`).join("");
    // Bấm tên trường ở trang đầu → mở Bảng vàng, lọc sẵn học viên đỗ trường đó
    $$("#hero-schools a").forEach(a => a.addEventListener("click", () => { bvYear = 0; bvSchool = a.dataset.t; bvMore = false; renderHonor(); }));
  }
  const sap = LICH_THI.map(e => ({ ...e, n: daysUntil(e.ngay) })).filter(e => e.n >= 0).sort((a, b) => a.n - b.n)[0];
  if (sap) $("#hero-badge").textContent = `Còn ${sap.n} ngày đến kỳ thi đầu tiên`;

  // Menu trong suốt khi nằm trên hero, có nền khi cuộn xuống
  const setNavH = () => root.style.setProperty("--nav-h", nav.offsetHeight + "px");
  requestAnimationFrame(setNavH); addEventListener("resize", setNavH, { passive: true });
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const home = !$("#v-home").hidden, y = scrollY, h = hero.offsetHeight;
    nav.classList.toggle("on-hero", home && y < Math.min(60, h - nav.offsetHeight - 10) && !$("#menu-ov").classList.contains("open"));
    const dk = $("#dang-ky").getBoundingClientRect();
    const dock = $("#dock");
    dock.hidden = !home;
    dock.classList.toggle("show", home && y > h * .6 && !(dk.top < innerHeight && dk.bottom > 0));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("hashchange", () => requestAnimationFrame(onScroll));
  requestAnimationFrame(onScroll); // đọc kích thước sau khi trang vẽ xong, không làm chậm lần mở đầu

  // Menu toàn màn hình trên điện thoại
  const ov = $("#menu-ov"), burger = $("#nav-burger");
  $("#menu-links").innerHTML = $$("nav a.link").map((a, i) => `<a href="${a.getAttribute("href")}" style="--i:${i}">${esc((a.querySelector("b") || a).textContent.trim())}</a>`).join("")
    + `<a href="#tai-khoan" style="--i:${$$("nav a.link").length}">Tài khoản <small>Học viên · Giáo viên</small></a>`;
  const setMenu = open => {
    ov.classList.toggle("open", open); ov.setAttribute("aria-hidden", !open); burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : ""; onScroll();
  };
  burger.onclick = () => setMenu(true);
  $("#menu-x").onclick = () => setMenu(false);
  ov.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && ov.classList.contains("open")) setMenu(false); });

  // Menu thả xuống (máy tính): rê chuột hoặc bấm để mở, bấm ra ngoài / Esc để đóng
  const dds = $$("nav .dd"), dong = except => dds.forEach(d => { if (d !== except) { d.classList.remove("open"); d.querySelector(".dd-t").setAttribute("aria-expanded", "false"); } });
  dds.forEach(d => {
    const t = d.querySelector(".dd-t"); let hide;
    const mo = v => { clearTimeout(hide); if (v) dong(d); d.classList.toggle("open", v); t.setAttribute("aria-expanded", v); };
    d.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) mo(true); });
    d.addEventListener("mouseleave", () => { hide = setTimeout(() => mo(false), 160); });
    t.addEventListener("click", () => mo(!d.classList.contains("open")));
    d.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mo(false)));
  });
  document.addEventListener("click", e => { if (!e.target.closest("nav .dd")) dong(); });
  addEventListener("keydown", e => { if (e.key === "Escape") dong(); });

  // Hình trang trí mờ hai bên cho các phần khác (giống phần "Về lớp")
  const DECO = { "khoa-hoc": ["deco/khoi.svg", "deco/captoc.svg"], "bang-vang": [null, "deco/cup.svg"], "giao-vien": ["hinh-hoa-nguoi.png", null],
    "bai-ve": [null, "deco/mau.svg"], "lich-thi": ["deco/captoc.svg", null], "lich-hoc": [null, "deco/khoi.svg"], "khoi": ["hinh-hoa-tuong.png", null], "dang-ky": [null, "deco/mt2.svg"] };
  Object.entries(DECO).forEach(([id, [l, r]]) => {
    const sec = document.getElementById(id); if (!sec) return;
    sec.classList.add("has-deco");
    [[l, "deco-l"], [r, "deco-r"]].forEach(([f, c]) => { if (!f) return;
      const el = document.createElement("span"); el.className = "deco " + c; el.setAttribute("aria-hidden", "true");
      el.style.webkitMaskImage = el.style.maskImage = `url(assets/img/${f})`; sec.prepend(el); });
  });

  // Hình trang trí phần "Về lớp" trượt vào khi cuộn tới
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .2 });
    $$(".deco").forEach(d => io.observe(d));
  } else $$(".deco").forEach(d => d.classList.add("in"));

  // Tiêu đề các phần "nổi lên" và nhích theo con trỏ chuột khi rê tới (máy tính)
  if (matchMedia("(hover:hover) and (pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
    $$("#v-home .sec-head, .mg-title").forEach(head => {
      const t = head.querySelector("h2") || head;
      head.addEventListener("pointermove", e => {
        const r = head.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        t.style.transform = `translate(${x * 14}px, ${y * 8 - 4}px) scale(1.03)`; t.classList.add("noi");
      });
      head.addEventListener("pointerleave", () => { t.style.transform = ""; t.classList.remove("noi"); });
    });
  }

  // Thanh gọi nhanh
  $("#dock-call").href = "tel:" + SDT_LOP;
  $("#dock-zalo").href = "https://zalo.me/" + SDT_LOP;

  // Khối H/V: trên điện thoại thu gọn phần chi tiết
  if (matchMedia("(max-width:640px)").matches) $$(".khoi-dl").forEach(d => d.open = false);

  // Video nền (nếu thầy đã điền VIDEO_BIA): mờ dần vào/ra mỗi vòng lặp, chạy bằng requestAnimationFrame
  const conn = navigator.connection || {};
  if (VIDEO_BIA && !conn.saveData && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
    const v = document.createElement("video");
    Object.assign(v, { muted: true, playsInline: true, preload: "auto", src: VIDEO_BIA });
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    $(".cine-bg").appendChild(v);
    let raf = 0, fadingOut = false;
    const fadeTo = (to, ms = 500) => {
      cancelAnimationFrame(raf);
      const from = parseFloat(v.style.opacity || 0), t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / ms); v.style.opacity = from + (to - from) * k; if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    v.addEventListener("loadeddata", () => { v.style.opacity = 0; v.play().catch(() => {}); fadeTo(1); });
    v.addEventListener("timeupdate", () => { const left = v.duration - v.currentTime; if (!fadingOut && left > 0 && left <= .55) { fadingOut = true; fadeTo(0); } });
    v.addEventListener("ended", () => { v.style.opacity = 0; setTimeout(() => { v.currentTime = 0; v.play().catch(() => {}); fadingOut = false; fadeTo(1); }, 100); });
  }
})();
keepDraft($("#f-dk"), () => "nhap-hocthu");
fillForm($("#f-dk"), store.get("nhap-hocthu", null));
let dkSent = "";
$("#f-dk").addEventListener("submit", ev => {
  ev.preventDefault();
  const v = id => $(id).value.trim();
  const st = $("#dk-send"); st.classList.remove("err");
  const sdt = String(v("#dk-sdt")).replace(/[\s.\-()]/g, "");
  if (!/^(0|\+84)\d{9,10}$/.test(sdt)) {
    st.textContent = "Số điện thoại chưa đúng. Viết 10 số, bắt đầu bằng số 0."; st.classList.add("err"); $("#dk-sdt").focus(); return;
  }
  const lines = ["Chào thầy, em muốn đăng ký học thử / tư vấn:",
    "- Học sinh: " + v("#dk-ten"), "- SĐT phụ huynh: " + sdt, "- Đang học: " + v("#dk-lop"),
    "- Muốn học: " + v("#dk-khoi"), "- Hình thức: " + v("#dk-hinh")];
  if (v("#dk-truong")) lines.push("- Trường muốn thi: " + v("#dk-truong"));
  if (v("#dk-ghichu")) lines.push("- Câu hỏi: " + v("#dk-ghichu"));
  const text = lines.join("\n");
  $("#dk-text").textContent = text;
  $("#dk-out").hidden = false; $("#dk-status").textContent = ""; st.textContent = "";
  $("#dk-ok").textContent = "Đã gửi cho thầy! Thầy sẽ gọi lại cho bố mẹ em sớm. Cần gấp thì gọi hoặc nhắn Zalo ngay bên dưới.";
  $("#dk-out").scrollIntoView({ behavior: "smooth", block: "nearest" });
  dropDraft("nhap-hocthu");
  if (dkSent === text) return; // bấm 2 lần không gửi trùng
  dkSent = text;
  if (!EMAIL_NHAN_THONG_BAO) return;
  fetch("https://formsubmit.co/ajax/" + EMAIL_NHAN_THONG_BAO, {
    method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ _subject: `Đăng ký học thử: ${v("#dk-ten")} · ${sdt}`, _template: "table", _captcha: "false",
      "Học sinh": v("#dk-ten"), "SĐT phụ huynh": sdt, "Đang học": v("#dk-lop"), "Muốn học": v("#dk-khoi"),
      "Hình thức": v("#dk-hinh"), "Trường muốn thi": v("#dk-truong"), "Câu hỏi": v("#dk-ghichu") })
  }).then(r => { if (!r.ok) throw 0; }).catch(() => {
    dkSent = "";
    $("#dk-ok").textContent = "Mạng yếu nên chưa gửi tự động được. Em bấm Gọi thầy hoặc Nhắn Zalo (dán tin nhắn bên dưới) nhé.";
  });
});
$("#dk-copy").onclick = () => copyText($("#dk-text").textContent, $("#dk-status"), "Đã sao chép. Dán vào Zalo hoặc Messenger để gửi cho lớp.", $("#dk-text"));

/* ================= Firebase ================= */
const configured = !String(firebaseConfig.apiKey || "").startsWith("DAN_");
let app, auth, db;

// Vai trò: isAdmin = quản lý (toàn quyền); isTeacher = giáo viên hoặc quản lý; approved = học viên đã duyệt.
let user = null, mail = "", isAdmin = false, isTeacher = false, approved = false, needVerify = false;
let teachers = [], feedbackAll = {}, myFeedback = {};
let diemdanhAll = {}, myDiemdanh = {}, myHv = null;
const gradeOpen = new Set(), gradeDraft = {};
let needRedraw = false;
// Khi giáo viên gõ xong (rời ô nhập), vẽ lại nếu trong lúc gõ có dữ liệu mới.
document.addEventListener("focusout", () => setTimeout(() => { if (needRedraw) renderHomework(); }, 0));
let lessons = [], homework = [], roster = [], requests = [], progressAll = {};
let myProgress = { bai: {}, baitap: {} };
let course = null, lessonId = null, hwView = "open";
let unsubs = [];
// Khu Làm việc
let lvTB = [], lvCV = [], lvKenh = [], lvMine = null, lvErr = "", lvTab = "tin", lvOpen = "", lvMsgs = [], lvMsgUnsub = null, lvPending = [];
let cvView = "mo", chatFilter = "hocvien", reqCount = 0;
window.__lvReady = true;

function renderLocks(state) {
  const msg = {
    checking: ["Đang kiểm tra tài khoản…", "Chờ một chút nhé."],
    setup: ["Web chưa được kết nối Firebase", "Giáo viên cần dán cấu hình Firebase vào file firebase-config.js."],
    out: ["Em cần đăng nhập để xem mục này", "Mục này chỉ dành cho học viên chính thức đã được thầy duyệt Gmail."],
    pending: ["Gmail của em chưa được duyệt", "Em đã đăng nhập nhưng thầy chưa duyệt Gmail này."]
  }[state];
  $$("[data-lock]").forEach(el => {
    el.hidden = state === "ok";
    if (state === "ok") return;
    el.innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-lock"/></svg><h3>${msg[0]}</h3><p class="muted">${msg[1]}</p>
      ${state === "checking" || state === "setup" ? "" : `<ol><li>Đăng nhập (lần đầu thì tạo tài khoản) bằng Gmail em dùng để học.</li><li>Gửi yêu cầu duyệt ở trang Đăng nhập / Đăng ký.</li><li>Khi thầy duyệt xong, mở lại trang này.</li></ol>
      <div class="ctas"><a class="btn primary" href="#tai-khoan">Đăng nhập / Đăng ký</a><a class="btn" href="#dang-ky">Chưa là học viên? Đăng ký học</a></div>`}`;
  });
  $("#gt-body").hidden = state !== "ok";
  $("#bt-body").hidden = state !== "ok";
  $("#lv-body").hidden = state !== "ok";
}

let pendingReq = null, editingReq = false, regDraftFor = null;
function setStep(n) {
  $$("#stepper li").forEach(li => {
    const k = Number(li.dataset.step);
    li.className = k < n ? "done" : k === n ? "now" : "";
  });
}
function renderAccount(pending) {
  if (typeof pending === "object") pendingReq = pending; else if (pending === false) pendingReq = null;
  $$("[data-teacher]").forEach(el => el.hidden = !isTeacher);
  $$("[data-admin]").forEach(el => el.hidden = !isAdmin);
  renderAccNav(); renderTiles();
  $("#dd-lock").hidden = isTeacher;
  $("#duyet-lock").hidden = isAdmin;
  $("#pw-box").hidden = !!user || !configured;
  $("#card-verify").hidden = !(user && needVerify);
  $("#btn-switch").hidden = !user;
  $("#btn-learn").hidden = !(user && (approved || isTeacher));
  const canReg = !!user && !approved && !isTeacher && !needVerify;
  $("#card-reg").hidden = !(canReg && (!pendingReq || editingReq));
  $("#card-wait").hidden = !(canReg && pendingReq && !editingReq);
  if (!configured) {
    $("#who-name").textContent = "Web chưa kết nối Firebase";
    $("#who-mail").textContent = "Thầy cần dán mã kết nối vào config/firebase-config.js.";
    $("#who-status").innerHTML = ""; setStep(1); return;
  }
  if (!user) {
    $("#who-name").textContent = "Bước 1: Tạo tài khoản hoặc đăng nhập";
    $("#who-mail").textContent = "Dùng Gmail của em (hoặc của bố mẹ). Chưa có tài khoản thì chọn “Lần đầu: Tạo tài khoản”.";
    $("#who-status").innerHTML = ""; $("#who-avatar").hidden = true;
    $("#nav-acct-t").textContent = "Đăng nhập";
    setStep(1); return;
  }
  $("#who-name").textContent = user.displayName || "Xin chào";
  $("#who-mail").textContent = "Đang dùng Gmail: " + mail;
  if (user.photoURL) { $("#who-avatar").src = user.photoURL; $("#who-avatar").hidden = false; }
  $("#nav-acct-t").textContent = "Tài khoản";
  if (needVerify) {
    $("#who-status").innerHTML = `<span class="chip line">Chưa xác nhận Gmail</span>`;
    $("#verify-text").textContent = `Thầy đã gửi một thư xác nhận vào ${mail}. Em bấm link trong thư để chứng minh Gmail này là của em.`;
    setStep(1); return;
  }
  if (isAdmin) { $("#who-status").innerHTML = `<span class="chip">Quản lý</span> Toàn quyền: duyệt học viên và giáo viên, sửa giáo trình, giao và chấm bài.`; setStep(4); return; }
  if (isTeacher) { $("#who-status").innerHTML = `<span class="chip">Giáo viên</span> Thầy/cô giao bài, xem học viên đã nộp, chấm điểm và nhận xét.`; setStep(4); return; }
  if (approved) { $("#who-status").innerHTML = `<span class="chip ok">Đã duyệt</span> Em đã vào học được rồi.`; setStep(4); return; }
  if (pendingReq && !editingReq) {
    $("#who-status").innerHTML = `<span class="chip line">Chờ duyệt</span>`;
    $("#wait-text").textContent = `Em đã gửi ngày ${fmtDate(pendingReq.guiLuc)}. Thầy duyệt xong, trang này tự mở khoá, em không cần làm gì thêm.`;
    setStep(3); return;
  }
  $("#who-status").innerHTML = `<span class="chip line">Chưa gửi thông tin</span> Làm tiếp bước 2 ở bên dưới.`;
  // Lỡ tắt trang giữa chừng: điền lại những gì em đã gõ.
  if (regDraftFor !== mail) {
    regDraftFor = mail;
    const d = store.get("nhap-tk-" + mail, null);
    if (d) { fillForm($("#f-reg"), d); applyRoleFields(); }
  }
  if (!$("#rg-ten").value && user.displayName) $("#rg-ten").value = user.displayName;
  setStep(2);
}

/* ---------- Giáo trình ---------- */
function courses() { return [...new Set(lessons.map(l => l.khoa))]; }
function renderLessons() {
  const cs = courses();
  $("#khoa-list").innerHTML = cs.map(c => `<option value="${esc(c)}">`).join("");
  const selectedCourse = $("#bt-khoa").value || store.get(homeworkDraftKey(), {})?.["bt-khoa"];
  $("#bt-khoa").innerHTML = cs.concat(["Chung"]).map(c => `<option>${esc(c)}</option>`).join("");
  if (cs.concat(["Chung"]).includes(selectedCourse)) $("#bt-khoa").value = selectedCourse;
  $("#seed-box").hidden = !(isAdmin && lessons.length === 0);
  const total = lessons.length, n = lessons.filter(l => myProgress.bai[l.id]).length;
  $("#gt-prog-text").textContent = `Đã học ${n}/${total} bài`;
  $("#gt-prog").style.width = total ? (n / total * 100) + "%" : "0";
  if (!cs.length) {
    $("#course-tabs").innerHTML = ""; $("#lesson-nav").innerHTML = "";
    $("#lesson").innerHTML = `<p class="muted">Giáo trình chưa có bài nào.${isAdmin ? " Bấm “Nạp giáo trình có sẵn” ở khung bên dưới, hoặc tự thêm bài." : ""}</p>`;
    return;
  }
  if (!cs.includes(course)) course = cs[0];
  $("#course-tabs").innerHTML = cs.map(c => `<button class="tab" data-c="${esc(c)}" aria-selected="${c === course}">${esc(c)}</button>`).join("");
  $$("#course-tabs button").forEach(b => b.onclick = () => { course = b.dataset.c; lessonId = null; renderLessons(); });
  const list = lessons.filter(l => l.khoa === course);
  if (!list.find(l => l.id === lessonId)) lessonId = list[0].id;
  $("#lesson-nav").innerHTML = list.map(l =>
    `<button data-id="${esc(l.id)}" aria-current="${l.id === lessonId}"><span class="tick ${myProgress.bai[l.id] ? "done" : ""}"></span>${esc(l.ten)}</button>`).join("");
  $$("#lesson-nav button").forEach(b => b.onclick = () => {
    lessonId = b.dataset.id; renderLessons();
    // Trên điện thoại bài học nằm dưới danh sách: tự cuộn tới, để bấm là thấy ngay.
    const top = $("#lesson").getBoundingClientRect().top;
    if (top > innerHeight * 0.5 || top < 0) $("#lesson").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const l = list.find(x => x.id === lessonId);
  const items = Array.isArray(l.buoc) ? l.buoc : [];
  const body = l.loai === "noi-dung"
    ? `<ul class="points">${items.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`
    : `<ol class="steps">${items.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`;
  $("#lesson").innerHTML =
    `<p class="eyebrow">${esc(l.khoa)}</p><h3 style="font-size:1.5rem;margin-top:4px">${esc(l.ten)}</h3>
     ${body}${l.ghichu ? `<p class="gc"><b>Thầy dặn:</b> ${esc(l.ghichu)}</p>` : ""}
     <div class="foot">${isTeacher ? "" : `<button class="btn small" id="mark">${myProgress.bai[l.id] ? "Đã học xong ✓" : "Đánh dấu đã học"}</button>`}
     ${isAdmin ? `<button class="btn small" id="del-l">Xoá bài này</button>` : ""}</div>`;
  if ($("#mark")) $("#mark").onclick = () => toggleProgress("bai", l.id).then(renderLessons);
  if (isAdmin) confirmButton($("#del-l"), () => deleteDoc(doc(db, "giaotrinh", l.id)));
}

/* ---------- Bài tập ---------- */
function renderHomework() {
  // Không vẽ lại khi giáo viên đang gõ điểm/nhận xét, tránh mất chữ đang gõ.
  const ae = document.activeElement;
  if (ae && ae.closest && ae.closest(".grade") && ae.matches("input")) { needRedraw = true; return; }
  needRedraw = false;
  $("#hw-workspace").classList.toggle("staff", isTeacher);
  $("#hw-intro").textContent = isTeacher ? "Giao đề, chia sẻ tài liệu và theo dõi bài nộp của học viên trong một không gian." : "Đọc đề, tải tài liệu và theo dõi hạn nộp tại đây. Bài vẽ nộp trên lớp hoặc qua nhóm lớp.";
  const open = homework.filter(h => !h.han || daysUntil(h.han) >= 0);
  const soon = open.filter(h => h.han && daysUntil(h.han) <= 3);
  const done = isTeacher ? homework.filter(h => roster.some(r => progressAll[r.id]?.baitap?.[h.id] && !feedbackAll[r.id]?.[h.id])).length : homework.filter(h => myProgress.baitap[h.id]).length;
  $("#hw-count-open").textContent = open.length;
  $("#hw-count-past").textContent = homework.length - open.length;
  $("#hw-overview").innerHTML = `<article><span>Đang làm</span><b class="num">${open.length}</b><small>Bài còn thời gian</small></article><article><span>Sắp đến hạn</span><b class="num">${soon.length}</b><small>Trong 3 ngày tới</small></article><article><span>${isTeacher ? "Cần chấm" : "Đã nộp"}</span><b class="num">${done}</b><small>${isTeacher ? "Bài có học viên chờ chấm" : "Bài đã đánh dấu nộp"}</small></article>`;
  const courseSelect = $("#hw-course"), selected = courseSelect.value;
  const courses = [...new Set(homework.map(h => h.khoa).filter(Boolean))].sort((a,b) => a.localeCompare(b, "vi"));
  courseSelect.innerHTML = '<option value="">Tất cả khóa học</option>' + courses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  courseSelect.value = courses.includes(selected) ? selected : "";
  const q = timTen($("#hw-search").value), khoa = courseSelect.value;
  const list = homework.filter(h => (hwView === "open" ? !h.han || daysUntil(h.han) >= 0 : h.han && daysUntil(h.han) < 0)
    && (!khoa || h.khoa === khoa) && (!q || timTen(`${h.ten} ${h.mota || ""} ${h.lop || ""}`).includes(q)))
    .sort((a,b) => hwView === "open" ? String(a.han || "9999").localeCompare(String(b.han || "9999")) : String(b.han).localeCompare(String(a.han)));
  $("#hw-results").textContent = `${list.length} bài tập · ${hwView === "open" ? "Hạn gần nhất trước" : "Hết hạn gần nhất trước"}`;
  if (!list.length) {
    $("#hw-list").innerHTML = `<div class="hw-empty"><b>${q || khoa ? "Không tìm thấy bài phù hợp" : hwView === "open" ? "Chưa có bài tập đang làm" : "Chưa có bài hết hạn"}</b><p>${q || khoa ? "Thử đổi từ khóa hoặc chọn lại khóa học." : isTeacher ? "Bắt đầu bằng một đề bài và tài liệu hướng dẫn." : "Bài thầy cô giao sẽ xuất hiện tại đây."}</p>${q || khoa ? '<button class="btn small" type="button" id="hw-clear">Xóa bộ lọc</button>' : ""}</div>`;
    if ($("#hw-clear")) $("#hw-clear").onclick = () => { $("#hw-search").value = ""; courseSelect.value = ""; renderHomework(); };
    return;
  }
  const students = roster.length;
  $("#hw-list").innerHTML = list.map(h => {
    const n = daysUntil(h.han); const [, m, d] = String(h.han).split("-");
    const due = !h.han ? "Chưa đặt hạn nộp" : n < 0 ? `Hết hạn ${d}/${m}` : n === 0 ? "Hạn nộp hôm nay" : `Hạn ${d}/${m} · còn ${n} ngày`;
    const submitted = roster.filter(r => (progressAll[r.id] || {}).baitap && progressAll[r.id].baitap[h.id]).length;
    const graded = roster.filter(r => (feedbackAll[r.id] || {})[h.id]).length;
    const fb = myFeedback[h.id];
    const staffBar = `<span class="chip ok">${submitted}/${students} đã nộp</span><span class="chip">${graded} đã chấm</span>
        <button class="btn small primary" data-grade="${esc(h.id)}">${gradeOpen.has(h.id) ? "Đóng chấm bài" : "Chấm bài"}</button>
        <button class="btn small" data-del="${esc(h.id)}">Xoá</button>`;
    const studentBar = `<button class="btn small" data-hw="${esc(h.id)}">${myProgress.baitap[h.id] ? "Đã nộp ✓" : "Đánh dấu đã nộp"}</button>`;
    return `<div class="hw"><div><p class="eyebrow">${esc(h.khoa)}${h.lop ? " · " + esc(h.lop) : ""}</p><h3>${esc(h.ten)}</h3></div>
      <p class="due ${n <= 1 ? "late" : ""}">${due}</p>${h.mota ? `<p class="desc">${esc(h.mota)}</p>` : ""}
      ${homeworkFilesHTML(h)}
      ${!isTeacher && fb ? `<p class="fb"><b>Thầy nhận xét${fb.diem ? ` · Điểm ${esc(fb.diem)}` : ""}:</b> ${esc(fb.nhanXet || "")}<br><span class="muted">${esc(fb.nguoiCham || "")} · ${fmtDate(fb.luc)}</span></p>` : ""}
      <div class="acts">${isTeacher ? staffBar : studentBar}</div>
      ${isTeacher && gradeOpen.has(h.id) ? gradeTable(h) : ""}</div>`;
  }).join("");
  $$("#hw-list [data-hw]").forEach(b => b.onclick = () => toggleProgress("baitap", b.dataset.hw).then(renderHomework));
  $$("#hw-list [data-del]").forEach(b => confirmButton(b, () => deleteHomework(b.dataset.del)));
  $$("#hw-list [data-file]").forEach(b => b.onclick = () => downloadHomeworkFile(b));
  $$("#hw-list [data-grade]").forEach(b => b.onclick = () => {
    const id = b.dataset.grade; gradeOpen.has(id) ? gradeOpen.delete(id) : gradeOpen.add(id); renderHomework();
  });
  $$("#hw-list .grade input").forEach(i => i.oninput = () => { gradeDraft[i.dataset.key] = i.value; });
  $$("#hw-list [data-save]").forEach(b => b.onclick = () => saveGrade(b));
}
function gradeTable(h) {
  if (!roster.length) return `<div class="grade"><p class="muted">Chưa có học viên nào được duyệt.</p></div>`;
  const items = roster.map(r => {
    const done = (progressAll[r.id] || {}).baitap && progressAll[r.id].baitap[h.id];
    const fb = (feedbackAll[r.id] || {})[h.id] || {};
    const k1 = `${h.id}|${r.id}|diem`, k2 = `${h.id}|${r.id}|nx`;
    const d = gradeDraft[k1] ?? fb.diem ?? "", nx = gradeDraft[k2] ?? fb.nhanXet ?? "";
    return `<div class="g-row">
      <div class="g-who"><b>${esc(r.ten)}</b> ${done ? '<span class="chip ok">Đã nộp</span>' : '<span class="chip line">Chưa nộp</span>'}
        <span class="muted">${esc(r.chuongTrinh || r.lop || "")}</span></div>
      <div class="g-in">
        <label>Điểm<input class="g-diem" data-key="${esc(k1)}" value="${esc(d)}" maxlength="6" inputmode="decimal" placeholder="VD: 8"></label>
        <label class="g-nx-l">Nhận xét<input class="g-nx" data-key="${esc(k2)}" value="${esc(nx)}" maxlength="300" placeholder="Nhận xét ngắn"></label>
        <button class="btn small primary" data-save="${esc(h.id)}|${esc(r.id)}">${fb.luc ? "Lưu lại" : "Lưu"}</button>
      </div></div>`;
  }).join("");
  return `<div class="grade">${items}</div>`;
}
async function saveGrade(btn) {
  const [hid, email] = btn.dataset.save.split("|");
  const k1 = `${hid}|${email}|diem`, k2 = `${hid}|${email}|nx`;
  const row = btn.closest(".g-row");
  const diem = row.querySelector(".g-diem").value.trim(), nhanXet = row.querySelector(".g-nx").value.trim();
  delete gradeDraft[k1]; delete gradeDraft[k2];
  btn.textContent = "Đã lưu ✓";
  timed("Lưu điểm", setDoc(doc(db, "nhanxet", email), { [hid]: { diem, nhanXet, nguoiCham: (user && user.displayName) || mail, luc: Date.now() } }, { merge: true }))
    .catch(() => { gradeDraft[k1] = diem; gradeDraft[k2] = nhanXet; btn.textContent = "Lỗi, bấm lưu lại"; });
}
$$("#hw-filter .tab").forEach(b => b.onclick = () => {
  hwView = b.dataset.h; $$("#hw-filter .tab").forEach(x => x.setAttribute("aria-selected", x === b)); renderHomework();
});
$("#hw-search").oninput = renderHomework;
$("#hw-course").onchange = renderHomework;
$("#hw-new").onclick = () => { $("#hw-composer").open = true; $("#hw-composer").scrollIntoView({block:"start", behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}); $("#bt-ten").focus({preventScroll:true}); };
if (matchMedia("(max-width:900px)").matches) $("#hw-composer").open = false;

/* ---------- Tệp bài tập: chọn trước, tải khi giao bài, chỉ báo thành công sau khi lưu ---------- */
let homeworkFiles = [], homeworkBusy = false, homeworkUpload = null, homeworkCanceled = false;
const homeworkDraftKey = () => mail ? "nhap-bt-" + mail : null;
function clearHomeworkFiles() {
  homeworkFiles.forEach(x => { if (x.preview) URL.revokeObjectURL(x.preview); });
  homeworkFiles = []; $("#bt-files").value = ""; renderFileQueue();
}
function renderFileQueue() {
  $("#bt-file-list").innerHTML = homeworkFiles.map((x,i) => `<li>${x.preview ? `<img src="${esc(x.preview)}" alt="Xem trước ${esc(x.file.name)}">` : `<span class="file-kind">${esc(fileExt(x.file.name).toUpperCase())}</span>`}<span class="file-detail"><b>${esc(x.file.name)}</b><small>${fileSize(x.file.size)}</small></span><button type="button" class="file-remove" data-remove-file="${i}" aria-label="Bỏ tệp ${esc(x.file.name)}" ${homeworkBusy ? "disabled" : ""}>×</button></li>`).join("");
  $$("[data-remove-file]").forEach(b => b.onclick = () => {
    if (homeworkBusy) return;
    const [x] = homeworkFiles.splice(Number(b.dataset.removeFile),1);
    if (x.preview) URL.revokeObjectURL(x.preview);
    $("#bt-file-error").textContent = ""; renderFileQueue();
  });
}
function selectHomeworkFiles(files) {
  if (homeworkBusy) return;
  const next = [...homeworkFiles];
  for (const file of files) {
    if (next.some(x => x.file.name === file.name && x.file.size === file.size && x.file.lastModified === file.lastModified)) continue;
    next.push({file});
  }
  const error = validateFiles(next.map(x => x.file));
  $("#bt-file-error").textContent = error;
  if (!error) {
    homeworkFiles = next.map(x => x.preview || !['jpg','jpeg','png','webp'].includes(fileExt(x.file.name)) ? x : {...x, preview:URL.createObjectURL(x.file)});
    renderFileQueue();
  }
  $("#bt-files").value = "";
}
$("#bt-files").onchange = e => selectHomeworkFiles([...e.target.files]);
["dragenter","dragover"].forEach(event => $("#bt-drop").addEventListener(event,e => {e.preventDefault(); if (!homeworkBusy) $("#bt-drop").classList.add("dragging");}));
["dragleave","drop"].forEach(event => $("#bt-drop").addEventListener(event,e => {e.preventDefault(); $("#bt-drop").classList.remove("dragging");}));
$("#bt-drop").addEventListener("drop",e => selectHomeworkFiles([...e.dataTransfer.files]));
$("#bt-cancel").onclick = () => { homeworkCanceled = true; homeworkUpload?.cancel(); $("#bt-upload-label").textContent = "Đang hủy tải…"; };
addEventListener("beforeunload",e => { if (homeworkBusy) {e.preventDefault(); e.returnValue = "";} });
function homeworkFilesHTML(h) {
  const files = Array.isArray(h.tepDinhKem) ? h.tepDinhKem : [];
  return files.length ? `<div class="hw-attachments" aria-label="Tài liệu bài tập">${files.map((f,i) => validAttachmentPath(f.path,h.id) ? `<button class="hw-file" type="button" data-file="${i}" data-homework="${esc(h.id)}" aria-label="Tải ${esc(f.name)}"><span class="file-kind">${esc(fileExt(f.name).toUpperCase())}</span><span><b>${esc(f.name)}</b><small>${fileSize(f.size)} · Tải tài liệu</small></span><i aria-hidden="true">↓</i></button>` : "").join("")}</div>` : "";
}
async function downloadHomeworkFile(b) {
  if (!user || (!approved && !isTeacher)) return;
  const uid = user.uid;
  const h = homework.find(h => h.id === b.dataset.homework), f = h?.tepDinhKem?.[Number(b.dataset.file)];
  if (!f || !validAttachmentPath(f.path,h.id)) return;
  b.disabled = true; const label = b.querySelector('small'); const old = label.textContent; label.textContent = "Đang tải…";
  try {
    const sdk = await attachmentStorage(app);
    const blob = await sdk.getBlob(sdk.ref(sdk.storage,f.path), FILE_LIMITS.perFile);
    if (user?.uid !== uid || (!approved && !isTeacher)) return;
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = String(f.name).replace(/[\\/]/g,"_"); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
    toast("Đã tải tài liệu. Kiểm tra mục tải xuống của thiết bị.");
  } catch (e) { toast(e?.code === 'storage/object-not-found' ? "Tệp không còn trong kho. Nhờ thầy cô cập nhật lại tài liệu." : "Chưa tải được tài liệu. Kiểm tra kết nối hoặc liên hệ thầy cô.","err"); }
  finally { b.disabled = false; label.textContent = old; }
}
async function deleteHomework(id) {
  const h = homework.find(x => x.id === id);
  await deleteDoc(doc(db,"baitap",id));
  const files = (h?.tepDinhKem || []).filter(f => validAttachmentPath(f.path,id));
  if (!files.length) return;
  try {
    const sdk = await attachmentStorage(app);
    const results = await Promise.allSettled(files.map(f => sdk.deleteObject(sdk.ref(sdk.storage,f.path))));
    if (results.some(r => r.status === 'rejected' && r.reason?.code !== 'storage/object-not-found')) setTimeout(() => toast("Bài đã xóa. Một số tệp trong kho chưa xóa được; nhờ quản lý kiểm tra.","warn"),100);
  } catch { setTimeout(() => toast("Bài đã xóa, nhưng tệp trong kho chưa dọn được. Nhờ quản lý kiểm tra.","warn"),100); }
}
keepDraft($("#f-bt"), homeworkDraftKey);
$("#f-bt").addEventListener("submit", async ev => {
  ev.preventDefault();
  if (homeworkBusy) return;
  if (!db || !user || !isTeacher || needVerify) { toast("Đăng nhập tài khoản giáo viên để giao bài.","err"); return; }
  if (!ev.currentTarget.reportValidity()) return;
  const files = [...homeworkFiles], error = validateFiles(files.map(x => x.file));
  if (error) { $("#bt-file-error").textContent = error; return; }
  const form = ev.currentTarget, st = $("#bt-status"), owner = user.uid, draftKey = homeworkDraftKey();
  const data = {ten:$("#bt-ten").value.trim(),khoa:$("#bt-khoa").value,han:$("#bt-han").value,lop:$("#bt-lop").value.trim(),mota:$("#bt-mota").value.trim(),taoLuc:Date.now()};
  if (!data.ten) { st.textContent = "Vui lòng nhập tên bài tập."; st.classList.add("err"); $("#bt-ten").focus(); return; }
  homeworkBusy = true; homeworkCanceled = false;
  $("#bt-fields").disabled = true; $("#bt-cancel").disabled = false; $("#bt-upload-progress").value = 0;
  $("#bt-upload-state").hidden = !files.length;
  st.classList.remove("err"); st.textContent = files.length ? "Đang gửi tệp. Giữ trang mở cho đến khi hoàn tất." : "Đang giao bài…";
  const assignment = doc(collection(db,"baitap")), uploaded = [], paths = [];
  let sdk;
  try {
    const assertSession = () => { if (homeworkCanceled || user?.uid !== owner || !isTeacher) throw Object.assign(new Error('canceled'),{code:'storage/canceled'}); };
    if (files.length) {
      sdk = await attachmentStorage(app); assertSession();
      const totalBytes = files.reduce((n,x) => n+x.file.size,0); let finishedBytes = 0;
      for (let i=0; i<files.length; i++) {
        assertSession();
        const f = files[i].file, path = `baitap/${assignment.id}/${crypto.randomUUID()}.${fileExt(f.name)}`;
        paths.push(path);
        $("#bt-upload-label").textContent = `Tệp ${i+1}/${files.length}: ${f.name}`;
        homeworkUpload = sdk.uploadBytesResumable(sdk.ref(sdk.storage,path),f,{contentType:FILE_TYPES[fileExt(f.name)],contentDisposition:'attachment',customMetadata:{uploadedBy:owner}});
        await new Promise((resolve,reject) => homeworkUpload.on('state_changed',s => { $("#bt-upload-progress").value = Math.round((finishedBytes+s.bytesTransferred)/totalBytes*100); },reject,resolve));
        finishedBytes += f.size;
        uploaded.push({name:f.name,size:f.size,type:FILE_TYPES[fileExt(f.name)],path});
      }
    }
    assertSession(); homeworkUpload = null; $("#bt-cancel").disabled = true;
    $("#bt-upload-label").textContent = "Đang lưu bài tập…"; st.textContent = "Đang lưu bài tập. Chờ xác nhận trước khi đóng trang.";
    // Await the real Firestore result: no optimistic reset or success message.
    await setDoc(assignment,{...data,tepDinhKem:uploaded});
    if (user?.uid === owner) {
      form.reset(); clearHomeworkFiles(); dropDraft(draftKey);
      st.textContent = `Đã giao bài${uploaded.length ? ` cùng ${uploaded.length} tệp đính kèm` : ""}.`; toast(st.textContent);
      hwView = "open"; $("#hw-search").value = ""; $("#hw-course").value = "";
      $$("#hw-filter .tab").forEach(x => x.setAttribute("aria-selected",x.dataset.h === "open"));
      renderHomework();
      if (matchMedia("(max-width:900px)").matches) $("#hw-composer").open = false;
    }
  } catch (e) {
    let cleanupFailed = false;
    if (sdk) {
      const results = await Promise.allSettled(paths.map(path => sdk.deleteObject(sdk.ref(sdk.storage,path))));
      cleanupFailed = results.some(r => r.status === 'rejected' && r.reason?.code !== 'storage/object-not-found');
    }
    if (user?.uid === owner) {
      st.classList.add("err"); st.textContent = uploadError(e) + (cleanupFailed ? " Một số tệp tạm chưa xóa được; nhờ quản lý kiểm tra kho tệp." : "");
      store.set(draftKey,formValues(form));
    }
  } finally {
    homeworkBusy = false; homeworkUpload = null; $("#bt-fields").disabled = false;
    $("#bt-upload-state").hidden = true; renderFileQueue();
  }
});

// Đổi trên màn hình ngay, lưu lên máy chủ ở phía sau; lỗi thì trả lại như cũ.
function toggleProgress(kind, id) {
  const cu = myProgress[kind][id]; myProgress[kind][id] = cu ? false : Date.now(); saveData(); // lưu thời điểm để tính hạng
  timed("Lưu tiến độ", setDoc(doc(db, "tiendo", mail), { bai: myProgress.bai, baitap: myProgress.baitap, capNhat: Date.now() }))
    .catch(() => { myProgress[kind][id] = cu; renderLessons(); renderHomework(); alertStatus("Chưa lưu được tiến độ. Kiểm tra mạng rồi thử lại."); });
  return Promise.resolve();
}
function alertStatus(t) { toast(t, "err"); }

/* ---------- Quản lý: tự kiểm tra luật bảo mật trên Firebase có đúng bản mới không ---------- */
let svChecked = false;
async function checkRules() {
  const box = $("#sv-status"); if (!box) return;
  box.className = "sv-status"; box.textContent = "Đang kiểm tra máy chủ…";
  const ref = doc(db, "yeucau", mail);
  const mau = { vaiTro: "hocvien", gmail: mail, ten: "Phiếu thử", namSinh: 2010, sdt: "", sdtPh: "0900000000", truong: "", lopHoc: "",
    khuVuc: "", coso: "Bình Phú", chuongTrinh: "Vẽ cơ bản", khoi: "", namThi: "", mucTieu: "", ghiChu: "", guiLuc: Date.now() };
  try {
    await setDoc(ref, mau); await deleteDoc(ref);
    const ddRef = doc(db, "diemdanh", "_kiem-tra"); await setDoc(ddRef, { thu: "co" }); await deleteDoc(ddRef);
    const cvRef = doc(db, "congviec", "_kiem-tra"); await setDoc(cvRef, { viec: "thử", cho: "tatca", xong: false, luc: Date.now() }); await deleteDoc(cvRef);
    box.className = "sv-status ok"; box.textContent = "✓ Máy chủ hoạt động tốt: học viên gửi phiếu sẽ hiện ngay ở đây.";
  } catch (e) {
    const code = (e && e.code) || "";
    box.className = "sv-status bad";
    box.innerHTML = code === "permission-denied"
      ? `<b>⚠ Luật bảo mật trên Firebase đang là bản CŨ</b>, nên phiếu học viên gửi bị máy chủ chặn (thầy vẫn nhận email nhưng danh sách trống).
         <ol><li>Bấm <b>Sao chép luật mới</b>.</li><li>Bấm <b>Mở trang dán luật</b> → xoá hết chữ cũ trong khung → dán vào → bấm <b>Publish</b>.</li><li>Quay lại đây, bấm <b>Kiểm tra lại</b>.</li></ol>
         <div class="ctas" style="margin-top:8px"><button class="btn primary small" type="button" id="sv-copy">Sao chép luật mới</button>
         <a class="btn small" target="_blank" rel="noopener" href="https://console.firebase.google.com/project/${esc(firebaseConfig.projectId)}/firestore/databases/-default-/rules">Mở trang dán luật</a>
         <button class="btn small" type="button" id="sv-retry">Kiểm tra lại</button></div><span class="status" id="sv-copy-st"></span>`
      : `<b>⚠ Chưa kết nối được máy chủ</b> (mã: ${esc(code || "không rõ")}). Kiểm tra mạng, hoặc xem Firestore Database đã được tạo chưa. <button class="btn small" type="button" id="sv-retry">Kiểm tra lại</button>`;
    if ($("#sv-retry")) $("#sv-retry").onclick = checkRules;
    if ($("#sv-copy")) {
      const luat = fetch("firestore.rules?v=" + Date.now()).then(r => r.text()).catch(() => "");
      $("#sv-copy").onclick = async () => {
        const t = await luat; const st = $("#sv-copy-st");
        if (!t) { st.textContent = "Chưa tải được luật. Thử lại."; return; }
        try { await navigator.clipboard.writeText(t); st.textContent = "Đã sao chép. Giờ bấm Mở trang dán luật."; }
        catch (err) { st.textContent = "Máy không cho sao chép tự động. Mở file firestore.rules trên GitHub để sao chép."; }
      };
    }
  }
}

/* ---------- Giáo viên: duyệt học viên ---------- */
function fmtDate(t) { return t ? new Date(t).toLocaleDateString("vi-VN") : ""; }
function renderRequests() {
  const n = requests.length;
  $("#req-count").textContent = n || ""; $("#req-count").hidden = !n;
  reqCount = n; updBadges();
  if (!n) { $("#requests").innerHTML = `<p class="muted">Không có yêu cầu nào đang chờ.</p>`; return; }
  const v = x => esc(x || "—");
  const line = (k, val) => val ? `<div><span class="muted">${k}:</span> ${esc(val)}</div>` : "";
  $("#requests").innerHTML = requests.map(r => {
    const gv = r.vaiTro === "giaovien";
    return `<div class="req-item">
      <div class="req-head"><b>${v(r.ten)}</b> <span class="chip ${gv ? "" : "ok"}">${gv ? "Giáo viên" : "Học viên"}</span>
        <span class="muted num">Gửi ${fmtDate(r.guiLuc)}</span></div>
      <div class="req-body">
        ${line("Gmail", r.gmail)}${line("Năm sinh", r.namSinh)}${line("Cơ sở", r.coso)}${line("Lớp vẽ", r.chuongTrinh)}
        ${line(gv ? "Điện thoại" : "SĐT của em", r.sdt)}${line("SĐT bố mẹ", r.sdtPh)}
        ${line("Trường", [r.truong, r.lopHoc].filter(Boolean).join(" · "))}${line("Nhà ở", r.khuVuc)}
        ${line("Mục tiêu", [r.khoi, r.namThi, r.mucTieu].filter(Boolean).join(" · "))}${line("Lời nhắn", r.ghiChu)}
      </div>
      <div class="ctas" style="margin-top:12px"><button class="btn primary" data-ok="${esc(r.id)}">${gv ? "Duyệt giáo viên" : "Duyệt học viên"}</button>
        <button class="btn" data-no="${esc(r.id)}">Từ chối</button></div></div>`;
  }).join("");
  $$("#requests [data-ok]").forEach(b => b.onclick = async () => {
    const r = requests.find(x => x.id === b.dataset.ok); if (!r) return;
    requests = requests.filter(x => x.id !== r.id); renderRequests();
    const { id, vaiTro, ...data } = r;
    const batch = writeBatch(db);
    if (vaiTro === "giaovien") batch.set(doc(db, "giaovien", r.id), { ten: r.ten, gmail: r.gmail, sdt: r.sdt || "", coso: r.coso || "", ghiChu: r.ghiChu || "", duyetLuc: Date.now() });
    else batch.set(doc(db, "hocvien", r.id), { ...data, lop: r.chuongTrinh || r.lop || "", duyetLuc: Date.now() });
    batch.delete(doc(db, "yeucau", r.id));
    toast(`Đã duyệt ${r.ten}. ${vaiTro === "giaovien" ? "Thầy/cô" : "Em"} ấy mở lại web là vào được.`);
    timed("Duyệt " + r.ten, batch.commit()).catch(() => { requests.unshift(r); renderRequests(); toast("Chưa duyệt được " + r.ten + ". Kiểm tra mạng rồi bấm lại.", "err"); });
  });
  $$("#requests [data-no]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "yeucau", b.dataset.no)), "Bấm lần nữa để từ chối"));
}
function renderRoster() {
  if (!roster.length) { $("#roster").innerHTML = `<tbody><tr><td class="muted">Chưa có học viên nào được duyệt.</td></tr></tbody>`; return; }
  const total = lessons.length;
  $("#roster").innerHTML = `<thead><tr><th>Họ tên</th><th>Gmail</th><th>Chương trình</th><th>Cơ sở</th><th>Điện thoại</th><th>Đã học</th><th>Ngày duyệt</th><th></th></tr></thead><tbody>` +
    roster.map(r => {
      const p = progressAll[r.id]; const n = p && p.bai ? lessons.filter(l => p.bai[l.id]).length : 0;
      return `<tr><td>${esc(r.ten)}${r.namSinh ? `<br><span class="muted num">Sinh năm ${esc(r.namSinh)}</span>` : ""}</td><td>${esc(r.gmail)}</td><td>${esc(r.chuongTrinh || r.lop)}</td><td>${esc(r.coso)}</td>
        <td class="num">${r.sdt ? "HV: " + esc(r.sdt) : ""}${r.sdtPh ? "<br>PH: " + esc(r.sdtPh) : ""}</td>
        <td class="num">${n}/${total}</td><td class="num">${fmtDate(r.duyetLuc)}</td>
        <td><button class="btn small" data-rm="${esc(r.id)}">Thu hồi</button></td></tr>`;
    }).join("") + `</tbody>`;
  $$("#roster [data-rm]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "hocvien", b.dataset.rm)), "Bấm lần nữa để thu hồi"));
}

function renderTeachers() {
  if (!teachers.length) { $("#teachers").innerHTML = `<tbody><tr><td class="muted">Chưa có giáo viên nào. Quản lý luôn có toàn quyền.</td></tr></tbody>`; return; }
  $("#teachers").innerHTML = `<thead><tr><th>Họ tên</th><th>Gmail</th><th>Cơ sở</th><th>Điện thoại</th><th>Ngày duyệt</th><th></th></tr></thead><tbody>` +
    teachers.map(t => `<tr><td>${esc(t.ten)}</td><td>${esc(t.gmail)}</td><td>${esc(t.coso)}</td><td class="num">${esc(t.sdt)}</td>
      <td class="num">${fmtDate(t.duyetLuc)}</td><td><button class="btn small" data-rmgv="${esc(t.id)}">Thu hồi</button></td></tr>`).join("") + `</tbody>`;
  $$("#teachers [data-rmgv]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "giaovien", b.dataset.rmgv)), "Bấm lần nữa để thu hồi"));
}

function confirmButton(btn, act, ask = "Bấm lần nữa để xoá") {
  if (!btn) return;
  let armed = false, h; const label = btn.textContent;
  const disarm = () => { armed = false; btn.textContent = label; btn.classList.remove("armed"); };
  btn.onclick = () => {
    if (!armed) { armed = true; btn.textContent = ask; btn.classList.add("armed"); clearTimeout(h); h = setTimeout(disarm, 4000); return; }
    clearTimeout(h); disarm(); btn.disabled = true; btn.textContent = "Đang xử lý…";
    timed(label, act()).then(() => toast("Xong."), () => { btn.disabled = false; btn.textContent = label; toast("Chưa làm được. Kiểm tra mạng rồi thử lại.", "err"); });
  };
}

/* ================= Điểm danh, tiến độ & dự báo khả năng đỗ ================= */
const pad2 = n => String(n).padStart(2, "0");
function todayVN() {
  const now = new Date(); const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
  return `${vn.getFullYear()}-${pad2(vn.getMonth() + 1)}-${pad2(vn.getDate())}`;
}
function caMacDinh() {
  const now = new Date(); const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
  const h = vn.getHours() + vn.getMinutes() / 60;
  return h < 12.5 ? "sang" : h < 17.75 ? "chieu" : "toi";
}
const soDiem = x => { const n = parseFloat(String(x ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
function khoiOf(hv) {
  const t = `${(hv && hv.khoi) || ""} ${(hv && (hv.chuongTrinh || hv.lop)) || ""}`;
  if (/kh[ốo]i\s*v/i.test(t)) return "Khối V";
  if (/kh[ốo]i\s*h|màu|cấp tốc/i.test(t)) return "Khối H";
  return "Cơ bản";
}
const ngayVN = iso => { const [y, m, d] = String(iso).split("-"); return `${Number(d)}/${Number(m)}/${y}`; };
const nf1 = n => Number(n).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
// Gộp điểm danh + điểm bài tập thành các chỉ số, khả năng đỗ ước tính và lời khuyên.
function thongKe(dd, hv, fb) {
  const today = todayVN(), cach = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
  const keys = Object.keys(dd || {}).filter(k => /^\d{4}-\d{2}-\d{2}_/.test(k) && cach(k.slice(0, 10), today) >= 0).sort();
  const dem = (arr, v) => arr.filter(k => dd[k] === v).length;
  const co = dem(keys, "co"), vang = dem(keys, "vang"), phep = dem(keys, "phep");
  const k28 = keys.filter(k => cach(k.slice(0, 10), today) < 28), k30 = keys.filter(k => cach(k.slice(0, 10), today) < 30);
  const trackedDays = keys.length ? Math.min(28, cach(keys[0].slice(0, 10), today) + 1) : 0;
  const span = Math.max(7, trackedDays);
  const co28 = dem(k28, "co"), records28 = k28.length;
  const perWeek = co28 / (span / 7);
  const c30 = dem(k30, "co"), v30 = dem(k30, "vang"), att = c30 + v30 ? c30 / (c30 + v30) : null;
  let streak = 0; for (let i = keys.length - 1; i >= 0; i--) { if (dd[keys[i]] === "vang") streak++; else if (dd[keys[i]] === "phep") continue; else break; }
  const khoi = khoiOf(hv), gioCan = MUC_TIEU.gioCan[khoi] || 300, ngayThi = MUC_TIEU.ngayThi[khoi];
  const daysLeft = Math.max(0, daysUntil(ngayThi)), weeksLeft = Math.max(daysLeft / 7, 0.5);
  const gio = co * MUC_TIEU.gioMoiBuoi;
  const need = Math.max(0, (gioCan - gio) / MUC_TIEU.gioMoiBuoi / weeksLeft);
  // Lịch thực tế dùng số buổi nguyên, đồng thời giữ mức tối thiểu đã cấu hình của lớp.
  const suggested = daysLeft > 0 && need > 0 ? Math.ceil(Math.max(need, MUC_TIEU.buoiToiThieu)) : null;
  const projected = gio + perWeek * MUC_TIEU.gioMoiBuoi * weeksLeft;
  const readiness = Math.min(1, projected / gioCan);
  const ds = Object.values(fb || {}).filter(x => x && soDiem(x.diem) !== null).sort((a, b) => (b.luc || 0) - (a.luc || 0)).slice(0, 6).map(x => soDiem(x.diem));
  const avg = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
  const skill = avg === null ? 0.55 : Math.max(0, Math.min(1, (avg - 5) / (MUC_TIEU.diemDat + 1 - 5)));
  const pass = keys.length ? Math.max(5, Math.min(95, Math.round(100 * (0.45 * readiness + 0.35 * skill + 0.2 * (att === null ? 0.6 : att))))) : null;
  let muc = "ok";
  if (keys.length && (streak >= 2 || perWeek < MUC_TIEU.buoiToiThieu * 0.67)) muc = "bad";
  else if (keys.length && (perWeek + 0.01 < need || perWeek < MUC_TIEU.buoiToiThieu || (avg !== null && avg < MUC_TIEU.diemDat))) muc = "warn";
  const loi = [];
  if (!keys.length) loi.push(["info", "Chưa có buổi điểm danh nào. Thầy cô sẽ điểm danh sau mỗi buổi học, tiến độ của em hiện ở đây."]);
  if (streak >= 2) loi.push(["bad", `Em đã vắng ${streak} buổi liên tiếp. Đi học lại ngay buổi tới để không bị hổng bài nhé.`]);
  if (keys.length && !records28) loi.push(["info", "Chưa có điểm danh trong 4 tuần gần đây. Nhờ thầy cô kiểm tra lại trước khi đánh giá số buổi đi học."]);
  if (keys.length && daysLeft === 0) loi.push(["info", "Đã đến ngày thi mục tiêu. Nhờ thầy cô cập nhật lịch học tiếp theo."]);
  else if (keys.length && need === 0) loi.push(["ok", "Em đã đủ số giờ học mục tiêu. Tiếp tục luyện bài theo hướng dẫn của thầy cô."]);
  else if (records28) loi.push([perWeek + 0.01 < suggested ? "warn" : "ok", `4 tuần qua đã ghi nhận em đi ${co28} buổi. Lịch học đề xuất: ${suggested} buổi/tuần, dựa trên số giờ còn thiếu và mức tối thiểu của lớp. Trao đổi với thầy cô để sắp xếp lịch phù hợp.`]);
  if (avg !== null && avg < MUC_TIEU.diemDat) loi.push(["warn", `Điểm bài tập gần đây trung bình ${nf1(avg)}, mục tiêu ${nf1(MUC_TIEU.diemDat)}. Làm đủ bài về nhà và hỏi thầy chỗ chưa vững.`]);
  else if (avg !== null) loi.push(["ok", `Điểm bài tập trung bình ${nf1(avg)} — vượt mục tiêu ${nf1(MUC_TIEU.diemDat)}. Tiếp tục luyện đề theo thời gian thi thật.`]);
  if (daysLeft <= 60 && daysLeft > 0) loi.push(["warn", `Chỉ còn ${daysLeft} ngày. Giai đoạn nước rút: mỗi buổi nghỉ là mất một bài luyện đề.`]);
  return { keys, co, vang, phep, co28, records28, trackedDays, span, perWeek, att, streak, khoi, gioCan, ngayThi, daysLeft, gio, need, suggested, readiness, avg, pass, muc, loi };
}
const MUC_TEN = { ok: "Tốt", warn: "Cần nhắc", bad: "Báo động" };
function lichHocDeXuat(t) {
  if (!t.keys.length) return "Chưa đủ dữ liệu để đề xuất lịch";
  if (!t.daysLeft) return "Cần cập nhật lịch sau ngày thi mục tiêu";
  if (!t.need) return "Đã đủ giờ mục tiêu · tiếp tục luyện bài";
  return `Đề xuất: ${t.suggested} buổi/tuần`;
}
const timTen = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/\s+/g, " ");
function hocVienDiemDanh(cs, search, sort) {
  const words = timTen(search).split(" ").filter(Boolean);
  return roster.filter(r => (!cs || String(r.coso || "").includes(cs)) && words.every(w => timTen(r.ten).includes(w)))
    .map(r => ({ r, t: thongKe(diemdanhAll[r.id], r, feedbackAll[r.id]) }))
    .sort((a, b) => {
      const name = String(a.r.ten || "").localeCompare(String(b.r.ten || ""), "vi");
      if (sort === "least" || sort === "most") return Number(!a.t.records28) - Number(!b.t.records28)
        || (sort === "least" ? a.t.co28 - b.t.co28 : b.t.co28 - a.t.co28) || name;
      if (sort === "attention") return Number(!a.t.records28) - Number(!b.t.records28)
        || ({ bad: 0, warn: 1, ok: 2 }[a.t.muc] - { bad: 0, warn: 1, ok: 2 }[b.t.muc]) || a.t.co28 - b.t.co28 || name;
      return name;
    });
}
function tinNhanPhuHuynh(r, t) {
  const start = new Date(Date.parse(todayVN()) - 27 * 864e5).toISOString().slice(0, 10);
  const intro = `Lớp Vẽ Dreamers gửi phụ huynh em ${r.ten}: `;
  if (!t.records28) return intro + `Lớp chưa có dữ liệu điểm danh của em trong 4 tuần qua (${ngayVN(start)}–${ngayVN(todayVN())}), nên chưa kết luận được số buổi em đi học. Lớp sẽ kiểm tra lại và trao đổi với bố mẹ ạ.`;
  return intro + `Trong 4 tuần qua (${ngayVN(start)}–${ngayVN(todayVN())}), lớp ghi nhận em đi học ${t.co28} buổi.`
    + (t.trackedDays < 28 ? ` Dữ liệu mới được theo dõi trong ${t.trackedDays} ngày gần đây.` : "")
    + (t.streak >= 2 ? ` Em đã vắng ${t.streak} buổi liên tiếp không tính các buổi nghỉ phép.` : "")
    + (t.daysLeft > 0 ? ` Còn ${t.daysLeft} ngày đến ngày thi mục tiêu (${ngayVN(t.ngayThi)}).` : " Đã đến ngày thi mục tiêu; thầy cô sẽ cập nhật lịch học tiếp theo.")
    + (t.suggested !== null ? ` Lớp đề xuất em học ${t.suggested} buổi/tuần để bổ sung số giờ còn thiếu và duy trì việc luyện tập.`
      : t.need === 0 ? " Em đã đủ số giờ học mục tiêu và tiếp tục luyện bài theo hướng dẫn của thầy cô." : "")
    + (t.avg !== null ? ` Điểm bài tập gần đây trung bình ${nf1(t.avg)}/10.` : "")
    + " Bố mẹ cùng lớp trao đổi để sắp xếp lịch học phù hợp cho em nhé. Cảm ơn bố mẹ!";
}
function renderMyProg() {
  const box = $("#my-prog"); if (!box) return;
  box.hidden = isTeacher || !approved;
  if (box.hidden) return;
  const t = thongKe(myDiemdanh, myHv, myFeedback);
  const pct = Math.min(100, Math.round(t.gio / t.gioCan * 100));
  const tuan = [...Array(8)].map((_, i) => 7 - i); // 8 tuần gần nhất
  const today = todayVN();
  const dots = tuan.map(w => {
    const ks = t.keys.filter(k => { const d = (Date.parse(today) - Date.parse(k.slice(0, 10))) / 864e5; return d >= w * 7 && d < (w + 1) * 7; });
    return `<div class="wk"><div>${ks.map(k => `<i class="${myDiemdanh[k]}" title="${ngayVN(k.slice(0, 10))}"></i>`).join("") || "<i class='none'></i>"}</div><span>${w === 0 ? "Tuần này" : w + "t trước"}</span></div>`;
  }).join("");
  box.innerHTML = theRank(tinhRank(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName))) + `
    <div class="mp-head">
      <div><p class="eyebrow">Tiến độ của em · ${esc(t.khoi)}</p>
        <h3>Còn <b class="num">${t.daysLeft}</b> ngày đến kỳ thi <span class="muted">(${ngayVN(t.ngayThi)})</span></h3></div>
      <div class="mp-gauge ${t.muc}" style="--p:${t.pass ?? 0}"><b class="num">${t.pass === null ? "–" : t.pass + "%"}</b><span>khả năng đỗ<br>ước tính</span></div>
    </div>
    <div class="mp-stats">
      <div><span>Giờ đã học</span><b class="num">${t.gio}<small>/${t.gioCan} giờ</small></b><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div><span>Đã đi học trong 4 tuần</span><b class="num">${t.records28 ? t.co28 + " buổi" : "–"}</b><div class="mp-study-plan">${t.records28 ? esc(lichHocDeXuat(t)) : "Chưa có điểm danh trong 4 tuần"}</div></div>
      <div><span>Chuyên cần 30 ngày</span><b class="num">${t.att === null ? "–" : Math.round(t.att * 100) + "%"}</b></div>
      <div><span>Điểm bài tập TB</span><b class="num">${t.avg === null ? "–" : nf1(t.avg)}<small> · mục tiêu ${nf1(MUC_TIEU.diemDat)}</small></b></div>
    </div>
    <ul class="mp-advice">${t.loi.map(([k, x]) => `<li class="${k}">${esc(x)}</li>`).join("")}</ul>
    <div class="mp-dots" aria-label="Điểm danh 8 tuần gần nhất">${dots}</div>
    <p class="mp-note">Chấm xanh: có mặt · đỏ: vắng · xám: nghỉ phép. Khả năng đỗ là ước tính từ chuyên cần, giờ học và điểm bài tập, tự cập nhật sau mỗi buổi — không phải cam kết.</p>`;
}
function renderAttend() {
  if (!isTeacher || !$("#dd-list")) return;
  const ngay = $("#dd-ngay").value || todayVN(), ca = $("#dd-ca").value || caMacDinh(), cs = $("#dd-cs").value;
  const key = `${ngay}_${ca}`;
  const search = $("#dd-search").value;
  const rows = hocVienDiemDanh(cs, search, $("#dd-sort").value);
  const ds = rows.map(x => x.r);
  const val = r => (diemdanhAll[r.id] || {})[key];
  const n = v => ds.filter(r => val(r) === v).length;
  $("#dd-sum").innerHTML = `Đang hiển thị <b>${ds.length}</b>/${roster.length} học viên` + (ds.length ? ` · Ca đã chọn: <b>${n("co")}</b> có mặt · <b>${n("vang")}</b> vắng · <b>${n("phep")}</b> phép · <b>${ds.length - n("co") - n("vang") - n("phep")}</b> chưa điểm danh` : "");
  const empty = roster.length ? "Không tìm thấy học viên phù hợp. Thử đổi tên tìm kiếm hoặc cơ sở." : "Chưa có học viên nào được duyệt.";
  $("#dd-list").innerHTML = rows.length ? rows.map(({ r, t }) => `<li><div><b>${esc(r.ten)}</b> ${(t2 => huyHieu(t2.r, t2.i, "xs"))(tinhRank(diemdanhAll[r.id], progressAll[r.id], feedbackAll[r.id], r.ten))}<span class="muted">${esc(r.chuongTrinh || r.lop || "")}${r.coso ? " · " + esc(r.coso) : ""}</span><span class="dd-history">${t.records28 ? `Đã đi ${t.co28} buổi trong 4 tuần` : "Chưa có điểm danh trong 4 tuần"}</span></div>
    <div class="seg" role="group" aria-label="Điểm danh ${esc(r.ten)}">${[["co", "Có mặt"], ["vang", "Vắng"], ["phep", "Phép"]].map(([v, t]) =>
      `<button type="button" class="${v}" data-dd="${esc(r.id)}" data-v="${v}" aria-pressed="${val(r) === v}">${t}</button>`).join("")}</div></li>`).join("")
    : `<li class="muted">${empty}</li>`;
  $$("#dd-list [data-dd]").forEach(b => b.onclick = () => ghiDiemDanh([b.dataset.dd], key, b.dataset.v));
  // Bảng theo dõi chuyên cần
  $("#dd-watch").innerHTML = rows.length ? `<div class="dw-wrap"><table class="dw" aria-describedby="dd-watch-note"><thead><tr><th>Học viên</th><th>Số buổi &amp; lịch đề xuất</th><th>Vắng liền</th><th>Giờ học</th><th>Dự báo đỗ</th><th></th></tr></thead><tbody>${rows.map(({ r, t }) => `
      <tr class="${t.muc}"><td><b>${esc(r.ten)}</b><br><span class="muted">${esc(t.khoi)} · thi ${ngayVN(t.ngayThi)}</span></td>
      <td class="num dw-study"><b>${t.records28 ? `Đã đi: ${t.co28} buổi / 4 tuần` : "Chưa có điểm danh trong 4 tuần"}</b>
        ${t.records28 && t.trackedDays < 28 ? `<span class="muted">Mới theo dõi ${t.trackedDays} ngày</span>` : ""}
        <span>${esc(lichHocDeXuat(t))}</span></td>
      <td class="num">${t.streak || "–"}</td>
      <td class="num">${t.gio}/${t.gioCan}</td>
      <td><span class="pill ${t.muc}">${t.pass === null ? "Chưa có dữ liệu" : t.pass + "% · " + MUC_TEN[t.muc]}</span></td>
      <td><button type="button" class="btn small" data-msg="${esc(r.id)}">Chép tin nhắn</button></td></tr>`).join("")}</tbody></table></div>`
    : `<p class="muted">${empty}</p>`;
  $$("#dd-watch [data-msg]").forEach(b => b.onclick = () => {
    const x = rows.find(o => o.r.id === b.dataset.msg); if (!x) return;
    const { r, t } = x;
    const msg = tinNhanPhuHuynh(r, t);
    const hien = () => { // máy không cho chép tự động: hiện sẵn tin nhắn để bấm giữ chép
      $$("#dd-watch .dd-msg-row").forEach(row => row.remove());
      const ta = document.createElement("textarea"); ta.id = "dd-msg"; ta.className = "dd-msg"; ta.readOnly = true;
      ta.setAttribute("aria-label", `Tin nhắn phụ huynh em ${r.ten}`);
      b.closest("tr").after(Object.assign(document.createElement("tr"), { className: "dd-msg-row" }));
      const row = b.closest("tr").nextElementSibling; const td = document.createElement("td"); td.colSpan = 6; td.appendChild(ta); row.appendChild(td);
      ta.value = msg; ta.focus(); ta.select(); toast("Tin nhắn hiện bên dưới — bấm giữ để sao chép.");
    };
    try { navigator.clipboard.writeText(msg).then(() => toast("Đã chép tin nhắn. Dán vào Zalo gửi phụ huynh."), hien); } catch (e) { hien(); }
  });
}
function ghiDiemDanh(ids, key, v) {
  const cu = ids.map(id => [id, (diemdanhAll[id] || {})[key]]);
  ids.forEach(id => { diemdanhAll[id] = { ...(diemdanhAll[id] || {}), [key]: v }; });
  renderAttend();
  const batch = writeBatch(db);
  ids.forEach(id => batch.set(doc(db, "diemdanh", id), { [key]: v }, { merge: true }));
  timed("Điểm danh", batch.commit()).catch(() => {
    cu.forEach(([id, old]) => { const o = { ...(diemdanhAll[id] || {}) }; if (old) o[key] = old; else delete o[key]; diemdanhAll[id] = o; });
    renderAttend(); toast("Chưa lưu được điểm danh. Kiểm tra mạng rồi bấm lại.", "err");
  });
}
(function setupDiemDanh() {
  $("#dd-ngay").value = todayVN();
  $("#dd-ca").innerHTML = CA_HOC.map(c => `<option value="${esc(c.ma)}">${esc(c.ten)} ${esc(c.gio)}</option>`).join("");
  $("#dd-ca").value = caMacDinh();
  ["#dd-ngay", "#dd-ca", "#dd-cs", "#dd-sort"].forEach(id => $(id).onchange = renderAttend);
  $("#dd-search").oninput = renderAttend;
})();

/* ================= Khu Tài khoản: thanh công cụ + ô đi nhanh ================= */
const canLearnNow = () => !!user && !needVerify && (approved || isTeacher);
function renderAccNav() {
  const can = { learn: canLearnNow(), teacher: canLearnNow() && isTeacher, admin: canLearnNow() && isAdmin };
  let shown = 0;
  $$("#acc-nav [data-acc]").forEach(a => { const ok = !a.dataset.can || can[a.dataset.can]; a.hidden = !ok; if (ok) shown++; });
  const page = $("#acc-nav").dataset.page || "home";
  $("#acc-nav").hidden = page === "home" || shown < 2;
}
function updBadges() {
  const tin = lvUnreadMsgs(), tb = lvUnreadTB(), viec = lvMyOpenTasks();
  const set = (id, n) => { const el = $(id); if (el) { el.textContent = n > 99 ? "99+" : n; el.hidden = !n; } };
  set("#lv-n-tin", tin); set("#lv-n-tb", tb); set("#lv-n-viec", viec);
  set("#acc-lv-n", tin + tb + viec); set("#acc-duyet-n", isAdmin ? reqCount : 0);
  set("#nav-req", tin + tb + viec + (isAdmin ? reqCount : 0));
  renderTiles();
}
function renderTiles() {
  const box = $("#acc-tiles"); if (!box) return;
  const show = canLearnNow();
  box.hidden = !show; if (!show) { box.innerHTML = ""; return; }
  const today = todayVN();
  const tin = lvUnreadMsgs(), tb = lvUnreadTB(), viec = lvMyOpenTasks();
  const daHoc = Object.values(myProgress.bai || {}).filter(Boolean).length;
  const moBai = homework.filter(h => !h.han || h.han >= today).length;
  const tiles = [
    { href: "#lam-viec", t: "Làm việc", n: tin + tb + viec, d: tin + tb + viec ? [tin && `${tin} tin nhắn mới`, tb && `${tb} thông báo mới`, viec && `${viec} việc chưa xong`].filter(Boolean).join(" · ") : (isTeacher ? "Nhắn tin, thông báo, giao việc" : "Nhắn thầy cô, xem thông báo của lớp") },
    { href: "#giao-trinh", t: "Giáo trình", d: isTeacher ? `${lessons.length} bài trong giáo trình` : `Đã học ${daHoc}/${lessons.length} bài` },
    { href: "#bai-tap", t: "Bài tập", d: moBai ? `${moBai} bài đang mở` : "Chưa có bài đang mở" },
    isTeacher && { href: "#diem-danh", t: "Điểm danh", d: "Điểm danh buổi hôm nay, theo dõi chuyên cần" },
    isAdmin && { href: "#duyet", t: "Duyệt học viên", n: reqCount, d: reqCount ? `${reqCount} yêu cầu đang chờ` : "Không có yêu cầu đang chờ" },
  ].filter(Boolean);
  box.innerHTML = (!isTeacher ? theRank(tinhRank(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName))) : "") + tiles.map(x => `<a class="acc-tile" href="${x.href}"><b>${x.t}${x.n ? ` <span class="nbadge num">${x.n}</span>` : ""}</b><span class="muted">${esc(x.d)}</span><i aria-hidden="true">→</i></a>`).join("");
}

/* ================= Làm việc: tin nhắn · thông báo · việc cần làm ================= */
const vtCua = () => isAdmin ? "ql" : isTeacher ? "gv" : "hv";
const VT_TEN = { ql: "Quản lý", gv: "Giáo viên", hv: "Học viên" };
const tenToi = () => (user && user.displayName) || (myHv && myHv.ten) || (mail || "").split("@")[0];
const tbSeenKey = () => "lvkv-tb-xem-" + mail;
function lvUnreadTB() {
  if (!mail) return 0;
  const seen = store.get(tbSeenKey(), 0);
  return lvTB.filter(t => t.luc > seen && t.tacGia !== mail).length;
}
function lvMyOpenTasks() { return isTeacher && !isAdmin ? lvCV.filter(c => !c.xong && (c.cho === mail || c.cho === "tatca")).length : 0; }
// Kênh của người khác mà phía lớp (giáo viên/quản lý) chưa đọc; kênh của chính mình mà mình chưa đọc.
const kenhChuaDocLop = k => k.cuoiTu === k.id && (k.capNhat || 0) > (k.xemLop || 0);
const kenhChuaDocChu = k => !!k && k.cuoiTu && k.cuoiTu !== mail && (k.capNhat || 0) > (k.xemHV || 0);
function lvUnreadMsgs() {
  if (!mail) return 0;
  let n = kenhChuaDocChu(lvMine) ? 1 : 0;
  if (isTeacher) n += lvKenh.filter(k => k.id !== mail && (isAdmin || k.vaiTro === "hocvien") && kenhChuaDocLop(k)).length;
  return n;
}
function lvReset() {
  lvTB = []; lvCV = []; lvKenh = []; lvMine = null; lvErr = ""; lvOpen = ""; lvMsgs = []; lvPending = [];
  if (lvMsgUnsub) { lvMsgUnsub(); lvMsgUnsub = null; }
  lvTab = "tin"; chatFilter = "hocvien"; cvView = "mo";
  $$("#lv-tabs [data-lv]").forEach(b => b.setAttribute("aria-selected", b.dataset.lv === "tin"));
  ["tin", "tb", "viec"].forEach(k => $("#lv-" + k).hidden = k !== "tin");
  $$("#chat-filter [data-cf]").forEach(b => b.setAttribute("aria-selected", b.dataset.cf === "hocvien"));
  $$("#cv-filter [data-cv]").forEach(b => b.setAttribute("aria-selected", b.dataset.cv === "mo"));
}
// Lắng nghe dữ liệu khu Làm việc. Lỗi quyền (luật cũ) thì báo trong trang, không làm phiền chỗ khác.
function listenLV(q, fn) {
  unsubs.push(onSnapshot(q, fn, e => { lvErr = (e && e.code) || "loi"; renderLV(); }));
}
function lvStart() {
  if (isTeacher) listenLV(collection(db, "thongbao"), snap => { lvTB = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  else listenLV(query(collection(db, "thongbao"), where("gui", "==", "tatca")), snap => { lvTB = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (isTeacher) listenLV(collection(db, "congviec"), snap => { lvCV = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (isAdmin) listenLV(collection(db, "traodoi"), snap => { lvKenh = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  else if (isTeacher) listenLV(query(collection(db, "traodoi"), where("vaiTro", "==", "hocvien")), snap => { lvKenh = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (!isAdmin) listenLV(doc(db, "traodoi", mail), d => { lvMine = d.exists() ? { id: d.id, ...d.data() } : null; renderLV(); });
  if (!isTeacher) lvOpen = mail; // học viên: chỉ có 1 cuộc trò chuyện với thầy cô
}
function lvOnShow() {
  if (!canLearnNow()) return;
  if (!isTeacher && !lvOpen) lvOpen = mail;
  if (lvOpen && !lvMsgUnsub && db) moKenh(lvOpen, false);
  renderLV();
}
function setLvTab(t) {
  lvTab = t;
  $$("#lv-tabs [data-lv]").forEach(b => b.setAttribute("aria-selected", b.dataset.lv === t));
  ["tin", "tb", "viec"].forEach(k => $("#lv-" + k).hidden = k !== t);
  if (t === "tb" && mail) { store.set(tbSeenKey(), Date.now()); }
  renderLV();
}
$$("#lv-tabs [data-lv]").forEach(b => b.onclick = () => setLvTab(b.dataset.lv));
$$("#chat-filter [data-cf]").forEach(b => b.onclick = () => { chatFilter = b.dataset.cf; $$("#chat-filter [data-cf]").forEach(x => x.setAttribute("aria-selected", x === b)); renderChatList(); });
$$("#cv-filter [data-cv]").forEach(b => b.onclick = () => { cvView = b.dataset.cv; $$("#cv-filter [data-cv]").forEach(x => x.setAttribute("aria-selected", x === b)); renderViec(); });

function renderLV() {
  if (!$("#lv-body")) return;
  $("#lv-intro").textContent = isAdmin ? "Nhắn tin với học viên và giáo viên, đăng thông báo, giao việc cho giáo viên."
    : isTeacher ? "Nhắn tin với học viên và quản lý, xem thông báo và việc được giao."
    : "Nhắn tin riêng với thầy cô và xem thông báo của lớp.";
  $("#tb-gui").disabled = !isAdmin; if (!isAdmin) $("#tb-gui").value = "tatca";
  let warn = $("#lv-warn");
  if (lvErr) {
    if (!warn) { warn = document.createElement("p"); warn.id = "lv-warn"; warn.className = "sv-status bad"; $("#lv-body").prepend(warn); }
    warn.innerHTML = lvErr === "permission-denied"
      ? (isAdmin ? `<b>⚠ Khu Làm việc cần luật bảo mật mới.</b> Thầy vào trang <a href="#duyet">Duyệt</a>, bấm "Sao chép luật mới" rồi dán vào Firebase như lần trước.`
                 : "Khu Làm việc đang được thầy cập nhật, em quay lại sau nhé.")
      : "Mạng chập chờn, chưa tải được tin nhắn. Đang thử lại…";
    warn.hidden = false;
  } else if (warn) warn.hidden = true;
  updBadges();
  if ($("#v-lam-viec").hidden) return;
  if (lvTab === "tb" && mail) store.set(tbSeenKey(), Date.now());
  renderChatList(); renderChat(); renderTB(); renderViec();
}

/* ----- Tin nhắn ----- */
function tenKenh(k) {
  if (!isTeacher) return "Thầy cô Dreamers";
  if (k === mail) return "Quản lý lớp";
  const m = lvKenh.find(x => x.id === k), r = roster.find(x => x.id === k), g = teachers.find(x => x.id === k);
  return (m && m.ten) || (r && r.ten) || (g && g.ten) || k;
}
function renderChatList() {
  const list = $("#chat-list"), ul = $("#chat-threads");
  $("#v-lam-viec").classList.toggle("hv-chat", !isTeacher);
  if (!isTeacher) { list.classList.add("an"); return; }
  const vtLoc = isAdmin ? chatFilter : "hocvien";
  let ks = lvKenh.filter(k => k.id !== mail && (k.vaiTro || "hocvien") === vtLoc).sort((a, b) => (b.capNhat || 0) - (a.capNhat || 0));
  if (!isAdmin) ks = [{ id: mail, ten: "Quản lý lớp", vaiTro: "giaovien", ...(lvMine || {}), _mine: true }].concat(ks);
  ul.innerHTML = ks.length ? ks.map(k => {
    const unread = k._mine ? kenhChuaDocChu(lvMine) : kenhChuaDocLop(k);
    return `<li><button type="button" class="thread${k.id === lvOpen ? " on" : ""}${unread ? " moi" : ""}" data-k="${esc(k.id)}">
      <span class="t-ava">${esc(initials(k._mine ? "Quản lý" : tenKenh(k.id)))}</span>
      <span class="t-txt"><b>${esc(k._mine ? "Quản lý lớp" : tenKenh(k.id))}</b><span class="muted">${esc(k.cuoi || (k._mine ? "Nhắn riêng cho quản lý" : ""))}</span></span>
      ${k.capNhat ? `<span class="t-time num">${esc(gioNgan(k.capNhat))}</span>` : ""}</button></li>`;
  }).join("") : `<li class="muted t-empty">Chưa có cuộc trò chuyện nào. Chọn học viên ở ô phía trên để nhắn.</li>`;
  $$("#chat-threads [data-k]").forEach(b => b.onclick = () => moKenh(b.dataset.k, true));
  // Ô "Nhắn tin mới cho…": những người chưa có cuộc trò chuyện
  const co = new Set(lvKenh.map(k => k.id));
  const nguoi = (vtLoc === "giaovien" ? teachers : roster).filter(x => !co.has(x.id) && x.id !== mail);
  const sel = $("#chat-pick"), cur = sel.value;
  sel.innerHTML = `<option value="">+ Nhắn tin mới cho ${vtLoc === "giaovien" ? "giáo viên" : "học viên"}…</option>` + nguoi.map(x => `<option value="${esc(x.id)}">${esc(x.ten || x.id)}</option>`).join("");
  sel.value = nguoi.some(x => x.id === cur) ? cur : "";
  list.classList.toggle("an", !!lvOpen);
}
$("#chat-pick").onchange = e => { const k = e.target.value; if (k) { e.target.value = ""; moKenh(k, true); } };
$("#chat-back").onclick = () => { lvOpen = ""; if (lvMsgUnsub) { lvMsgUnsub(); lvMsgUnsub = null; } lvMsgs = []; renderLV(); };
function gioNgan(t) {
  const d = new Date(t), now = new Date();
  return d.toDateString() === now.toDateString() ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function moKenh(k, focus) {
  if (lvMsgUnsub) { lvMsgUnsub(); lvMsgUnsub = null; }
  lvOpen = k; lvMsgs = []; lvPending = [];
  lvMsgUnsub = onSnapshot(query(collection(db, `traodoi/${k}/tin`), orderBy("luc")), snap => {
    lvMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    lvPending = lvPending.filter(p => !lvMsgs.some(m => m.id === p.id));
    renderChat(); danhDauDaDoc();
  }, e => { lvErr = (e && e.code) || "loi"; renderLV(); });
  renderLV();
  if (focus) setTimeout(() => $("#chat-nd").focus({ preventScroll: true }), 0);
}
function metaKenh(k) { return k === mail ? lvMine : lvKenh.find(x => x.id === k) || null; }
function vaiTroKenh(k) {
  const m = metaKenh(k); if (m && m.vaiTro) return m.vaiTro;
  if (k === mail) return isTeacher ? "giaovien" : "hocvien";
  return teachers.some(t => t.id === k) ? "giaovien" : "hocvien";
}
// Đánh dấu đã đọc (chỉ ghi khi thật sự có tin mới, tránh ghi thừa)
function danhDauDaDoc() {
  if ($("#v-lam-viec").hidden || document.hidden || !lvOpen) return;
  const k = lvOpen, m = metaKenh(k); if (!m) return;
  const chu = k === mail;
  if (chu ? !kenhChuaDocChu(m) : !kenhChuaDocLop(m)) return;
  const now = Date.now();
  if (chu) m.xemHV = now; else m.xemLop = now;
  updBadges(); renderChatList();
  setDoc(doc(db, "traodoi", k), { vaiTro: vaiTroKenh(k), [chu ? "xemHV" : "xemLop"]: now }, { merge: true }).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) danhDauDaDoc(); });
function renderChat() {
  const pane = $("#chat-pane");
  pane.hidden = !lvOpen;
  if (!lvOpen) return;
  const k = lvOpen;
  $("#chat-ten").textContent = tenKenh(k);
  $("#chat-sub").textContent = !isTeacher ? "Tin nhắn riêng, chỉ thầy cô của lớp đọc được."
    : k === mail ? "Chỉ quản lý đọc được." : vaiTroKenh(k) === "giaovien" ? " · Giáo viên" : " · Học viên — giáo viên và quản lý cùng xem";
  $("#chat-back").hidden = !isTeacher;
  const all = lvMsgs.concat(lvPending);
  const box = $("#chat-msgs"), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.innerHTML = all.length ? all.map((m, i) => {
    const toi = m.tu === mail, prev = all[i - 1], nhom = prev && prev.tu === m.tu && m.luc - prev.luc < 300000;
    const ngay = !prev || new Date(prev.luc).toDateString() !== new Date(m.luc).toDateString();
    return `${ngay ? `<p class="m-day">${esc(new Date(m.luc).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }))}</p>` : ""}
      <div class="msg${toi ? " toi" : ""}${m._dang ? " dang" : ""}${m._loi ? " loi" : ""}">
        ${!toi && !nhom ? `<span class="m-who">${esc(m.ten || m.tu)}${m.vt && m.vt !== "hv" ? ` · ${VT_TEN[m.vt]}` : ""}</span>` : ""}
        <p>${esc(m.nd)}</p><span class="m-time num">${m._loi ? "Chưa gửi được" : m._dang ? "Đang gửi…" : esc(new Date(m.luc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))}</span></div>`;
  }).join("") : `<p class="muted m-empty">${!isTeacher ? "Em có câu hỏi về bài vẽ, lịch học hay xin nghỉ? Nhắn ở đây, thầy cô sẽ trả lời sớm." : "Chưa có tin nhắn. Gõ tin đầu tiên ở bên dưới."}</p>`;
  if (atBottom || all.length && all[all.length - 1].tu === mail) box.scrollTop = box.scrollHeight;
}
$("#chat-nd").addEventListener("input", e => { const t = e.target; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; });
$("#chat-nd").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer:fine)").matches) { e.preventDefault(); $("#f-chat").requestSubmit(); } });
$("#f-chat").addEventListener("submit", async e => {
  e.preventDefault();
  const nd = $("#chat-nd").value.trim(), k = lvOpen;
  if (!nd || !k || !db) return;
  if (nd.length > 1000) { toast("Tin nhắn dài quá, em chia làm 2 tin nhé.", "warn"); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7), luc = Date.now();
  const msg = { tu: mail, ten: tenToi(), vt: vtCua(), nd, luc };
  lvPending.push({ id, ...msg, _dang: true });
  $("#chat-nd").value = ""; $("#chat-nd").style.height = "auto"; renderChat();
  const chu = k === mail, meta = { vaiTro: vaiTroKenh(k), cuoi: nd.slice(0, 80), cuoiTu: mail, capNhat: luc, [chu ? "xemHV" : "xemLop"]: luc };
  if (chu) meta.ten = tenToi();
  else if (!metaKenh(k)) meta.ten = tenKenh(k);
  try {
    const b = writeBatch(db);
    b.set(doc(db, "traodoi", k), meta, { merge: true });
    b.set(doc(db, `traodoi/${k}/tin`, id), msg);
    await b.commit();
  } catch (err) {
    const p = lvPending.find(x => x.id === id); if (p) { p._dang = false; p._loi = true; }
    $("#chat-nd").value = nd; renderChat();
    toast(err && err.code === "permission-denied" ? "Chưa gửi được: máy chủ chưa cho phép (cần luật bảo mật mới)." : "Chưa gửi được, kiểm tra mạng rồi bấm Gửi lại.", "warn");
    lvPending = lvPending.filter(x => x.id !== id); setTimeout(renderChat, 2500);
  }
});

/* ----- Thông báo ----- */
function renderTB() {
  const list = lvTB.slice().sort((a, b) => b.luc - a.luc);
  $("#tb-list").innerHTML = list.length ? list.map(t => `<article class="tb${t.gui === "giaovien" ? " noibo" : ""}">
      <div class="tb-head">${t.gui === "giaovien" ? `<span class="chip line">Nội bộ giáo viên</span>` : ""}<b>${esc(t.tieuDe || "Thông báo")}</b>
        <span class="muted num">${esc(t.ten || "")} · ${esc(fmtDate(t.luc))}</span></div>
      <p>${esc(t.nd).replace(/\n/g, "<br>")}</p>
      ${isAdmin || t.tacGia === mail ? `<button type="button" class="btn small" data-xtb="${esc(t.id)}">Xoá</button>` : ""}</article>`).join("")
    : `<p class="muted empty">Chưa có thông báo nào.</p>`;
  $$("#tb-list [data-xtb]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "thongbao", b.dataset.xtb))));
}
$("#f-tb").addEventListener("submit", async e => {
  e.preventDefault();
  const nd = $("#tb-nd").value.trim(); if (!nd) return;
  const data = { tieuDe: $("#tb-tieude").value.trim().slice(0, 120), nd, gui: isAdmin ? $("#tb-gui").value : "tatca", tacGia: mail, ten: tenToi(), luc: Date.now() };
  const st = $("#tb-status"); st.textContent = "Đang đăng…";
  try { await addDoc(collection(db, "thongbao"), data); $("#f-tb").reset(); st.textContent = ""; toast("Đã đăng thông báo."); }
  catch (err) { st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho phép (cần dán luật bảo mật mới)." : "Chưa đăng được, kiểm tra mạng."; }
});

/* ----- Việc cần làm ----- */
function renderViec() {
  const sel = $("#cv-cho"), cur = sel.value;
  sel.innerHTML = `<option value="tatca">Tất cả giáo viên</option>` + teachers.map(t => `<option value="${esc(t.id)}">${esc(t.ten || t.id)}</option>`).join("");
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : "tatca";
  const today = todayVN();
  const mine = c => isAdmin || c.cho === mail || c.cho === "tatca";
  const list = lvCV.filter(c => mine(c) && (cvView === "xong" ? c.xong : !c.xong))
    .sort((a, b) => cvView === "xong" ? (b.xongLuc || 0) - (a.xongLuc || 0) : String(a.han || "9999").localeCompare(String(b.han || "9999")));
  $("#cv-list").innerHTML = list.length ? list.map(c => {
    const tre = !c.xong && c.han && c.han < today;
    return `<li class="cv${c.xong ? " xong" : ""}${tre ? " tre" : ""}">
      <label class="cv-chk"><input type="checkbox" data-cv="${esc(c.id)}" ${c.xong ? "checked" : ""}><span>${esc(c.viec)}</span></label>
      <span class="cv-meta muted">${c.cho === "tatca" ? "Tất cả giáo viên" : esc((teachers.find(t => t.id === c.cho) || {}).ten || (c.cho === mail ? "Thầy/cô" : c.cho))}
        ${c.han ? ` · ${tre ? "<b>Quá hạn</b> " : "Hạn "}${esc(new Date(c.han + "T00:00").toLocaleDateString("vi-VN"))}` : ""}
        ${c.xong ? ` · Xong bởi ${esc(c.xongBoi || "")}` : ""}</span>
      ${isAdmin ? `<button type="button" class="btn small" data-xcv="${esc(c.id)}">Xoá</button>` : ""}</li>`;
  }).join("") : `<li class="muted empty">${cvView === "xong" ? "Chưa có việc nào xong." : "Không còn việc nào, tốt lắm!"}</li>`;
  $$("#cv-list [data-cv]").forEach(cb => cb.onchange = () => {
    const c = lvCV.find(x => x.id === cb.dataset.cv); if (!c) return;
    const xong = cb.checked, old = { xong: c.xong, xongLuc: c.xongLuc, xongBoi: c.xongBoi };
    Object.assign(c, { xong, xongLuc: xong ? Date.now() : 0, xongBoi: xong ? tenToi() : "" }); renderViec(); updBadges();
    setDoc(doc(db, "congviec", c.id), { xong, xongLuc: c.xongLuc, xongBoi: c.xongBoi }, { merge: true })
      .then(() => toast(xong ? "Đã đánh dấu xong." : "Đã mở lại việc này."))
      .catch(() => { Object.assign(c, old); renderViec(); updBadges(); toast("Chưa lưu được, thử lại.", "warn"); });
  });
  $$("#cv-list [data-xcv]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "congviec", b.dataset.xcv))));
}
$("#f-viec").addEventListener("submit", async e => {
  e.preventDefault();
  const viec = $("#cv-viec").value.trim(); if (!viec) return;
  const st = $("#cv-status"); st.textContent = "Đang giao…";
  const cho = $("#cv-cho").value;
  try {
    await addDoc(collection(db, "congviec"), { viec, cho, choTen: cho === "tatca" ? "" : ((teachers.find(t => t.id === cho) || {}).ten || ""), han: $("#cv-han").value || "", xong: false, xongLuc: 0, xongBoi: "", tacGia: mail, luc: Date.now() });
    $("#f-viec").reset(); st.textContent = ""; toast("Đã giao việc.");
  } catch (err) { st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho phép (cần dán luật bảo mật mới)." : "Chưa giao được, kiểm tra mạng."; }
});

/* ---------- Đăng nhập ---------- */
function stopListeners() { unsubs.forEach(u => u()); unsubs = []; }
function listen(q, fn) {
  const t = performance.now(); let first = true;
  const name = q.path || (q._query && q._query.path && q._query.path.segments && q._query.path.segments.join("/")) || "dữ liệu";
  unsubs.push(onSnapshot(q, snap => { if (first) { first = false; mark("Tải " + name, t); } fn(snap); },
    e => { mark("✗ LỖI tải " + name + ": " + (e && e.code), t); serverIssue(e); }));
}

/* ---------- Nhớ phiên đăng nhập để trang hiện ngay, không phải chờ ---------- */
const SESSION_KEY = "lvkv-phien";
// Giáo trình + bài tập lần trước lưu trên máy: mở trang là thấy ngay, máy chủ trả về thì cập nhật.
const DATA_KEY = "lvkv-dulieu-";
let dataSaveT;
function saveData() {
  clearTimeout(dataSaveT);
  dataSaveT = setTimeout(() => { if (mail) store.set(DATA_KEY + mail, { lessons, homework, myProgress, myFeedback }); }, 300);
}
function loadData(m) {
  const d = store.get(DATA_KEY + m, null) || {};
  lessons = d.lessons || []; homework = d.homework || [];
  myProgress = d.myProgress || { bai: {}, baitap: {} }; myFeedback = d.myFeedback || {};
  return !!(d.lessons || d.homework);
}
const cachedSession = store.get(SESSION_KEY, null);
function saveSession(pending) {
  store.set(SESSION_KEY, user ? { mail, ten: user.displayName || "", anh: user.photoURL || "", isAdmin, isTeacher, approved,
    pending: pending ? { guiLuc: pending.guiLuc || Date.now() } : null } : null);
}
function showCachedSession() {
  if (!configured) return;
  const c = cachedSession;
  if (!c || !c.mail) { renderLocks("out"); renderAccount(false); return; }
  user = { displayName: c.ten, photoURL: c.anh, email: c.mail }; mail = c.mail;
  isAdmin = !!c.isAdmin; isTeacher = !!c.isTeacher; approved = !!c.approved;
  renderLocks(isTeacher || approved ? "ok" : "pending");
  renderAccount(c.pending || false);
  if ((isTeacher || approved) && loadData(c.mail)) { renderLessons(); renderHomework(); return; }
  $("#lesson").innerHTML = `<p class="muted">Đang tải giáo trình…</p>`;
  $("#hw-list").innerHTML = `<div class="empty">Đang tải bài tập…</div>`;
}

async function onUser(u) {
  mark(u ? "Khôi phục đăng nhập (" + (u.email || "") + ")" : "Khôi phục đăng nhập (chưa đăng nhập)");
  stopListeners();
  const prevMail = mail;
  user = u; mail = u ? String(u.email || "").toLowerCase() : "";
  isAdmin = false; isTeacher = false; approved = false; needVerify = false;
  roster = []; requests = []; teachers = []; progressAll = {}; feedbackAll = {};
  diemdanhAll = {}; myDiemdanh = {}; myHv = null; lvReset();
  if (prevMail && prevMail !== mail) try { localStorage.removeItem(DATA_KEY + prevMail); } catch (e) {} // máy dùng chung: xoá dữ liệu người trước
  loadData(mail);
  // Đổi người dùng thì xoá sạch form đăng ký, tránh gửi nhầm thông tin của người trước (máy dùng chung).
  if (prevMail !== mail) {
    homeworkCanceled = true; homeworkUpload?.cancel(); clearHomeworkFiles();
    $("#f-bt").reset(); $("#bt-status").textContent = ""; $("#bt-file-error").textContent = "";
    fillForm($("#f-bt"), store.get(homeworkDraftKey(), null));
    $("#f-reg").reset(); $("#rg-status").textContent = ""; applyRoleFields(); editingReq = false; regDraftFor = null;
    gradeOpen.clear(); Object.keys(gradeDraft).forEach(k => delete gradeDraft[k]);
  }
  pendingReq = null;
  if (!u) { saveSession(null); renderLocks("out"); renderAccount(false); return; }
  store.set("lvkv-gmail", mail); // lần sau mở máy này: Gmail điền sẵn ở mục Đăng nhập
  // Tạo tài khoản bằng mật khẩu: phải bấm link xác nhận trong Gmail trước (chống mạo danh Gmail người khác).
  if (!u.emailVerified) {
    needVerify = true; saveSession(null); renderLocks("pending"); renderAccount(false); watchVerify(); return;
  }
  const isAdminMail = mail === ADMIN_EMAIL.toLowerCase();
  // Hiện ngay, không chờ máy chủ: quản lý nhận ra từ Gmail; người mới hiện form đăng ký luôn.
  if (isAdminMail) {
    isAdmin = true; isTeacher = true; approved = false;
    saveSession(false); renderLocks("ok"); renderAccount(false);
  } else if (!(cachedSession && cachedSession.mail === mail)) {
    renderLocks("pending"); renderAccount(false);
  }
  const exists = async (col) => { try { return (await getDoc(doc(db, col, mail))).exists(); } catch (e) { return false; } };
  // Hỏi cả 4 thông tin cùng lúc thay vì lần lượt, để trang hiện nhanh hơn.
  const getData = async (col) => {
    try { const d = await getDoc(doc(db, col, mail)); return d.exists() ? (d.data() || {}) : null; }
    catch (e) { if (e && e.code !== "permission-denied") serverIssue(e); return null; }
  };
  const tr = performance.now();
  const [isAdm, gvDoc, hvDoc, ycDoc, tdDoc] = isAdminMail ? [true, null, null, null, null] : await Promise.all([
    exists("admins"), getData("giaovien"), getData("hocvien"), getData("yeucau"), getData("tiendo")
  ]);
  if (mail !== (u.email || "").toLowerCase() || user !== u) return; // người dùng đã đổi trong lúc chờ
  mark("Kiểm tra vai trò", tr);
  isAdmin = !!isAdm;
  isTeacher = isAdmin || !!gvDoc;
  approved = !isTeacher && !!hvDoc;
  myHv = hvDoc || null;
  let pending = !isTeacher && !approved && ycDoc ? ycDoc : false;
  // Phiếu lần trước bị máy chủ từ chối: tự gửi lại khi học viên mở web.
  const unsent = !isTeacher && !approved && !ycDoc ? store.get(UNSENT + mail, null) : null;
  if (unsent) {
    try {
      await setDoc(doc(db, "yeucau", mail), { ...unsent, guiLuc: Date.now() });
      store.set(UNSENT + mail, null); dropDraft("nhap-tk-" + mail);
      pending = unsent; guiEmailThongBao(unsent, "Phiếu này trước đó chưa lưu được, nay đã tự gửi lại thành công.");
      toast("Phiếu của em đã gửi được cho thầy.");
    } catch (e) { /* vẫn lỗi: để lần sau thử tiếp */ }
    if (mail !== (u.email || "").toLowerCase() || user !== u) return;
  }
  const canLearn = isTeacher || approved;
  saveSession(pending);
  renderLocks(canLearn ? "ok" : "pending");
  renderAccount(pending);
  // Theo dõi quyền theo thời gian thực: thầy vừa duyệt là màn hình học viên tự mở khoá,
  // bị thu hồi thì tự khoá — không phải bấm tải lại.
  const watchRole = (col, has) => unsubs.push(onSnapshot(doc(db, col, mail), d => {
    if (user !== u || d.exists() === has) return;
    if (!has) toast(col === "giaovien" ? "Quản lý đã duyệt thầy/cô làm giáo viên!" : "Thầy đã duyệt! Em vào học được rồi.");
    onUser(u);
  }, () => {}));
  if (!isAdmin) {
    if (isTeacher) watchRole("giaovien", true);
    else if (approved) watchRole("hocvien", true);
    else { watchRole("hocvien", false); watchRole("giaovien", false); }
  }
  if (!canLearn) {
    try { localStorage.removeItem(DATA_KEY + mail); } catch (e) {}
    lessons = []; homework = []; myFeedback = {};
    return;
  }

  if (!isTeacher) {
    if (tdDoc) myProgress = { bai: tdDoc.bai || {}, baitap: tdDoc.baitap || {} };
    listen(doc(db, "nhanxet", mail), d => { myFeedback = d.exists() ? d.data() : {}; renderHomework(); renderMyProg(); saveData(); });
    // Điểm danh của chính em (lỗi quyền thì im lặng, panel vẫn hiện hướng dẫn)
    unsubs.push(onSnapshot(doc(db, "diemdanh", mail), d => { myDiemdanh = d.exists() ? d.data() : {}; renderMyProg(); }, () => renderMyProg()));
    renderMyProg();
  }
  listen(query(collection(db, "giaotrinh"), orderBy("thutu")), snap => {
    lessons = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLessons(); if (isAdmin) renderRoster(); saveData(); renderTiles();
  });
  listen(query(collection(db, "baitap"), orderBy("han")), snap => {
    homework = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework(); saveData(); renderTiles();
  });
  if (isTeacher) {
    listen(query(collection(db, "hocvien"), orderBy("duyetLuc", "desc")), snap => {
      roster = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework(); if (isAdmin) renderRoster(); renderAttend(); renderLV();
    });
    listen(collection(db, "diemdanh"), snap => {
      diemdanhAll = {}; snap.docs.forEach(d => diemdanhAll[d.id] = d.data()); renderAttend();
    });
    listen(collection(db, "tiendo"), snap => {
      progressAll = {}; snap.docs.forEach(d => progressAll[d.id] = d.data()); renderHomework(); if (isAdmin) renderRoster();
    });
    listen(collection(db, "nhanxet"), snap => {
      feedbackAll = {}; snap.docs.forEach(d => feedbackAll[d.id] = d.data()); renderHomework(); renderAttend();
    });
  }
  lvStart();
  if (!$("#v-lam-viec").hidden) lvOnShow();
  if (isAdmin) {
    listen(query(collection(db, "yeucau"), orderBy("guiLuc", "desc")), snap => {
      requests = snap.docs.filter(d => d.id !== mail).map(d => ({ id: d.id, ...d.data() })); renderRequests();
      if (!svChecked) { svChecked = true; checkRules(); }
    });
    listen(query(collection(db, "giaovien"), orderBy("duyetLuc", "desc")), snap => {
      teachers = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderTeachers(); renderLV();
    });
  }
}

let authReadyOk; const authReady = new Promise(r => authReadyOk = r);
// Khách chỉ xem trang giới thiệu: tải thư viện đăng nhập SAU khi trang đã hiện xong,
// để điện thoại yếu / mạng 3G không bị khựng. Học viên đã đăng nhập thì tải ngay.
function fbGate() {
  if ((cachedSession && cachedSession.mail) || PAGES.includes(location.hash.slice(1)) || DIAG) return Promise.resolve();
  return new Promise(go => {
    addEventListener("hashchange", () => { if (PAGES.includes(location.hash.slice(1))) go(); });
    document.addEventListener("pointerdown", e => { if (e.target.closest && e.target.closest('a[href="#tai-khoan"],a[href="#giao-trinh"],a[href="#bai-tap"]')) go(); }, true);
    const idle = () => window.requestIdleCallback ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200);
    if (document.readyState === "complete") idle(); else addEventListener("load", idle);
  });
}
async function startFirebase() {
  if (!configured) { renderLocks("setup"); renderAccount(false); return; }
  showCachedSession();
  await fbGate();
  try {
    const tf = performance.now();
    await loadFirebase();
    mark("Tải thư viện Firebase", tf);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = "vi"; // thư xác nhận / đặt lại mật khẩu bằng tiếng Việt
    authReadyOk();
    // Lưu dữ liệu trên máy: lần sau mở trang hiện ngay, không phải chờ tải lại.
    // Tự chọn kiểu kết nối ổn định nhất với mạng di động/wifi ở Việt Nam.
    try { db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); }
    catch (e) { db = getFirestore(app); }
    // Mở sẵn kết nối tới máy chủ ngay khi vào trang, để lúc đăng nhập không phải chờ.
    getDoc(doc(db, "admins", "_mo-ket-noi")).catch(() => {});
  } catch (e) {
    $$("[data-lock]").forEach(el => { el.hidden = false; el.innerHTML = `<h3>Chưa kết nối được máy chủ</h3><p class="muted">Mạng đang yếu. Có mạng lại, trang sẽ tự tải lại.</p><div class="ctas"><button class="btn primary" type="button" onclick="location.reload()">Tải lại ngay</button></div>`; });
    $("#login-status").textContent = "Mạng đang yếu nên chưa mở được đăng nhập. Có mạng lại, trang sẽ tự tải lại.";
    addEventListener("online", () => location.reload(), { once: true });
    return;
  }
  onAuthStateChanged(auth, onUser);
  $("#btn-switch").onclick = async () => {
    const prev = mail;
    await signOut(auth);
    $("#pw-mail").value = prev; $("#pw-pass").value = ""; $("#pw-status").textContent = ""; showTab("in");
    toast("Đã đăng xuất.");
  };
}
startFirebase();

/* ---------- Đăng nhập bằng Gmail + mật khẩu (chạy được cả trong Zalo, Facebook, máy cũ) ---------- */
const pwMail = () => $("#pw-mail").value.trim().toLowerCase();
const okMail = m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
function pwSay(t, err) { const st = $("#pw-status"); st.textContent = t; st.classList.toggle("err", !!err); }
function pwError(e) {
  const c = (e && e.code) || "";
  return ({
    "auth/invalid-credential": "Sai Gmail hoặc mật khẩu. Kiểm tra lại từng chữ. Chưa có tài khoản thì bấm mục “Lần đầu: Tạo tài khoản” ở trên.",
    "auth/wrong-password": "Sai mật khẩu. Bấm “Quên mật khẩu?” để đặt lại.",
    "auth/user-not-found": "Gmail này chưa có tài khoản. Bấm mục “Lần đầu: Tạo tài khoản” ở trên.",
    "auth/email-already-in-use": "Gmail này đã có tài khoản rồi. Bấm mục “Đã có tài khoản: Đăng nhập”.",
    "auth/weak-password": "Mật khẩu quá ngắn. Dùng ít nhất 6 ký tự.",
    "auth/invalid-email": "Gmail viết chưa đúng. VD: tenem@gmail.com",
    "auth/too-many-requests": "Thử sai nhiều lần quá. Chờ vài phút rồi thử lại, hoặc bấm “Quên mật khẩu?”.",
    "auth/network-request-failed": "Mất kết nối mạng. Kiểm tra wifi/4G rồi thử lại.",
    "auth/operation-not-allowed": "Đăng nhập bằng mật khẩu chưa được bật. Thầy vào Firebase → Authentication → Sign-in method → Email/Password → Enable → Save.",
    "auth/configuration-not-found": "Firebase Authentication chưa được bật. Thầy vào Firebase → Authentication → Get started → bật Email/Password.",
    "auth/invalid-api-key": "Mã kết nối Firebase không đúng. Kiểm tra lại file config/firebase-config.js.",
    "auth/internal-error": "Lỗi tạm thời từ máy chủ. Thử lại sau ít phút."
  })[c] || `Chưa làm được (mã lỗi: ${c || "không rõ"}). Thử lại sau ít phút.`;
}
function pwCheck(needPass) {
  const m = pwMail(), p = $("#pw-pass").value;
  if (!okMail(m)) { pwSay("Gõ Gmail của em trước. VD: tenem@gmail.com", true); $("#pw-mail").focus(); return null; }
  if (needPass && p.length < 6) { pwSay("Mật khẩu cần ít nhất 6 ký tự.", true); $("#pw-pass").focus(); return null; }
  return { m, p };
}
function verifySay(t, err) { const st = $("#verify-status"); st.textContent = t; st.classList.toggle("err", !!err); }
async function pwBusy(btn, label, job, say = pwSay) {
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  // Bấm sớm khi máy chủ chưa kết nối xong: chờ rồi tự làm tiếp, không bắt bấm lại.
  try { await authReady; await job(); } catch (e) { say(pwError(e), true); } finally { btn.disabled = false; btn.textContent = old; }
}
async function sendVerify(u) {
  const back = { url: location.origin + location.pathname + "#tai-khoan" };
  try { await sendEmailVerification(u, back); } catch (e) { await sendEmailVerification(u); }
}
$("#pw-show").onclick = () => {
  const i = $("#pw-pass"), show = i.type === "password";
  i.type = show ? "text" : "password"; $("#pw-show").textContent = show ? "Ẩn" : "Hiện";
};
$("#f-pw").addEventListener("submit", ev => {
  ev.preventDefault(); const v = pwCheck(true); if (!v) return;
  pwSay("");
  pwBusy($("#pw-in"), "Đang đăng nhập…", async () => { await signInWithEmailAndPassword(auth, v.m, v.p); store.set(LAST_MAIL, v.m); });
});
// Hai mục rõ ràng: "Lần đầu: Tạo tài khoản" và "Đã có tài khoản: Đăng nhập".
const LAST_MAIL = "lvkv-gmail";
function showTab(which) {
  const isNew = which === "new";
  $("#tab-new").setAttribute("aria-selected", isNew); $("#tab-in").setAttribute("aria-selected", !isNew);
  $("#f-new").hidden = !isNew; $("#f-pw").hidden = isNew;
}
$("#tab-new").onclick = () => showTab("new");
$("#tab-in").onclick = () => { showTab("in"); if (!$("#pw-mail").value && $("#nw-mail").value) $("#pw-mail").value = $("#nw-mail").value.trim(); };
// Máy này từng đăng nhập: mở sẵn mục Đăng nhập và điền sẵn Gmail.
const lastMail = store.get(LAST_MAIL, "");
if (lastMail) { $("#pw-mail").value = lastMail; showTab("in"); } else showTab("new");

function nwSay(t, err) { const st = $("#nw-status"); st.textContent = t; st.classList.toggle("err", !!err); }
$("#nw-show").onclick = () => {
  const show = $("#nw-pass").type === "password";
  ["#nw-pass", "#nw-pass2"].forEach(id => $(id).type = show ? "text" : "password");
  $("#nw-show").textContent = show ? "Ẩn" : "Hiện";
};
$("#f-new").addEventListener("submit", ev => {
  ev.preventDefault();
  const ten = $("#nw-ten").value.trim(), m = $("#nw-mail").value.trim().toLowerCase(), p1 = $("#nw-pass").value, p2 = $("#nw-pass2").value;
  $("#nw-setpass").hidden = true;
  if (!ten) { nwSay("Gõ họ và tên trước nhé.", true); $("#nw-ten").focus(); return; }
  if (!okMail(m)) { nwSay("Gmail viết chưa đúng. VD: tenem@gmail.com", true); $("#nw-mail").focus(); return; }
  if (p1.length < 6) { nwSay("Mật khẩu cần ít nhất 6 ký tự.", true); $("#nw-pass").focus(); return; }
  if (p1 !== p2) { nwSay("Hai lần mật khẩu chưa giống nhau. Gõ lại ô Nhập lại mật khẩu.", true); $("#nw-pass2").focus(); return; }
  nwSay("");
  pwBusy($("#nw-btn"), "Đang tạo tài khoản…", async () => {
    try {
      const c = await createUserWithEmailAndPassword(auth, m, p1);
      store.set(LAST_MAIL, m);
      store.set("nhap-tk-" + m, { "rg-ten": ten });
      try { await updateProfile(c.user, { displayName: ten }); $("#who-name").textContent = ten; } catch (e) {}
      await sendVerify(c.user);
      $("#nw-pass").value = ""; $("#nw-pass2").value = "";
      toast("Đã tạo tài khoản! Mở Gmail để xác nhận nhé.");
    } catch (e) {
      if (e && e.code === "auth/email-already-in-use") {
        nwSay("Gmail này đã có tài khoản rồi. Nếu em nhớ mật khẩu, bấm mục “Đã có tài khoản: Đăng nhập”. Nếu chưa từng đặt mật khẩu (trước đây vào bằng nút Google), bấm nút bên dưới để đặt mật khẩu.", true);
        $("#nw-setpass").hidden = false; $("#pw-mail").value = m;
      } else nwSay(pwError(e), true);
    }
  }, nwSay);
});
$("#nw-setpass").onclick = () => {
  const m = $("#nw-mail").value.trim().toLowerCase();
  pwBusy($("#nw-setpass"), "Đang gửi…", async () => {
    await sendPasswordResetEmail(auth, m);
    $("#nw-setpass").hidden = true;
    nwSay(`Đã gửi thư vào ${m}. Mở Gmail (xem cả Thư rác), bấm link trong thư để đặt mật khẩu, rồi quay lại mục “Đăng nhập”.`);
  }, nwSay);
};
$("#pw-forgot").onclick = () => {
  const v = pwCheck(false); if (!v) return;
  pwBusy($("#pw-forgot"), "Đang gửi…", async () => {
    await sendPasswordResetEmail(auth, v.m);
    pwSay(`Đã gửi thư đặt lại mật khẩu vào ${v.m}. Mở Gmail (xem cả Thư rác), bấm link để đặt mật khẩu mới rồi quay lại đăng nhập.`);
  });
};
// Chờ xác nhận Gmail: tự kiểm tra mỗi vài giây và ngay khi em quay lại từ ứng dụng Gmail.
let verifyTimer = null;
async function checkVerified(manual) {
  const u = auth && auth.currentUser; if (!u || !needVerify) return;
  const st = $("#verify-status");
  try { await u.reload(); } catch (e) { if (manual) { st.textContent = "Mạng yếu, thử lại nhé."; st.classList.add("err"); } return; }
  if (auth.currentUser && auth.currentUser.emailVerified) {
    clearInterval(verifyTimer);
    try { await auth.currentUser.getIdToken(true); } catch (e) {}
    st.textContent = ""; toast("Đã xác nhận Gmail! Làm tiếp bước 2 nhé.");
    onUser(auth.currentUser);
  } else if (manual) {
    st.textContent = "Chưa thấy xác nhận. Em mở thư trong Gmail và bấm vào link nhé (xem cả mục Thư rác)."; st.classList.add("err");
  }
}
function watchVerify() {
  clearInterval(verifyTimer);
  verifyTimer = setInterval(() => { if (!needVerify) clearInterval(verifyTimer); else if (document.visibilityState === "visible") checkVerified(false); }, 4000);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && needVerify) checkVerified(false); });
$("#btn-verified").onclick = () => pwBusy($("#btn-verified"), "Đang kiểm tra…", () => checkVerified(true), verifySay);
$("#btn-resend").onclick = () => pwBusy($("#btn-resend"), "Đang gửi…", async () => {
  await sendVerify(auth.currentUser);
  verifySay("Đã gửi lại. Xem thư mới nhất trong Gmail (cả mục Thư rác).");
}, verifySay);

/* ---------- Biểu mẫu ---------- */
function submitTo(form, statusEl, busy, okMsg, write, keep) {
  const key = "nhap-" + form.id;
  keepDraft(form, () => key);
  fillForm(form, store.get(key, null));
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    if (!db || !user) { toast("Đang kết nối máy chủ, chờ 1 giây rồi bấm lại.", "err"); return; }
    statusEl.classList.remove("err");
    const vals = formValues(form);
    let p;
    try { p = timed("Lưu biểu mẫu", write()); } catch (e) { p = Promise.reject(e); }
    if (!keep) form.reset();
    dropDraft(key);
    statusEl.textContent = okMsg; toast(okMsg);
    Promise.resolve(p).catch(() => {
      fillForm(form, vals); store.set(key, vals);
      statusEl.textContent = "Chưa lưu được, chữ em gõ vẫn còn. Kiểm tra mạng rồi bấm lại."; statusEl.classList.add("err");
    });
  });
}
/* Đăng ký tài khoản: lưu vào Firebase + gửi email báo cho thầy */
const cleanPhone = x => String(x || "").replace(/[\s.\-()]/g, "");
const okPhone = x => /^(0|\+84)\d{9,10}$/.test(cleanPhone(x));
let regSent = "";
$("#f-reg").addEventListener("submit", async ev => {
  ev.preventDefault();
  if (!db || !user) { toast("Đang kết nối máy chủ, chờ 1 giây rồi bấm gửi lại.", "err"); return; }
  const st = $("#rg-status"); const v = id => $(id).value.trim();
  const gv = v("#rg-vt") === "giaovien";
  st.classList.remove("err");
  const bad = (msg, id) => { st.textContent = msg; st.classList.add("err"); if (id) $(id).focus(); };
  if (gv && !okPhone(v("#rg-sdtgv"))) return bad("Số điện thoại chưa đúng. Viết 10 số, bắt đầu bằng số 0.", "#rg-sdtgv");
  if (!gv && !okPhone(v("#rg-sdtph"))) return bad("Số điện thoại bố mẹ chưa đúng. Viết 10 số, bắt đầu bằng số 0.", "#rg-sdtph");
  if (!gv && v("#rg-sdt") && !okPhone(v("#rg-sdt"))) { $("#f-reg details").open = true; return bad("Số điện thoại của em chưa đúng. Viết 10 số, hoặc để trống.", "#rg-sdt"); }
  const data = gv
    ? { vaiTro: "giaovien", gmail: mail, ten: v("#rg-ten"), sdt: cleanPhone(v("#rg-sdtgv")), coso: v("#rg-cs"), ghiChu: v("#rg-gc"), guiLuc: Date.now() }
    : {
      vaiTro: "hocvien", gmail: mail, ten: v("#rg-ten"), namSinh: Number(v("#rg-nam")),
      sdt: cleanPhone(v("#rg-sdt")), sdtPh: cleanPhone(v("#rg-sdtph")),
      truong: v("#rg-truong"), lopHoc: v("#rg-lophoc"), khuVuc: v("#rg-kv"), coso: v("#rg-cs"),
      chuongTrinh: v("#rg-ct"), khoi: v("#rg-khoi"), namThi: v("#rg-namthi"), mucTieu: v("#rg-mt"), ghiChu: v("#rg-gc"),
      guiLuc: Date.now()
    };
  st.textContent = "";
  editingReq = false;
  renderAccount(data); saveSession(data);
  window.scrollTo({ top: 0, behavior: "smooth" });
  const forMail = mail;
  const t = performance.now();
  setDoc(doc(db, "yeucau", mail), data).then(() => {
    mark("✓ Gửi đăng ký", t);
    dropDraft("nhap-tk-" + forMail); store.set(UNSENT + forMail, null);
    toast("Đã gửi cho thầy. Thầy duyệt xong, trang tự mở khoá.");
    // Bấm gửi nhiều lần (hoặc sửa mà không đổi gì) thì không gửi email trùng cho thầy.
    const sig = JSON.stringify({ ...data, guiLuc: 0 });
    if (sig !== regSent) { regSent = sig; guiEmailThongBao(data); }
  }, e => {
    mark("✗ LỖI Gửi đăng ký: " + (e && e.code), t);
    if (mail !== forMail) return;
    editingReq = true; renderAccount(false);
    store.set(UNSENT + forMail, data); store.set("nhap-tk-" + forMail, formValues($("#f-reg")));
    const code = (e && e.code) || "loi";
    st.classList.add("err");
    if (code === "permission-denied" || code === "failed-precondition" || code === "not-found") {
      st.textContent = "Máy chủ của lớp đang chưa nhận phiếu (lỗi cài đặt phía thầy, không phải lỗi của em). Thầy đã được báo qua email. Lần sau em mở lại trang này, phiếu sẽ tự gửi lại.";
      guiEmailThongBao(data, "PHIẾU CHƯA LƯU ĐƯỢC LÊN WEB (mã lỗi: " + code + "). Thầy mở trang Duyệt học viên để xem cách sửa.");
    } else {
      st.textContent = "Mạng yếu nên chưa gửi được. Kiểm tra wifi/4G rồi bấm Gửi lại (chữ em đã điền vẫn còn).";
    }
  });
});
const UNSENT = "phieu-chua-gui-";

// Đổi vai trò trên biểu mẫu: giáo viên không cần điền thông tin học tập.
function applyRoleFields() {
  const gv = $("#rg-vt").value === "giaovien";
  $$("#f-reg .chi-hv").forEach(el => {
    el.hidden = gv;
    el.querySelectorAll("input, select").forEach(i => { if (i.dataset.req === "1") i.required = !gv; });
  });
  $$("#f-reg .chi-gv").forEach(el => {
    el.hidden = !gv;
    el.querySelectorAll("input, select").forEach(i => i.required = gv);
  });
  $("#f-reg .chi-hv-text").textContent = gv
    ? "Tôi đồng ý gửi thông tin này cho quản lý lớp để duyệt tài khoản giáo viên."
    : "Bố mẹ em đã đồng ý cho em gửi thông tin này. Chỉ thầy cô của lớp xem được.";
}
$$("#f-reg .chi-hv [required], #f-reg .chi-hv[required]").forEach(i => i.dataset.req = "1");
$$("#f-reg label.chi-hv > input[required], #f-reg label.chi-hv > select[required]").forEach(i => i.dataset.req = "1");
$("#rg-vt").onchange = applyRoleFields;
keepDraft($("#f-reg"), () => mail ? "nhap-tk-" + mail : null);
applyRoleFields();

// Sửa thông tin đã gửi: điền lại form từ yêu cầu cũ.
$("#btn-edit").onclick = () => {
  const r = pendingReq || {}; editingReq = true;
  const set = (id, val) => { if (val !== undefined && val !== null) $(id).value = val; };
  set("#rg-vt", r.vaiTro || "hocvien"); applyRoleFields();
  set("#rg-ten", r.ten); set("#rg-nam", r.namSinh); set("#rg-sdtph", r.sdtPh); set("#rg-cs", r.coso); set("#rg-ct", r.chuongTrinh);
  set("#rg-sdt", r.vaiTro === "giaovien" ? "" : r.sdt); set("#rg-sdtgv", r.vaiTro === "giaovien" ? r.sdt : "");
  set("#rg-truong", r.truong); set("#rg-lophoc", r.lopHoc); set("#rg-kv", r.khuVuc); set("#rg-khoi", r.khoi);
  set("#rg-namthi", r.namThi); set("#rg-mt", r.mucTieu); set("#rg-gc", r.ghiChu);
  renderAccount(pendingReq);
};
$("#btn-check").onclick = async () => {
  const b = $("#btn-check");
  if (!auth || !auth.currentUser) { location.reload(); return; }
  b.disabled = true; b.textContent = "Đang kiểm tra…";
  try { await onUser(auth.currentUser); } finally { b.disabled = false; b.textContent = "Kiểm tra lại"; }
  if (!approved && !isTeacher) toast("Thầy chưa duyệt. Khi thầy duyệt, trang này tự mở khoá, em không cần bấm lại.");
};

function guiEmailThongBao(d, canhBao) {
  if (!EMAIL_NHAN_THONG_BAO) return;
  const link = location.origin + location.pathname + "#duyet";
  fetch("https://formsubmit.co/ajax/" + EMAIL_NHAN_THONG_BAO, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      _subject: `${canhBao && canhBao.startsWith("PHIẾU CHƯA") ? "[CHƯA LƯU ĐƯỢC] " : ""}Yêu cầu duyệt ${d.vaiTro === "giaovien" ? "GIÁO VIÊN" : "học viên"}: ${d.ten}${d.chuongTrinh ? " (" + d.chuongTrinh + ")" : ""}`,
      _template: "table", _captcha: "false",
      "Vai trò": d.vaiTro === "giaovien" ? "Giáo viên" : "Học viên",
      "Họ tên": d.ten, "Năm sinh": d.namSinh || "", "Gmail": d.gmail,
      "Số điện thoại": d.sdt, "SĐT phụ huynh": d.sdtPh || "",
      "Trường": d.truong || "", "Lớp": d.lopHoc || "", "Khu vực": d.khuVuc || "",
      "Cơ sở": d.coso, "Chương trình": d.chuongTrinh || "",
      "Khối dự thi": d.khoi || "", "Năm dự thi": d.namThi || "", "Trường/ngành muốn vào": d.mucTieu || "",
      "Ghi chú": d.ghiChu || "", "Duyệt tại": link, ...(canhBao ? { "⚠ Lưu ý": canhBao } : {})
    })
  }).catch(() => {});
}
submitTo($("#f-gt"), $("#gt-status"), "Đang thêm…", "Đã thêm vào giáo trình.", () => addDoc(collection(db, "giaotrinh"), {
  khoa: $("#gt-khoa").value.trim(), ten: $("#gt-ten").value.trim(), loai: $("#gt-loai").value,
  buoc: $("#gt-buoc").value.split("\n").map(s => s.trim()).filter(Boolean), ghichu: $("#gt-ghichu").value.trim(),
  thutu: lessons.reduce((m, l) => Math.max(m, Number(l.thutu) || 0), 0) + 1
}));
submitTo($("#f-hv"), $("#hv-status"), "Đang duyệt…", "Đã duyệt. Người này đăng nhập Gmail đó là vào được.", () => {
  const g = $("#hv-mail").value.trim().toLowerCase();
  if ($("#hv-vt").value === "giaovien")
    return setDoc(doc(db, "giaovien", g), { ten: $("#hv-ten").value.trim(), gmail: g, sdt: "", coso: $("#hv-cs").value, ghiChu: "", duyetLuc: Date.now() });
  return setDoc(doc(db, "hocvien", g), { ten: $("#hv-ten").value.trim(), gmail: g, lop: $("#hv-lop").value.trim(), chuongTrinh: $("#hv-lop").value.trim(), coso: $("#hv-cs").value, sdt: "", duyetLuc: Date.now() });
});

/* ---------- Nạp giáo trình có sẵn ---------- */
$("#btn-seed").onclick = async () => {
  const st = $("#seed-status"); st.textContent = "Đang nạp…";
  // Chỉ tải giáo trình mẫu khi thầy bấm nạp (đỡ nặng trang cho mọi người khác)
  const { GIAO_TRINH_MAU } = await import("../../data/giao-trinh-mau.js?v=20261009b");
  const batch = writeBatch(db);
  GIAO_TRINH_MAU.forEach(([id, khoa, ten, loai, thutu, buoc, ghichu]) => batch.set(doc(db, "giaotrinh", id), { khoa, ten, loai, thutu, buoc, ghichu }));
  try { await timed("Nạp giáo trình", batch.commit()); st.textContent = `Đã nạp ${GIAO_TRINH_MAU.length} bài vào giáo trình.`; }
  catch (e) { st.textContent = "Chưa nạp được. Kiểm tra đã dán luật bảo mật (firestore.rules) chưa."; }
};
