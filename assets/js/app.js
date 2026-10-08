// =====================================================================
//  LOGIC CỦA WEB — thường không cần sửa file này.
//  Nội dung (liên hệ, lịch thi, thời gian biểu, ảnh) nằm ở data/noi-dung.js
// =====================================================================
import { firebaseConfig, ADMIN_EMAIL, EMAIL_NHAN_THONG_BAO } from "../../config/firebase-config.js?v=20261008c";
import { LIEN_HE, NAM_THI, LICH_THI, BO_LOC_TRUONG, CA_HOC, THOI_GIAN_BIEU, BAI_VE } from "../../data/noi-dung.js?v=20261008c";
import { GIAO_TRINH_MAU } from "../../data/giao-trinh-mau.js?v=20261008c";

// Firebase được tải riêng, để phần giới thiệu vẫn chạy kể cả khi mạng chậm hoặc chưa cấu hình.
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
let initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut;
let getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy;
async function loadFirebase() {
  const [a, au, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  ({ initializeApp } = a);
  ({ getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } = au);
  ({ getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy } = fs);
}

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
function copyText(text, statusEl, okMsg, selectEl) {
  const fallback = () => {
    const r = document.createRange(); r.selectNodeContents(selectEl);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    statusEl.textContent = "Đã chọn sẵn chữ, bấm giữ để sao chép.";
  };
  try { navigator.clipboard.writeText(text).then(() => statusEl.textContent = okMsg, fallback); } catch (e) { fallback(); }
}

/* ================= Điều hướng ================= */
const PAGES = ["giao-trinh", "bai-tap", "tai-khoan", "duyet"];
function route() {
  const h = location.hash.replace("#", "");
  const page = PAGES.includes(h) ? h : "home";
  $("#v-home").hidden = page !== "home";
  PAGES.forEach(p => $("#v-" + p).hidden = page !== p);
  $$("nav a.link").forEach(a => {
    const on = page === "home" ? a.getAttribute("href") === "#" + (h || "gioi-thieu") : a.dataset.nav === page;
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
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
  $("#months").innerHTML = Object.keys(MONTH).map(m => {
    const evs = shown.filter(e => e.ngay.slice(5, 7) === m);
    return `<div class="month"><h3>${MONTH[m]}</h3>${evs.length ? evs.map(e =>
      `<div class="ev ${e.n < 0 ? "past" : ""}"><span class="d">${esc(e.hien)}</span>
        <span class="s">${esc(e.truong)} ${e.t === "THPT" ? '<span class="chip line">Văn hoá</span>' : `<span class="chip">${esc(e.dot)}</span>`}</span>
        <span class="left num">${e.n < 0 ? "Đã thi" : "Còn " + e.n + " ngày"}</span></div>`).join("")
      : `<p class="muted" style="padding-block:12px">Không có lịch thi</p>`}</div>`;
  }).join("");
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
function renderSched(k) {
  const tkb = THOI_GIAN_BIEU[k] || {};
  $("#sched").innerHTML = `<thead><tr><th>Ca học</th>${DAYS.map(d => `<th>${d === "CN" ? "Chủ nhật" : "Thứ " + d.slice(1)}</th>`).join("")}</tr></thead>
    <tbody>${CA_HOC.map(c => `<tr><td><b>${esc(c.ten)} ${esc(c.gio)}</b></td>${DAYS.map(d => {
      const mon = (tkb[c.ma] || {})[d]; return `<td>${mon ? `<span class="slot ${SLOT[mon] || "mt2"}">${esc(mon)}</span>` : ""}</td>`;
    }).join("")}</tr>`).join("")}</tbody>`;
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

/* ================= Ảnh bài vẽ ================= */
if (BAI_VE.length) {
  $("#gallery").innerHTML = BAI_VE.map((b, i) =>
    `<button type="button" aria-label="Phóng to bài vẽ ${i + 1}"><img src="${esc(b.anh)}" alt="${esc(b.moTa || "Bài vẽ học viên")}" loading="lazy"></button>`).join("");
  $("#gallery").hidden = false; $("#gallery-note").hidden = false;
  let cur = 0;
  const show = i => {
    cur = (i + BAI_VE.length) % BAI_VE.length;
    $("#lb-img").src = BAI_VE[cur].anh; $("#lb-img").alt = BAI_VE[cur].moTa || "";
    $("#lb-cap").textContent = `${cur + 1} / ${BAI_VE.length}${BAI_VE[cur].moTa ? " · " + BAI_VE[cur].moTa : ""}`;
    $("#lb").hidden = false;
  };
  $$("#gallery button").forEach((b, i) => b.onclick = () => show(i));
  $("#lb-prev").onclick = () => show(cur - 1);
  $("#lb-next").onclick = () => show(cur + 1);
  $("#lb-close").onclick = () => $("#lb").hidden = true;
  $("#lb").addEventListener("click", e => { if (e.target === $("#lb")) $("#lb").hidden = true; });
  document.addEventListener("keydown", e => {
    if ($("#lb").hidden) return;
    if (e.key === "Escape") $("#lb").hidden = true;
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
}

/* ================= Đăng ký học thử ================= */
$("#f-dk").addEventListener("submit", ev => {
  ev.preventDefault();
  const v = id => $(id).value.trim();
  const lines = ["Chào thầy, em muốn đăng ký học thử / tư vấn:",
    "- Học sinh: " + v("#dk-ten"), "- SĐT phụ huynh: " + v("#dk-sdt"), "- Đang học: " + v("#dk-lop"),
    "- Muốn học: " + v("#dk-khoi"), "- Hình thức: " + v("#dk-hinh")];
  if (v("#dk-truong")) lines.push("- Trường muốn thi: " + v("#dk-truong"));
  if (v("#dk-ghichu")) lines.push("- Câu hỏi: " + v("#dk-ghichu"));
  $("#dk-text").textContent = lines.join("\n");
  $("#dk-out").hidden = false; $("#dk-status").textContent = "";
});
$("#dk-copy").onclick = () => copyText($("#dk-text").textContent, $("#dk-status"), "Đã sao chép. Dán vào Zalo hoặc Messenger để gửi cho lớp.", $("#dk-text"));

/* ================= Firebase ================= */
const configured = !String(firebaseConfig.apiKey || "").startsWith("DAN_");
let app, auth, db;

// Vai trò: isAdmin = quản lý (toàn quyền); isTeacher = giáo viên hoặc quản lý; approved = học viên đã duyệt.
let user = null, mail = "", isAdmin = false, isTeacher = false, approved = false;
let teachers = [], feedbackAll = {}, myFeedback = {};
const gradeOpen = new Set(), gradeDraft = {};
let needRedraw = false;
// Khi giáo viên gõ xong (rời ô nhập), vẽ lại nếu trong lúc gõ có dữ liệu mới.
document.addEventListener("focusout", () => setTimeout(() => { if (needRedraw) renderHomework(); }, 0));
let lessons = [], homework = [], roster = [], requests = [], progressAll = {};
let myProgress = { bai: {}, baitap: {} };
let course = null, lessonId = null, hwView = "open";
let unsubs = [];

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
      ${state === "checking" || state === "setup" ? "" : `<ol><li>Đăng nhập bằng Google với Gmail em dùng để học.</li><li>Gửi yêu cầu duyệt ở trang Đăng nhập / Đăng ký.</li><li>Khi thầy duyệt xong, mở lại trang này.</li></ol>
      <div class="ctas"><a class="btn primary" href="#tai-khoan">Đăng nhập / Đăng ký</a><a class="btn" href="#dang-ky">Chưa là học viên? Đăng ký học</a></div>`}`;
  });
  $("#gt-body").hidden = state !== "ok";
  $("#bt-body").hidden = state !== "ok";
}

let pendingReq = null, editingReq = false;
function setStep(n) {
  $$("#stepper li").forEach(li => {
    const k = Number(li.dataset.step);
    li.className = k < n ? "done" : k === n ? "now" : "";
  });
}
function renderAccount(pending) {
  if (typeof pending === "object") pendingReq = pending; else if (pending === false) pendingReq = null;
  const inApp = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Zalo|Line\/|TikTok/i.test(navigator.userAgent);
  $("#inapp").hidden = !(inApp && !user);
  $$("[data-teacher]").forEach(el => el.hidden = !isTeacher);
  $$("[data-admin]").forEach(el => el.hidden = !isAdmin);
  $("#nav-duyet").hidden = !isAdmin;
  $("#duyet-lock").hidden = isAdmin;
  $("#btn-login").hidden = !!user || !configured;
  $("#btn-switch").hidden = !user;
  $("#btn-learn").hidden = !(user && (approved || isTeacher));
  const canReg = !!user && !approved && !isTeacher;
  $("#card-reg").hidden = !(canReg && (!pendingReq || editingReq));
  $("#card-wait").hidden = !(canReg && pendingReq && !editingReq);
  if (!configured) {
    $("#who-name").textContent = "Web chưa kết nối Firebase";
    $("#who-mail").textContent = "Thầy cần dán mã kết nối vào config/firebase-config.js.";
    $("#who-status").innerHTML = ""; setStep(1); return;
  }
  if (!user) {
    $("#who-name").textContent = "Bước 1: Đăng nhập bằng Gmail";
    $("#who-mail").textContent = "Dùng Gmail của em (hoặc của bố mẹ). Lần sau vào học cũng dùng đúng Gmail này.";
    $("#who-status").innerHTML = ""; $("#who-avatar").hidden = true;
    $("#nav-acct").textContent = "Đăng nhập";
    setStep(1); return;
  }
  $("#who-name").textContent = user.displayName || "Xin chào";
  $("#who-mail").textContent = "Đang dùng Gmail: " + mail;
  if (user.photoURL) { $("#who-avatar").src = user.photoURL; $("#who-avatar").hidden = false; }
  $("#nav-acct").textContent = "Tài khoản";
  if (isAdmin) { $("#who-status").innerHTML = `<span class="chip">Quản lý</span> Toàn quyền: duyệt học viên và giáo viên, sửa giáo trình, giao và chấm bài.`; setStep(4); return; }
  if (isTeacher) { $("#who-status").innerHTML = `<span class="chip">Giáo viên</span> Thầy/cô giao bài, xem học viên đã nộp, chấm điểm và nhận xét.`; setStep(4); return; }
  if (approved) { $("#who-status").innerHTML = `<span class="chip ok">Đã duyệt</span> Em đã vào học được rồi.`; setStep(4); return; }
  if (pendingReq && !editingReq) {
    $("#who-status").innerHTML = `<span class="chip line">Chờ duyệt</span>`;
    $("#wait-text").textContent = `Em đã gửi ngày ${fmtDate(pendingReq.guiLuc)}. Thầy duyệt xong, em mở lại trang này là vào học được.`;
    setStep(3); return;
  }
  $("#who-status").innerHTML = `<span class="chip line">Chưa gửi thông tin</span> Làm tiếp bước 2 ở bên dưới.`;
  if (!$("#rg-ten").value && user.displayName) $("#rg-ten").value = user.displayName;
  setStep(2);
}

/* ---------- Giáo trình ---------- */
function courses() { return [...new Set(lessons.map(l => l.khoa))]; }
function renderLessons() {
  const cs = courses();
  $("#khoa-list").innerHTML = cs.map(c => `<option value="${esc(c)}">`).join("");
  $("#bt-khoa").innerHTML = cs.concat(["Chung"]).map(c => `<option>${esc(c)}</option>`).join("");
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
  $$("#lesson-nav button").forEach(b => b.onclick = () => { lessonId = b.dataset.id; renderLessons(); });
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
  const list = homework.filter(h => hwView === "open" ? daysUntil(h.han) >= 0 : daysUntil(h.han) < 0);
  if (!list.length) {
    $("#hw-list").innerHTML = `<div class="empty">${hwView === "open" ? "Chưa có bài tập nào đang làm." : "Chưa có bài nào hết hạn."}${isTeacher && hwView === "open" ? " Giao bài ở khung bên dưới." : ""}</div>`;
    return;
  }
  const students = roster.length;
  $("#hw-list").innerHTML = list.map(h => {
    const n = daysUntil(h.han); const [, m, d] = String(h.han).split("-");
    const due = n < 0 ? `Hết hạn ${d}/${m}` : n === 0 ? "Hạn nộp hôm nay" : `Hạn ${d}/${m} · còn ${n} ngày`;
    const submitted = roster.filter(r => (progressAll[r.id] || {}).baitap && progressAll[r.id].baitap[h.id]).length;
    const graded = roster.filter(r => (feedbackAll[r.id] || {})[h.id]).length;
    const fb = myFeedback[h.id];
    const staffBar = `<span class="chip ok">${submitted}/${students} đã nộp</span><span class="chip">${graded} đã chấm</span>
        <button class="btn small primary" data-grade="${esc(h.id)}">${gradeOpen.has(h.id) ? "Đóng chấm bài" : "Chấm bài"}</button>
        <button class="btn small" data-del="${esc(h.id)}">Xoá</button>`;
    const studentBar = `<button class="btn small" data-hw="${esc(h.id)}">${myProgress.baitap[h.id] ? "Đã nộp ✓" : "Đánh dấu đã nộp"}</button>`;
    return `<div class="hw"><div><p class="eyebrow">${esc(h.khoa)}${h.lop ? " · " + esc(h.lop) : ""}</p><h3>${esc(h.ten)}</h3></div>
      <p class="due ${n <= 1 ? "late" : ""}">${due}</p>${h.mota ? `<p class="desc">${esc(h.mota)}</p>` : ""}
      ${!isTeacher && fb ? `<p class="fb"><b>Thầy nhận xét${fb.diem ? ` · Điểm ${esc(fb.diem)}` : ""}:</b> ${esc(fb.nhanXet || "")}<br><span class="muted">${esc(fb.nguoiCham || "")} · ${fmtDate(fb.luc)}</span></p>` : ""}
      <div class="acts">${isTeacher ? staffBar : studentBar}</div>
      ${isTeacher && gradeOpen.has(h.id) ? gradeTable(h) : ""}</div>`;
  }).join("");
  $$("#hw-list [data-hw]").forEach(b => b.onclick = () => toggleProgress("baitap", b.dataset.hw).then(renderHomework));
  $$("#hw-list [data-del]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "baitap", b.dataset.del))));
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
  btn.disabled = true; btn.textContent = "Đang lưu…";
  try {
    await setDoc(doc(db, "nhanxet", email), { [hid]: { diem, nhanXet, nguoiCham: (user && user.displayName) || mail, luc: Date.now() } }, { merge: true });
    delete gradeDraft[k1]; delete gradeDraft[k2];
    btn.textContent = "Đã lưu ✓";
  } catch (e) { btn.textContent = "Lỗi, thử lại"; }
  btn.disabled = false;
}
$$("#hw-filter .tab").forEach(b => b.onclick = () => {
  hwView = b.dataset.h; $$("#hw-filter .tab").forEach(x => x.setAttribute("aria-selected", x === b)); renderHomework();
});

async function toggleProgress(kind, id) {
  myProgress[kind][id] = !myProgress[kind][id];
  try { await setDoc(doc(db, "tiendo", mail), { bai: myProgress.bai, baitap: myProgress.baitap, capNhat: Date.now() }); }
  catch (e) { myProgress[kind][id] = !myProgress[kind][id]; alertStatus("Chưa lưu được tiến độ. Kiểm tra mạng rồi thử lại."); }
}
function alertStatus(t) { const s = $("#login-status"); if (s) s.textContent = t; }

/* ---------- Giáo viên: duyệt học viên ---------- */
function fmtDate(t) { return t ? new Date(t).toLocaleDateString("vi-VN") : ""; }
function renderRequests() {
  const n = requests.length;
  $("#req-count").textContent = n || "";
  $("#nav-req").textContent = n; $("#nav-req").hidden = !n;
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
    b.disabled = true;
    const { id, vaiTro, ...data } = r;
    const batch = writeBatch(db);
    if (vaiTro === "giaovien") batch.set(doc(db, "giaovien", r.id), { ten: r.ten, gmail: r.gmail, sdt: r.sdt || "", coso: r.coso || "", ghiChu: r.ghiChu || "", duyetLuc: Date.now() });
    else batch.set(doc(db, "hocvien", r.id), { ...data, lop: r.chuongTrinh || r.lop || "", duyetLuc: Date.now() });
    batch.delete(doc(db, "yeucau", r.id));
    try { await batch.commit(); } catch (e) { b.disabled = false; b.textContent = "Lỗi, thử lại"; }
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
  let armed = false; const label = btn.textContent;
  btn.onclick = () => {
    if (!armed) { armed = true; btn.textContent = ask; setTimeout(() => { armed = false; btn.textContent = label; }, 3000); return; }
    act().catch(() => { btn.textContent = "Không thực hiện được"; });
  };
}

/* ---------- Đăng nhập ---------- */
function stopListeners() { unsubs.forEach(u => u()); unsubs = []; }
function listen(q, fn) { unsubs.push(onSnapshot(q, fn, () => {})); }

async function onUser(u) {
  stopListeners();
  user = u; mail = u ? String(u.email || "").toLowerCase() : "";
  isAdmin = false; isTeacher = false; approved = false;
  lessons = []; homework = []; roster = []; requests = []; teachers = []; progressAll = {}; feedbackAll = {}; myFeedback = {};
  myProgress = { bai: {}, baitap: {} };
  // Đổi người dùng thì xoá sạch form đăng ký, tránh gửi nhầm thông tin của người trước (máy dùng chung).
  $("#f-reg").reset(); $("#rg-status").textContent = ""; applyRoleFields(); editingReq = false; pendingReq = null;
  gradeOpen.clear(); Object.keys(gradeDraft).forEach(k => delete gradeDraft[k]);
  if (!u) { renderLocks("out"); renderAccount(false); return; }
  renderLocks("checking");
  const exists = async (col) => { try { return (await getDoc(doc(db, col, mail))).exists(); } catch (e) { return false; } };
  // Hỏi cả 4 thông tin cùng lúc thay vì lần lượt, để trang hiện nhanh hơn.
  const getData = async (col) => { try { const d = await getDoc(doc(db, col, mail)); return d.exists() ? (d.data() || {}) : null; } catch (e) { return null; } };
  const [isAdm, gvDoc, hvDoc, ycDoc] = await Promise.all([
    mail === ADMIN_EMAIL.toLowerCase() ? true : exists("admins"),
    getData("giaovien"), getData("hocvien"), getData("yeucau")
  ]);
  isAdmin = !!isAdm;
  isTeacher = isAdmin || !!gvDoc;
  approved = !isTeacher && !!hvDoc;
  const pending = !isTeacher && !approved && ycDoc ? ycDoc : false;
  const canLearn = isTeacher || approved;
  renderLocks(canLearn ? "ok" : "pending");
  renderAccount(pending);
  if (!canLearn) return;

  if (!isTeacher) {
    try { const p = await getDoc(doc(db, "tiendo", mail)); if (p.exists()) myProgress = { bai: p.data().bai || {}, baitap: p.data().baitap || {} }; } catch (e) {}
    listen(doc(db, "nhanxet", mail), d => { myFeedback = d.exists() ? d.data() : {}; renderHomework(); });
  }
  listen(query(collection(db, "giaotrinh"), orderBy("thutu")), snap => {
    lessons = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLessons(); if (isAdmin) renderRoster();
  });
  listen(query(collection(db, "baitap"), orderBy("han")), snap => {
    homework = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework();
  });
  if (isTeacher) {
    listen(query(collection(db, "hocvien"), orderBy("duyetLuc", "desc")), snap => {
      roster = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework(); if (isAdmin) renderRoster();
    });
    listen(collection(db, "tiendo"), snap => {
      progressAll = {}; snap.docs.forEach(d => progressAll[d.id] = d.data()); renderHomework(); if (isAdmin) renderRoster();
    });
    listen(collection(db, "nhanxet"), snap => {
      feedbackAll = {}; snap.docs.forEach(d => feedbackAll[d.id] = d.data()); renderHomework();
    });
  }
  if (isAdmin) {
    listen(query(collection(db, "yeucau"), orderBy("guiLuc", "desc")), snap => {
      requests = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderRequests();
    });
    listen(query(collection(db, "giaovien"), orderBy("duyetLuc", "desc")), snap => {
      teachers = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderTeachers();
    });
  }
}

// Giải thích lỗi đăng nhập bằng lời dễ hiểu, kèm mã lỗi để dễ tra.
function loginError(e) {
  const code = (e && e.code) || "unknown";
  const host = location.hostname;
  const tips = {
    "auth/unauthorized-domain": `Tên miền ${host} chưa được cho phép. Vào Firebase → Authentication → Settings → Authorized domains, thêm ${host}.`,
    "auth/operation-not-allowed": "Đăng nhập Google chưa được bật. Vào Firebase → Authentication → Sign-in method → Google → Enable → Save.",
    "auth/configuration-not-found": "Firebase Authentication chưa được bật. Vào Firebase → Authentication → bấm Get started, rồi bật Google.",
    "auth/invalid-api-key": "Mã kết nối Firebase không đúng. Kiểm tra lại file config/firebase-config.js.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Mã kết nối Firebase không đúng. Kiểm tra lại file config/firebase-config.js.",
    "auth/network-request-failed": "Mất kết nối mạng. Kiểm tra mạng rồi thử lại.",
    "auth/web-storage-unsupported": "Trình duyệt đang chặn lưu dữ liệu. Mở trang bằng Chrome hoặc Safari (không dùng chế độ ẩn danh).",
    "auth/internal-error": "Lỗi tạm thời từ Google. Thử lại sau ít phút."
  };
  return `Chưa đăng nhập được (mã lỗi: ${code}). ${tips[code] || "Thử lại, hoặc mở trang bằng Chrome/Safari."}`;
}

async function startFirebase() {
  if (!configured) { renderLocks("setup"); renderAccount(false); return; }
  renderLocks("checking");
  try {
    await loadFirebase();
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Lưu dữ liệu trên máy: lần sau mở trang hiện ngay, không phải chờ tải lại.
    try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
    catch (e) { db = getFirestore(app); }
  } catch (e) {
    $$("[data-lock]").forEach(el => { el.hidden = false; el.innerHTML = `<h3>Chưa kết nối được máy chủ</h3><p class="muted">Kiểm tra mạng rồi tải lại trang.</p>`; });
    return;
  }
  getRedirectResult(auth).catch(e => { if (e && e.code) $("#login-status").textContent = loginError(e); });
  onAuthStateChanged(auth, onUser);
  $("#btn-login").onclick = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    $("#login-status").textContent = "";
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) await signInWithRedirect(auth, provider);
      else if (e && e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") $("#login-status").textContent = loginError(e);
    }
  };
  $("#btn-switch").onclick = async () => { await signOut(auth); $("#btn-login").click(); };
}
startFirebase();

/* ---------- Biểu mẫu ---------- */
function submitTo(form, statusEl, busy, okMsg, write, keep) {
  form.addEventListener("submit", async ev => {
    ev.preventDefault(); if (!db || !user) return;
    statusEl.textContent = busy;
    try { await write(); if (!keep) form.reset(); statusEl.textContent = okMsg; }
    catch (e) { statusEl.textContent = "Chưa lưu được. Kiểm tra quyền và mạng rồi thử lại."; }
  });
}
/* Đăng ký tài khoản: lưu vào Firebase + gửi email báo cho thầy */
const cleanPhone = x => String(x || "").replace(/[\s.\-()]/g, "");
const okPhone = x => /^(0|\+84)\d{9,10}$/.test(cleanPhone(x));
$("#f-reg").addEventListener("submit", async ev => {
  ev.preventDefault(); if (!db || !user) return;
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
  st.textContent = "Đang gửi…"; $("#rg-btn").disabled = true;
  try { await setDoc(doc(db, "yeucau", mail), data); }
  catch (e) { st.textContent = "Chưa gửi được. Kiểm tra mạng rồi bấm gửi lại."; st.classList.add("err"); $("#rg-btn").disabled = false; return; }
  $("#rg-btn").disabled = false; st.textContent = "";
  editingReq = false;
  renderAccount(data);
  window.scrollTo({ top: 0, behavior: "smooth" });
  guiEmailThongBao(data);
});

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
$("#btn-check").onclick = () => location.reload();
$("#btn-copylink").onclick = () => copyText(location.href, $("#copylink-status"), "Đã chép link. Mở Chrome/Safari rồi dán vào.", $("#btn-copylink"));

function guiEmailThongBao(d) {
  if (!EMAIL_NHAN_THONG_BAO) return;
  const link = location.origin + location.pathname + "#duyet";
  fetch("https://formsubmit.co/ajax/" + EMAIL_NHAN_THONG_BAO, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      _subject: `Yêu cầu duyệt ${d.vaiTro === "giaovien" ? "GIÁO VIÊN" : "học viên"}: ${d.ten}${d.chuongTrinh ? " (" + d.chuongTrinh + ")" : ""}`,
      _template: "table", _captcha: "false",
      "Vai trò": d.vaiTro === "giaovien" ? "Giáo viên" : "Học viên",
      "Họ tên": d.ten, "Năm sinh": d.namSinh || "", "Gmail": d.gmail,
      "Số điện thoại": d.sdt, "SĐT phụ huynh": d.sdtPh || "",
      "Trường": d.truong || "", "Lớp": d.lopHoc || "", "Khu vực": d.khuVuc || "",
      "Cơ sở": d.coso, "Chương trình": d.chuongTrinh || "",
      "Khối dự thi": d.khoi || "", "Năm dự thi": d.namThi || "", "Trường/ngành muốn vào": d.mucTieu || "",
      "Ghi chú": d.ghiChu || "", "Duyệt tại": link
    })
  }).catch(() => {});
}
submitTo($("#f-bt"), $("#bt-status"), "Đang giao bài…", "Đã giao bài.", () => addDoc(collection(db, "baitap"), {
  ten: $("#bt-ten").value.trim(), khoa: $("#bt-khoa").value, han: $("#bt-han").value,
  lop: $("#bt-lop").value.trim(), mota: $("#bt-mota").value.trim(), taoLuc: Date.now()
}));
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
  const batch = writeBatch(db);
  GIAO_TRINH_MAU.forEach(([id, khoa, ten, loai, thutu, buoc, ghichu]) => batch.set(doc(db, "giaotrinh", id), { khoa, ten, loai, thutu, buoc, ghichu }));
  try { await batch.commit(); st.textContent = `Đã nạp ${GIAO_TRINH_MAU.length} bài vào giáo trình.`; }
  catch (e) { st.textContent = "Chưa nạp được. Kiểm tra đã dán luật bảo mật (firestore.rules) chưa."; }
};
