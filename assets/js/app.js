// =====================================================================
//  LOGIC CỦA WEB — thường không cần sửa file này.
//  Nội dung (liên hệ, lịch thi, thời gian biểu, ảnh) nằm ở data/noi-dung.js
// =====================================================================
import { firebaseConfig, ADMIN_EMAIL, EMAIL_NHAN_THONG_BAO } from "../../config/firebase-config.js?v=20261009b";
import { FILE_LIMITS, FILE_TYPES, fileExt, fileSize, validateFiles, attachmentStorage, uploadError, validAttachmentPath } from "./attachments.js?v=20261009b";
import { GIAO_TRINH_MAU as GT_LO_TRINH } from "../../data/giao-trinh-mau.js?v=20261010bf";
import { LIEN_HE, NAM_THI, LICH_THI, BO_LOC_TRUONG, CA_HOC, THOI_GIAN_BIEU, BAI_VE, BANG_VANG, TRUONG, MUC_TIEU, GIAO_VIEN, VIDEO_BIA, BAI_NOI_BAT, THANH_TUU_TRAO, XP_THUONG, AVATAR, SO_DU_THI, HOA_CU, TON_DAU_KY, BAN_TIN, SAN_PHAM, LICH_THI_CAP_NHAT, DO_MANG, MANG_XA_HOI } from "../../data/noi-dung.js?v=20261010bh";

// Firebase được tải riêng, để phần giới thiệu vẫn chạy kể cả khi mạng chậm hoặc chưa cấu hình.
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
let initializeApp, getAuth, onAuthStateChanged, signOut;
let createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile;
let getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, where, runTransaction, limit, deleteField, increment;
// Vai trò: isAdmin = quản lý (toàn quyền); isTeacher = giáo viên hoặc quản lý; approved = học viên đã duyệt.
// Khai báo ở đầu file để các phần trang chủ (bài vẽ, bản tin) biết ai đang xem ngay từ đầu.
let user = null, mail = "", isAdmin = false, isTeacher = false, approved = false, needVerify = false;
// Bài vẽ anh chị đăng trên web (Firestore: baive). Bài được quản lý chọn Top 1–5 thì thành "bài nổi bật".
let BAIVE_DONG = [], BANTIN_DONG = [], baiVeLoi = false, banTinLoi = false, gallerySig = "", baiHen = 0;
// Biệt danh mặc định theo người vẽ trong danh sách giáo viên (ví dụ Cường: "Giáo viên Hình hoạ · Dạy tượng"); bài đăng không ghi biệt danh riêng thì dùng mặc định này
const biDanhCua = b => b.biDanh || (GIAO_VIEN.find(g => g.ten === b.hocVien) || {}).biDanh || "";
const NB_DONG = () => BAIVE_DONG.filter(b => (b.hang >= 1 && b.hang <= 5) || b.mau).map(b => ({ ...b, ngay: b.ngayTop || b.ngay, dong: true }));
const nbAll = () => [...BAI_NOI_BAT, ...NB_DONG()];
async function loadFirebase() {
  const [a, au, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  ({ initializeApp } = a);
  ({ getAuth, onAuthStateChanged, signOut,
     createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } = au);
  ({ getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, where, runTransaction, limit, deleteField, increment } = fs);
  bocNhatKy();
}

/* ---------- Nhật ký sửa: ghi lại ai thêm/sửa/xoá dữ liệu quan trọng, kèm bản trước và sau ----------
   Chỉ ghi thao tác của giáo viên/quản lý. Quản lý xem và khôi phục ở Vận hành → Nhật ký sửa. */
const NK_BANG = new Set(["hocvien", "giaovien", "nhanxet", "diemdanh", "baitap", "giaotrinh", "lichnhac", "tiendo", "xephang", "baive", "bantin", "kho", "thongbao",
  "congviec", "doiten", "caday", "trucnhat", "thithu", "thithubai", "suco", "bangiao", "kiemtra", "doica"]);
const nkGoc = {};
const nkCan = ref => isTeacher && ref && ref.parent && !ref.parent.parent && NK_BANG.has(ref.parent.id) && !String(ref.id).startsWith("_");
const nkJson = d => { try { const t = JSON.stringify(d); return t.length > 600000 ? "(quá lớn)" : t; } catch (e) { return "(quá lớn)"; } };
async function nkTruoc(ref) { try { const d = await nkGoc.getDoc(ref); return d.exists() ? d.data() : null; } catch (e) { return undefined; } }
function nkGhi(ref, loai, truoc, sau, gop) {
  if (truoc === undefined) return; // không đọc được bản trước (thiếu quyền/mạng) thì bỏ qua, không chặn thao tác chính
  nkGoc.addDoc(nkGoc.collection(db, "nhatky"), { col: ref.parent.id, ma: ref.id, loai, gop: !!gop, truoc: truoc ? nkJson(truoc) : "", sau: sau ? nkJson(sau) : "",
    ai: mail, ten: (user && user.displayName) || "", luc: Date.now() }).catch(() => {});
}
function bocNhatKy() {
  if (nkGoc.setDoc) return;
  Object.assign(nkGoc, { setDoc, deleteDoc, addDoc, getDoc, collection, writeBatch });
  setDoc = async (ref, data, opt) => {
    if (!nkCan(ref)) return nkGoc.setDoc(ref, data, opt);
    const truoc = await nkTruoc(ref), kq = await nkGoc.setDoc(ref, data, opt);
    nkGhi(ref, truoc ? "sua" : "tao", truoc, data, opt && opt.merge); return kq;
  };
  deleteDoc = async ref => {
    if (!nkCan(ref)) return nkGoc.deleteDoc(ref);
    const truoc = await nkTruoc(ref), kq = await nkGoc.deleteDoc(ref);
    if (truoc) nkGhi(ref, "xoa", truoc, null); return kq;
  };
  addDoc = async (col, data) => { const ref = await nkGoc.addDoc(col, data); if (nkCan(ref)) nkGhi(ref, "tao", null, data); return ref; };
  writeBatch = d => {
    const b = nkGoc.writeBatch(d), ops = [];
    const w = { set(ref, data, opt) { b.set(ref, data, opt); ops.push([ref, data, opt]); return w; },
      update(ref, data) { b.update(ref, data); ops.push([ref, data, { merge: true }]); return w; },
      delete(ref) { b.delete(ref); ops.push([ref, null]); return w; },
      async commit() {
        const can = ops.filter(o => nkCan(o[0])), truoc = await Promise.all(can.map(o => nkTruoc(o[0])));
        const kq = await b.commit();
        can.forEach((o, i) => { if (o[1] === null) { if (truoc[i]) nkGhi(o[0], "xoa", truoc[i], null); } else nkGhi(o[0], truoc[i] ? "sua" : "tao", truoc[i], o[1], o[2] && o[2].merge); });
        return kq;
      } };
    return w;
  };
}

const $ = s => document.querySelector(s);
// Trợ lý (chat + nhắc việc) tải riêng, không làm chậm trang
const troLyPromise = import("./tro-ly.js?v=20261010bf").catch(e => console.warn("Chưa tải được trợ lý", e));
// Thi thử + vận hành lớp: chỉ tải khi đã đăng nhập vào học
let vanHanhP = null, vanHanhM = null;
const taiVanHanh = () => vanHanhP ||= import("./van-hanh.js?v=20261010bf").then(m => vanHanhM = m).catch(e => { vanHanhP = null; console.warn("Chưa tải được phần vận hành", e); });
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
/* ---------- Nút Quay lại (điện thoại) đóng cửa sổ đang mở thay vì rời trang ---------- */
// mo(dong): gọi lúc mở một lớp phủ; trả về hàm tha(diLink) để gọi khi lớp được đóng bằng nút ✕, Esc…
const lopMo = []; let boQuaPop = 0;
function voiQuayLai(dong) {
  const id = Date.now() + Math.random(); lopMo.push({ id, dong });
  try { history.pushState({ lop: id }, ""); } catch (e) {}
  return diLink => {
    const i = lopMo.findIndex(x => x.id === id); if (i < 0) return; lopMo.splice(i, 1);
    // Đóng vì bấm link sang mục khác: giữ lịch sử để không hủy bước chuyển trang
    if (!diLink && history.state && history.state.lop === id) { boQuaPop++; history.back(); }
  };
}
addEventListener("popstate", () => { if (boQuaPop) { boQuaPop--; return; } const l = lopMo.pop(); if (l) l.dong(); });
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
  addEventListener("load", () => navigator.serviceWorker.register("sw.js?v=20261010br").catch(() => {}));

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
    text = "Máy chủ dữ liệu chưa được tạo. Anh chị vào Firebase → Firestore Database → bấm Tạo cơ sở dữ liệu.";
  else if (code === "permission-denied")
    text = isAdmin ? "Máy chủ từ chối: luật bảo mật chưa đúng. Anh chị vào Firebase → Firestore → Quy tắc, dán lại luật mới rồi bấm Xuất bản."
                   : "Tài khoản này chưa có quyền làm việc đó. Nếu em đã được anh chị duyệt, hãy tải lại trang.";
  else if (code === "unavailable" || /offline|network/i.test(code + msg))
    text = "Mạng đang chập chờn nên chưa lưu được. Kiểm tra wifi/4G rồi thử lại.";
  else if (code === "failed-precondition")
    text = "Máy chủ chưa sẵn sàng. Anh chị kiểm tra Firestore Database đã được tạo chưa.";
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
// Link người dùng nhập: chỉ nhận https:// (chặn javascript:, data:…)
const linkAnToan = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || "").trim()) ? String(u).trim() : "";
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
const PAGES = ["giao-trinh", "bai-tap", "tai-khoan", "duyet", "diem-danh", "lam-viec", "thi-thu", "van-hanh"];
// Nhớ vị trí cuộn theo từng bước lịch sử: mở mục mới → lên đầu; bấm quay lại / tiến tới → về đúng chỗ đang xem
try { history.scrollRestoration = "manual"; } catch (e) {}
const viTriCuon = {}; let khoaCuon = null;
function khoaLichSu() {
  let k = history.state && history.state.k;
  if (!k) { k = Math.random().toString(36).slice(2, 10); try { history.replaceState({ ...(history.state || {}), k }, ""); } catch (e) {} }
  return k;
}
addEventListener("scroll", () => { if (khoaCuon) viTriCuon[khoaCuon] = scrollY; }, { passive: true });
// Điện thoại: nút Chì + chuông tự trượt ra mép khi cuộn xuống đọc, cuộn lên thì hiện lại (không che nội dung đang xem)
{ let yTruoc = scrollY;
  addEventListener("scroll", () => {
    const c = document.getElementById("tl-cum"), y = scrollY; if (!c) return;
    if (innerWidth > 760 || c.querySelector(".tl-khung:not([hidden])")) { c.classList.remove("tl-an"); yTruoc = y; return; }
    if (Math.abs(y - yTruoc) < 10) return;
    c.classList.toggle("tl-an", y > yTruoc && y > 160); yTruoc = y;
  }, { passive: true }); }
function route() {
  const kCu = khoaCuon, k = khoaLichSu(), yCu = kCu !== k ? viTriCuon[k] : undefined; khoaCuon = k;
  const h = location.hash.replace("#", "");
  if (h && !PAGES.includes(h)) {
    // Hash không phải trang cấp cao nhất: có thể là link "đi nhanh" tới một mục trong trang đang mở
    // (VD #ql-duyet-h trong Quản lý). Nhảy tới mục đó thay vì coi là trang lạ rồi quay về trang chủ.
    const el = document.getElementById(h);
    const trongTrangDangMo = el && el.closest("main[id^='v-']") && !el.closest("main[id^='v-']").hidden;
    if (trongTrangDangMo) { el.scrollIntoView({ block: "start" }); return; }
    // Mục nằm trong một trang khác (VD #nang-cao trong Giáo trình): mở trang đó rồi cuộn tới mục
    const trang = el && el.closest("main[id^='v-']");
    if (trang && trang.id !== "v-home" && PAGES.includes(trang.id.slice(2))) {
      history.replaceState(null, "", "#" + trang.id.slice(2)); route();
      requestAnimationFrame(() => setTimeout(() => { if (el.offsetParent) el.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60));
      return;
    }
  }
  const page = PAGES.includes(h) ? h : "home";
  $("#v-home").hidden = page !== "home";
  PAGES.forEach(p => $("#v-" + p).hidden = page !== p);
  $$("nav a.link").forEach(a => {
    const on = page === "home" ? a.getAttribute("href") === "#" + (h || "gioi-thieu") : a.dataset.nav === page;
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  $("#acc-nav").dataset.page = page;
  $$("#tab-duoi a").forEach(x => { if (x.getAttribute("href") === "#" + page) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current"); });
  $$("#acc-nav [data-acc]").forEach(a => { if (a.dataset.acc === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  // Thanh tài khoản cuộn ngang: luôn kéo mục đang mở vào giữa, không để bị cắt nửa chữ
  { const on = $("#acc-nav [aria-current='page']"), w = $("#acc-nav .wrap"); if (on && w) requestAnimationFrame(() => w.scrollTo({ left: on.offsetLeft - (w.clientWidth - on.offsetWidth) / 2, behavior: "smooth" })); }
  if (page === "home") $("#nav-acct").removeAttribute("aria-current"); else $("#nav-acct").setAttribute("aria-current", "page");
  if (window.__lvReady) { renderAccNav(); if (page === "lam-viec") lvOnShow(); }
  if (yCu !== undefined) requestAnimationFrame(() => window.scrollTo(0, yCu));
  else if (page !== "home") window.scrollTo(0, 0);
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
let lichGon = true;
function renderExams() {
  const list = LICH_THI.map(e => ({ t: e.truong, truong: e.ten, dot: e.dot, ngay: e.ngay, hien: e.hienThi, n: daysUntil(e.ngay), ct: !!e.chinhThuc, nguon: e.nguon || "" }));
  const shown = list.filter(e => examFilter === "all" || e.t === examFilter || e.t === "THPT");
  const next = shown.filter(e => e.n >= 0 && e.t !== "THPT").sort((a, b) => a.n - b.n)[0];
  if (next) {
    const w = Math.floor(next.n / 7);
    $("#cd-lead").innerHTML =
      `<div class="cd-big">${next.n}<small>ngày</small></div>
       <div><p class="eyebrow">${examFilter === "all" ? "Kỳ thi năng khiếu gần nhất" : "Kỳ thi gần nhất của trường này"}</p>
       <h3>${esc(next.truong)} <span class="chip">${esc(next.dot)}</span></h3>
       <p class="muted">Ngày thi ${next.ct ? "chính thức" : "dự kiến"} ${esc(next.hien)}/${NAM_THI}</p>
       <p style="margin-top:8px">Còn khoảng <b class="num">${w}</b> tuần. Nếu học 4 buổi mỗi tuần, em còn khoảng <b class="num">${w * 4}</b> buổi để luyện.</p></div>`;
  } else {
    $("#cd-lead").innerHTML = `<p>Mùa thi này đã kết thúc. Lớp sẽ cập nhật lịch năm sau.</p>`;
  }

  const MA = { XD: "HUCE", QG: "SIS", SP: "NUAE", MTCN: "MTCN", HAU: "HAU" };
  const mau = t => t === "THPT" ? "#8a919c" : (TRUONG[MA[t]] || {}).mau || "#5b6068";
  const tenGon = s => s.replace("ĐHQG Hà Nội · Trường KH Liên ngành & Nghệ thuật", "ĐHQG Hà Nội · KH Liên ngành & Nghệ thuật");
  const box = $("#months");
  box.className = "months lth";
  const ngays = [...new Set(shown.map(e => e.ngay))].sort();
  if (!ngays.length) { box.innerHTML = `<p class="muted">Chưa có lịch thi cho lựa chọn này.</p>`; return; }
  // Điện thoại: chỉ hiện 3 kỳ gần nhất, bấm nút mới xem cả lịch
  const gan = new Set(shown.filter(e => e.n >= 0).sort((a, b) => a.n - b.n).slice(0, 3));
  const dong = (e0, g, qua) => `<div class="lth-d"><b class="num">${esc(e0.hien)}</b><span class="num">${qua ? "Đã thi" : "Còn " + e0.n + " ngày"}</span></div>
      <ul>${g.map(e => `<li style="--c:${mau(e.t)}"><i>${esc(e.t === "THPT" ? "THPT" : MA[e.t] || e.t)}</i><span>${esc(tenGon(e.truong))}<em>${esc(e.dot)} · ${e.ct ? "✓ Chính thức" : "Dự kiến"}${e.nguon && /^https?:\/\//.test(e.nguon) ? ` · <a href="${esc(e.nguon)}" target="_blank" rel="noopener">Nguồn</a>` : ""}</em></span></li>`).join("")}</ul>`;

  // ---- Điện thoại: sơ đồ cây DỌC, thân ở giữa (hoặc bên trái khi màn hẹp) ----
  let side = 0;
  const doc = Object.keys(MONTH).map(m => {
    const evs = shown.filter(e => e.ngay.slice(5, 7) === m);
    if (!evs.length) return "";
    const ngs = [...new Set(evs.map(e => e.ngay))].sort();
    return `<div class="tl-m${evs.some(e => gan.has(e)) ? "" : " xa"}"><span>${esc(MONTH[m])}</span></div>` + ngs.map(ng => {
      const g = evs.filter(e => e.ngay === ng), e0 = g[0], qua = e0.n < 0;
      return `<div class="tl-n ${side++ % 2 ? "R" : "L"}${qua ? " past" : ""}${g.some(e => gan.has(e)) ? "" : " xa"}">
        <i class="tl-dot" style="--c:${mau(e0.t)}"></i>
        <div class="tl-card">${dong(e0, g, qua)}</div></div>`;
    }).join("");
  }).join("");

  // ---- Máy tính: dòng thời gian NẰM NGANG, thẻ so le trên – dưới trục ----
  let thangDaRa = "";
  const cot = ngays.map((ng, i) => {
    const g = shown.filter(e => e.ngay === ng), e0 = g[0], qua = e0.n < 0, tren = i % 2 === 0;
    const thang = ng.slice(5, 7);
    const nhan = thang !== thangDaRa ? (thangDaRa = thang, `<span class="lth-thang">${esc(MONTH[thang] || "")}</span>`) : "";
    const the = `<article class="lth-the">${dong(e0, g, qua)}</article>`;
    return `<div class="lth-cot${qua ? " qua" : ""}">
        <div class="lth-tren">${tren ? the + `<i class="lth-can"></i>` : ""}</div>
        <div class="lth-truc"><i class="lth-cham" style="--c:${mau(e0.t)}"></i>${nhan}</div>
        <div class="lth-duoi">${tren ? "" : `<i class="lth-can"></i>` + the}</div>
      </div>`;
  }).join("");

  const con = shown.length - gan.size;
  box.innerHTML =
    `<div class="tl lth-doc${lichGon ? " gon" : ""}">${doc}</div>
     <div class="lth-doc-more"${con > 0 ? "" : " hidden"}><button class="btn" type="button" id="lth-more">${lichGon ? `Xem cả lịch (${shown.length} kỳ thi) ▼` : "Thu gọn ▲"}</button></div>
     <div class="lth-ngang"><div class="lth-cuon" id="lth-cuon" tabindex="0" role="group" aria-label="Dòng thời gian các kỳ thi"><div class="lth-hang">${cot}</div></div>
       <p class="lth-goiy muted">Vuốt ngang hoặc giữ Shift và lăn chuột để xem hết dòng thời gian.</p></div>`;
  const nut = $("#lth-more"); if (nut) nut.onclick = () => { lichGon = !lichGon; renderExams(); };
  // Mở ra là cuộn tới kỳ thi gần nhất cho dễ nhìn
  const cuon = $("#lth-cuon"), toi = [...box.querySelectorAll(".lth-cot")].find(c => !c.classList.contains("qua"));
  if (cuon && toi) cuon.scrollLeft = Math.max(0, toi.offsetLeft - 16);
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
if (LICH_THI_CAP_NHAT) { const [y, m, d] = LICH_THI_CAP_NHAT.split("-"); $("#thi-cap-nhat").textContent = ` Cập nhật ngày ${+d}/${+m}/${y}.`; }

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
// Thẻ "Hôm nay học gì?": gom cả hai cơ sở; hôm nay nghỉ thì báo buổi gần nhất
function renderHomNay() {
  const box = $("#hom-nay"); if (!box) return;
  const buoi = d => CO_SO.flatMap(k => CA_HOC.filter(c => ((THOI_GIAN_BIEU[k] || {})[c.ma] || {})[d]).map(c => ({ cs: k, ca: c, mon: THOI_GIAN_BIEU[k][c.ma][d] })));
  const hom = todayKey(); let d = hom, ds = buoi(d), i = DAYS.indexOf(hom);
  for (let n = 1; !ds.length && n < 7; n++) { d = DAYS[(i + n) % 7]; ds = buoi(d); }
  const mon = [...new Set(ds.map(x => x.mon))];
  box.innerHTML = `<p class="eyebrow">${d === hom ? "Hôm nay · " + TEN_NGAY[d] : "Hôm nay nghỉ · buổi gần nhất " + TEN_NGAY[d]}</p>
    <ul>${ds.map(x => `<li><span class="slot ${SLOT[x.mon] || "mt2"}">${esc(x.mon)}</span> <b>${esc(x.cs.replace("Cơ sở ", ""))}</b> · ca ${esc(x.ca.ten.toLowerCase())} <span class="num muted">${esc(x.ca.gio)}</span></li>`).join("")}</ul>
    ${mon.some(m => DO_MANG[m]) ? `<p class="muted hn-mang"><b>Mang theo:</b> ${mon.filter(m => DO_MANG[m]).map(m => esc(DO_MANG[m])).join(" · ")}</p>` : ""}`;
}
renderHomNay();
$("#sched-tabs").innerHTML = CO_SO.map((k, i) => `<button class="tab" role="tab" data-s="${esc(k)}" aria-selected="${i === 0}">${esc(k)}</button>`).join("");
$$("#sched-tabs .tab").forEach(b => b.onclick = () => {
  $$("#sched-tabs .tab").forEach(x => x.setAttribute("aria-selected", x === b));
  renderSched(b.dataset.s);
});
renderSched(CO_SO[0]);

/* ================= Liên hệ & mạng xã hội ================= */
const ZALO_LOP = String(LIEN_HE.zalo || LIEN_HE.sdt || "").replace(/\D/g, "");
const ZALO_LINK = LIEN_HE.zaloLink || "https://zalo.me/" + ZALO_LOP;
const MXH = (MANG_XA_HOI || []).filter(m => m && m.link);
const mapCua = c => c.map || "https://maps.google.com/?q=" + encodeURIComponent(c.diaChi || "");
$("#lien-he").innerHTML =
  `<div><dt>Gọi quản lý</dt><dd class="num"><a href="tel:${esc(String(LIEN_HE.sdt || "").replace(/\D/g, ""))}">${esc(LIEN_HE.sdt)}</a></dd></div>
   <div><dt>Zalo tư vấn</dt><dd class="num"><a href="${esc(ZALO_LINK)}" target="_blank" rel="noopener">${esc(LIEN_HE.zaloHienThi || LIEN_HE.zalo)}</a></dd></div>
   <div><dt>Email</dt><dd>${esc(LIEN_HE.email)}</dd></div>
   ${LIEN_HE.coSo.map(c => `<div><dt>${esc(c.ten)}</dt><dd>${esc(c.diaChi)} <a class="map-link" href="${esc(mapCua(c))}" target="_blank" rel="noopener">📍 Chỉ đường</a></dd></div>`).join("")}
   ${MXH.map(m => `<div><dt>${esc(m.ten)}</dt><dd><a href="${esc(m.link)}" target="_blank" rel="noopener">${esc(m.tk || m.ten)}</a></dd></div>`).join("")}`;

/* ---------- Băng thẻ mạng xã hội: tự xoay, dừng khi người xem chạm/rê chuột, vuốt tay được ---------- */
function batMxh() {
  const box = $("#mxh"), tr = $("#mxh-track"); if (!box || !tr) return;
  if (!MXH.length) { box.hidden = true; return; }
  const ICON = {
    tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.4 2 4 4.5 4.3"/>',
    facebook: '<path d="M14 8h2.5V4.5H14a3.5 3.5 0 0 0-3.5 3.5v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5c0-.3.2-.5.5-.5z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M11 8.5c2.5-1 5 .5 4.5 3s-3 3.5-4.5 2.5M11.5 10l-2 10"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>' };
  tr.innerHTML = MXH.map((m, i) => `<a class="mxh-the mxh-${esc(m.loai)}" href="${esc(m.link)}" target="_blank" rel="noopener" data-i="${i}" aria-label="${esc(m.ten)} ${esc(m.tk || "")} (mở tab mới)">
    <span class="mxh-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[m.loai] || ICON.instagram}</svg></span>
    <span class="mxh-chu"><b>${esc(m.ten)}</b><small>${esc(m.tk || "")}</small><span class="muted">${esc(m.moTa || "")}</span></span>
    <span class="go">${esc(m.nut || "Xem")} ↗</span></a>`).join("");
  const the = [...tr.children], dots = $("#mxh-dots"), ctl = $("#mxh .mxh-ctl");
  let cur = 0, dung = false, hen = 0, vt = [];
  const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Các vị trí cuộn được (thẻ cuối có thể không cuộn tới mép trái được → gộp lại)
  const tinhVT = () => { const max = tr.scrollWidth - tr.clientWidth; vt = [...new Set(the.map(t => Math.round(Math.min(t.offsetLeft - tr.offsetLeft, max))))].filter(x => x >= 0);
    if (max <= 4) vt = [0]; ctl.hidden = vt.length < 2;
    dots.innerHTML = vt.map((_, k) => `<button type="button" aria-label="Nhóm kênh ${k + 1}"></button>`).join("");
    [...dots.children].forEach((d, k) => d.onclick = () => den(k)); cur = Math.min(cur, vt.length - 1); danh(); };
  const danh = () => [...dots.children].forEach((d, k) => d.setAttribute("aria-current", k === cur));
  const den = k => { if (vt.length < 2) return; cur = (k + vt.length) % vt.length; tr.scrollTo({ left: vt[cur], behavior: giam ? "auto" : "smooth" }); danh(); };
  tr.addEventListener("scroll", () => { clearTimeout(tr._h); tr._h = setTimeout(() => { const x = tr.scrollLeft; let g = 0; vt.forEach((v, k) => { if (Math.abs(v - x) < Math.abs(vt[g] - x)) g = k; }); cur = g; danh(); }, 90); }, { passive: true });
  const chay = () => { clearInterval(hen); if (giam) return; hen = setInterval(() => { if (!dung && !document.hidden && vt.length > 1) den(cur + 1); }, 4000); };
  // Dừng xoay khi người xem đang chạm, rê chuột hoặc dùng bàn phím trong khối
  box.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") dung = true; });
  box.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") dung = false; });
  box.addEventListener("pointerdown", () => { dung = true; clearTimeout(box._h); box._h = setTimeout(() => dung = false, 6000); });
  box.addEventListener("focusin", () => dung = true); box.addEventListener("focusout", () => dung = false);
  $("#mxh-prev").onclick = () => den(cur - 1); $("#mxh-next").onclick = () => den(cur + 1);
  addEventListener("resize", () => { clearTimeout(box._r); box._r = setTimeout(tinhVT, 150); });
  tinhVT();
  chay();
}
batMxh();

/* ================= Bài vẽ học viên ================= */
const LOAI_BAI = [
  { ten: "Cơ bản", art: "v-khoi", moTa: "Khối cơ bản, tĩnh vật, sáng tối" },
  { ten: "Hình hoạ người", img: "assets/img/hinh-hoa-nguoi.png", moTa: "Chân dung, bán thân, toàn thân" },
  { ten: "Tượng", img: "assets/img/hinh-hoa-tuong.png", moTa: "Tượng thạch cao theo các góc thi" },
  { ten: "Màu", art: "v-mau", moTa: "Bố cục trang trí màu Khối H" },
  { ten: "Mỹ thuật 2", art: "v-mt2", moTa: "Bố cục tạo hình Khối V" },
  { ten: "Tĩnh vật", art: "v-khoi", moTa: "Tĩnh vật: bình, chai, vải, trái cây" },
  { ten: "Bút sắt", art: "v-mt2", moTa: "Ký hoạ bút sắt, nét mảnh, đan nét" },
  { ten: "Mực nho", art: "v-khoi", moTa: "Mực nho: mảng đậm nhạt, loang nước" },
  { ten: "Màu nước", art: "v-mau", moTa: "Màu nước: loang, chồng lớp, giữ sáng" },
];
let galFilter = "all", galList = [], galCur = 0;
const artCard = (l, note) => `<div class="gal-art">${l.img ? `<span class="art art-img" style="-webkit-mask-image:url(${l.img});mask-image:url(${l.img})" aria-hidden="true"></span>` : `<svg class="art" aria-hidden="true"><use href="#${l.art}"/></svg>`}
  <b>${esc(l.ten)}</b><span class="muted">${esc(l.moTa)}</span><span class="soon">${note}</span></div>`;
function galTatCa() {
  // Bài anh chị đăng trên web (mới nhất trước) + bài có sẵn trong file data
  // Bài viết sẵn đã chuyển thành bài web (mã seed-ve-i) thì không hiện lần nữa
  // Bản chuyển tự động (seed-…) không hiện; bài viết sẵn trong file dữ liệu hiện như trước
  return [...BAIVE_DONG.filter(b => !String(b.id).startsWith("seed-")).sort((x, y) => (y.luc || 0) - (x.luc || 0)), ...BAI_VE];
}
// Tìm bài đăng trùng: cùng học viên + loại + ảnh (bài vẽ), hoặc cùng tiêu đề (bản tin).
// Trong mỗi nhóm giữ một bản: ưu tiên bản chuyển tự động (seed-…), không bao giờ xoá bản seed-…
function timBaiTrung() {
  const laSeed = x => String(x.id).startsWith("seed-");
  const khoa = x => String(x.hocVien || "").trim().toLowerCase() + "|" + (x.loai || "");
  const ve = BAIVE_DONG.map(b => ({ ...b, kind: "baive" }));
  // Bài đăng tay trùng với bản chuyển tự động (cùng học viên + loại) thì xoá bản đăng tay
  const coSeed = new Set(ve.filter(laSeed).map(khoa));
  const xoa = ve.filter(x => !laSeed(x) && coSeed.has(khoa(x)));
  // Bản chuyển từ danh sách "nổi bật" trùng với bản chuyển từ danh sách "bài vẽ" thì xoá bản seed-nb
  const seedVe = new Set(ve.filter(x => String(x.id).startsWith("seed-ve-")).map(khoa));
  ve.filter(x => String(x.id).startsWith("seed-nb-") && seedVe.has(khoa(x))).forEach(x => xoa.push(x));
  // Còn lại: cùng học viên + loại + cùng ảnh thì giữ bản mới nhất
  const nhom = new Map();
  ve.filter(x => !laSeed(x) && !coSeed.has(khoa(x))).forEach(x => {
    const k = khoa(x) + "|" + (x.anh ? x.anh.length : 0);
    if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(x);
  });
  for (const ds of nhom.values()) if (ds.length > 1) ds.sort((a, b) => (b.luc || 0) - (a.luc || 0)).slice(1).forEach(x => xoa.push(x));
  // Bản tin trùng tiêu đề: giữ bản chuyển tự động, không thì giữ bản mới nhất
  const tin = BANTIN_DONG.map(t => ({ ...t, kind: "bantin" }));
  const tenTin = t => String(t.tieuDe || "").trim().toLowerCase();
  const tinSeed = new Set(tin.filter(laSeed).map(tenTin));
  tin.filter(t => !laSeed(t) && tinSeed.has(tenTin(t))).forEach(t => xoa.push(t));
  const nhomTin = new Map();
  tin.filter(t => !laSeed(t) && !tinSeed.has(tenTin(t))).forEach(t => { const k = tenTin(t); if (!nhomTin.has(k)) nhomTin.set(k, []); nhomTin.get(k).push(t); });
  for (const ds of nhomTin.values()) if (ds.length > 1) ds.sort((a, b) => (b.luc || 0) - (a.luc || 0)).slice(1).forEach(x => xoa.push(x));
  return xoa;
}
function renderGallery() {
  const all = galTatCa(), has = all.length > 0;
  const count = t => all.filter(b => b.loai === t).length;
  $("#gal-filters").hidden = !has;
  if (has) $("#gal-filters").innerHTML = [`<button class="tab" data-g="all" aria-selected="${galFilter === "all"}">Tất cả <span class="num">${all.length}</span></button>`]
    .concat(LOAI_BAI.filter(l => count(l.ten) || isTeacher || galFilter === l.ten).map(l => `<button class="tab" data-g="${esc(l.ten)}" aria-selected="${galFilter === l.ten}">${esc(l.ten)} <span class="num">${count(l.ten)}</span></button>`)).join("");
  $$("#gal-filters .tab").forEach(b => b.onclick = () => { galFilter = b.dataset.g; renderGallery(); });
  // Quản lý: nút dọn bài đăng trùng (giữ bản chuyển tự động "seed-…", xoá bản đăng tay trùng; bấm 2 lần mới xoá)
  if (false && isAdmin && has) { // tạm tắt nút dọn bài trùng: không tự xoá bài của quản lý
    const trung = timBaiTrung(), n = trung.length;
    if (n) {
      $("#gal-filters").insertAdjacentHTML("beforeend", `<button type="button" class="tab" id="gal-dontrung">🧹 Xoá ${n} bài trùng</button>`);
      confirmButton($("#gal-dontrung"), async () => {
        const xoa = timBaiTrung(); if (!xoa.length) return;
        const lo = writeBatch(db);
        xoa.forEach(x => {
          // Bản trùng đang giữ hạng Top: chuyển hạng sang bản còn lại trước khi xoá
          if (String(x.id).startsWith("seed-nb-") && x.hang) {
            const giu = BAIVE_DONG.find(y => String(y.id).startsWith("seed-ve-") && String(y.hocVien).trim().toLowerCase() === String(x.hocVien).trim().toLowerCase() && y.loai === x.loai);
            if (giu) lo.set(doc(db, "baive", giu.id), { hang: x.hang, ngayTop: x.ngayTop || x.ngay || "" }, { merge: true });
          }
          lo.delete(doc(db, x.kind, x.id));
        });
        await lo.commit(); toast(`Đã xoá ${xoa.length} bài trùng.`);
      }, `Bấm lần nữa để xoá ${n} bài trùng`);
    }
  }
  if (!has) { $("#gallery").className = "gallery arts"; $("#gallery").innerHTML = LOAI_BAI.map(l => artCard(l, "Ảnh bài thật sắp cập nhật")).join(""); return; }
  galList = all.filter(b => galFilter === "all" || b.loai === galFilter);
  if (!galList.length) { gallerySig = ""; const l = LOAI_BAI.find(x => x.ten === galFilter); $("#gallery").className = "gallery arts"; $("#gallery").innerHTML = artCard(l, "Phần này chưa có ảnh"); return; }
  $("#gallery").className = "gallery";
  const xoaDuoc = b => b.id && user && (isAdmin || (isTeacher && b.nguoi === mail));
  // Không dựng lại lưới khi dữ liệu không đổi (mỗi lần tải lại trang Firestore gửi dữ liệu 2 lần, tránh phân tích lại ảnh base64 nhiều lần)
  const gSig = [galFilter, !!user, isAdmin, !!isTeacher,galList.map(b => [b.id || "", b.luc || 0, b.anh ? b.anh.length : 0, b.hang, b.hocVien, b.loai, b.moTa, b.ghiChu, b.biDanh, biDanhCua(b), b.chucVu, b.mau].join("~")).join("|")].join("#");
  if (gSig === gallerySig) return; gallerySig = gSig;
  $("#gallery").innerHTML = galList.map((b, i) =>
    `<div class="gal-o"><button type="button" class="gal-b" data-gi="${i}" aria-label="Xem lớn bài vẽ ${i + 1}"><img src="${esc(b.anh)}" alt="${esc(b.moTa || b.ghiChu || "Bài vẽ học viên")}" loading="lazy" decoding="async" width="300" height="400">
      <span class="cap">${esc(b.hocVien || "")}${biDanhCua(b) ? `<em class="bd">${esc(biDanhCua(b))}</em>` : ""}${b.loai ? `<small>${esc(b.loai)}</small>` : ""}</span>${b.hang ? `<span class="gal-top">TOP ${Number(b.hang)}</span>` : ""}</button>
      ${linkAnToan(b.link) ? `<a class="gal-link" href="${esc(linkAnToan(b.link))}" target="_blank" rel="noopener" aria-label="Mở link kèm bài">↗</a>` : ""}
      ${isAdmin && b.id ? `<button type="button" class="nb-more gal-more" data-mn="${esc(b.id)}" aria-label="Tuỳ chọn: sửa thông tin, xoá bài">⋮</button>` : xoaDuoc(b) ? `<button type="button" class="gal-x" data-xbv="${esc(b.id)}" aria-label="Xoá bài này">Xoá</button>` : ""}</div>`).join("");
  // Ô dấu cộng cuối lưới: giáo viên và quản lý bấm để đăng bài vẽ mới
  if (user && isTeacher) $("#gallery").insertAdjacentHTML("beforeend", `<div class="gal-o"><button type="button" class="gal-b gal-them" data-them aria-label="Thêm bài vẽ mới"><span class="gal-plus" aria-hidden="true">+</span><b>Thêm bài vẽ</b></button></div>`);
  $$("#gallery [data-them]").forEach(b => b.onclick = () => moDangBai());
  const ds = galList;
  $$("#gallery [data-gi]").forEach(b => b.onclick = () => { galList = ds; showLb(Number(b.dataset.gi)); });
  // Nút ⋮ của quản lý trong lưới bài vẽ: mở menu sửa thông tin/link hoặc xoá
  $$("#gallery .gal-more").forEach(bt => {
    bt.addEventListener("click", e => { e.stopPropagation(); moMenuBai(bt, BAIVE_DONG.find(y => y.id === bt.dataset.mn)); });
  });
  $$("#gallery [data-xbv]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "baive", b.dataset.xbv)), "Xoá?"));
}
function showLb(i) {
  galCur = (i + galList.length) % galList.length; const b = galList[galCur];
  $("#lb-img").src = b.anh; $("#lb-img").alt = b.moTa || "";
  $("#lb-mota").textContent = b.moTa || ""; $("#lb-mota").hidden = !b.moTa;
  $("#lb-cap").textContent = `${galCur + 1} / ${galList.length} · ${[b.hocVien, biDanhCua(b), b.loai, b.ghiChu, b.gvhd && "GVHD: " + b.gvhd, b.tgiang && "Trợ giảng: " + b.tgiang, b.chucVu && b.chucVu !== "Học viên" && "Người vẽ: " + b.chucVu, b.mau && "Bài mẫu giáo viên"].filter(Boolean).join(" · ")}`;
  if ($("#lb").hidden) lbTha = voiQuayLai(() => { lbTha = null; dongLb(); });
  $("#lb").hidden = false; document.body.classList.add("lb-mo"); // bong bóng Chì dời lên trên, không đè chữ mô tả
  window.__troLy?.goiYBai(b.hocVien ? `bài của ${b.hocVien}` : (b.loai || "bài vẽ này"));
}
$("#lb-prev").onclick = () => showLb(galCur - 1);
$("#lb-next").onclick = () => showLb(galCur + 1);
let lbTha = null;
const dongLb = () => { $("#lb").hidden = true; document.body.classList.remove("lb-mo"); window.__troLy?.anGoiYBai(); if (lbTha) { const f = lbTha; lbTha = null; f(); } };
$("#lb-close").onclick = dongLb;
$("#lb").addEventListener("click", e => { if (e.target === $("#lb")) dongLb(); });
document.addEventListener("keydown", e => {
  if ($("#lb").hidden) return;
  if (e.key === "Escape") dongLb();
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
// XP thưởng / thành tựu anh chị trao trên web (Firestore: xephang) — gộp với dữ liệu trong file
let XP_DONG = [], TT_DONG = [];
const RANK = [
  { ma: "F", xp: 0, mau: "#9aa3ad", kim: "Sắt", ten: "Người Mới", mo: "Vừa vào lớp, bắt đầu hành trình." },
  { ma: "E", xp: 100, mau: "#3fcf5b", kim: "Đồng", ten: "Tập Sự", mo: "Đã có bài đầu tiên được chọn hoặc đi học đều." },
  { ma: "D", xp: 200, mau: "#20c9a6", kim: "Thép", ten: "Học Việc", mo: "Đi học đều, bắt đầu có bài tốt." },
  { ma: "C", xp: 400, mau: "#3ec6e0", kim: "Bạc", ten: "Chăm Chỉ", mo: "Tiềm năng bắt đầu lộ rõ." },
  { ma: "B", xp: 700, mau: "#3d6bff", kim: "Vàng", ten: "Dân Chuyên", mo: "Nền tảng chắc, làm bài đầy đủ." },
  { ma: "A", xp: 1400, mau: "#9b5cff", kim: "Bạch Kim", ten: "Lão Làng", mo: "Trên mức trung bình của lớp." },
  { ma: "S", xp: 3400, mau: "#ffc400", kim: "Kim Cương", ten: "Cao Thủ", mo: "Được cả lớp công nhận." },
  { ma: "SS", xp: 5400, mau: "#ff8a1f", kim: "Tinh Anh", ten: "Đại Cao Thủ", mo: "Nhóm học viên giỏi nhất." },
  { ma: "SSS", xp: 7400, mau: "#ff3b3b", kim: "Huyền Thoại", ten: "Bậc Thầy", mo: "Rất ít người đạt được." },
  { ma: "SSS+", xp: 9400, mau: "rainbow", kim: "Thách Đấu", ten: "Huyền Thoại Thạch Thất", mo: "Đỉnh cao tuyệt đối — vượt mọi giới hạn." },
];
// Cách tính điểm kinh nghiệm (XP) — anh chị sửa số ở đây nếu muốn
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
  const nb = ten ? nbAll().filter(b => !b.tg && b.hocVien && b.ngay > RANK_BAT_DAU && bo(ten).endsWith(bo(b.hocVien))) : [];
  const top1 = nb.filter(b => b.hang === 1).length;
  const thuongDs = ten ? [...(XP_THUONG || []), ...XP_DONG].filter(x => x.hocVien && bo(ten).endsWith(bo(x.hocVien))) : [];
  const thuong = thuongDs.reduce((a, x) => a + (Number(x.xp) || 0), 0);
  const xp = buoi * XP.buoi + baiTap * XP.baiTap + baiHoc * XP.baiHoc + gioi * XP.diemGioi + nb.length * XP.noiBat + top1 * XP.top1 + thuong;
  let i = 0; RANK.forEach((r, j) => { if (xp >= r.xp) i = j; });
  const r = RANK[i], next = RANK[i + 1] || null;
  const pct = next ? Math.round((xp - r.xp) / (next.xp - r.xp) * 100) : 100;
  return { xp, r, i, next, pct, buoi, baiTap, baiHoc, gioi, nb: nb.length, top1, thuong, thuongDs, huyenThoai: thuongDs.some(x => x.huyenThoai) };
}
const huyHieu = (r, i, cls = "", ten = "") => cls === "xs"
  ? `<span class="rk-chip t${i}${r.mau === "rainbow" ? " rb" : ""}" data-rk="${esc(ten)}" role="button" tabindex="0" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}" title="Hạng ${r.ma} · ${r.kim} · ${r.ten} — xem cách leo hạng">
  <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l20 9v16c0 13-9 22-20 27C21 53 12 44 12 31V15z"/></svg><small>RANK</small><b>${r.ma}</b><i>${i >= 3 ? (i + 1) + "★" : "★".repeat(i + 1)}</i><em>${r.ten}</em></span>`
  : `<span class="rk-badge t${i} ${cls}${r.mau === "rainbow" ? " rb" : ""}" data-rk="${esc(ten)}" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}" title="Hạng ${r.ma} · ${r.kim} · ${r.ten}">
  <svg viewBox="0 0 64 64" aria-hidden="true"><path class="w" d="M6 22c6 2 10 6 12 12-6-1-10-5-12-12zM58 22c-6 2-10 6-12 12 6-1 10-5 12-12z"/><path class="s" d="M32 6l20 9v16c0 13-9 22-20 27C21 53 12 44 12 31V15z"/></svg>
  <b>${r.ma}</b><i>${"★".repeat(i + 1)}</i></span>`;
function theRank(t) {
  return `<div class="rk-card t${t.i}" style="--rc:${t.r.mau === "rainbow" ? "#ffd6ff" : t.r.mau}">
    ${khungAvatar(t.r, t.i, (myHv && myHv.ten) || (user && user.displayName), myAvatar || (user && user.photoURL), "lg")}
    <div class="rk-in"><p class="eyebrow">Hạng của em</p><h3>Hạng ${t.r.ma} <span>· ${t.r.kim} · ${t.r.ten}</span></h3>
      <div class="rk-bar"><i style="width:${t.pct}%"></i></div>
      <p class="rk-sub"><b class="num">${t.xp} XP</b>${t.next ? ` · còn <b class="num">${t.next.xp - t.xp} XP</b> nữa lên hạng ${t.next.ma}` : " · đã đạt hạng cao nhất!"}</p>
      <ul class="rk-chi"><li>${t.buoi} buổi đi học</li><li>${t.baiTap} bài tập đã nộp</li><li>${t.baiHoc} bài giáo trình</li><li>${t.gioi} bài điểm ≥ 8</li><li>${t.nb} bài nổi bật</li>${t.thuong ? `<li>+${t.thuong} XP thưởng</li>` : ""}</ul>
      <button class="btn small rk-mo" type="button" data-rk="">Xem bảng hạng & cách leo rank</button>
      <details class="rk-cach"><summary>Cách leo hạng ▾</summary>
        <p>Mỗi buổi đi học +${XP.buoi} XP · nộp 1 bài tập +${XP.baiTap} · học xong 1 bài giáo trình +${XP.baiHoc} · bài được chấm từ 8 điểm +${XP.diemGioi} · có bài lên Top nổi bật +${XP.noiBat} (Top 1 thêm +${XP.top1}).</p>
        <div class="rk-list">${RANK.map((r, j) => `<span class="${j === t.i ? "on" : ""}">${huyHieu(r, j, "sm")}<small>${r.xp}+</small></span>`).join("")}</div>
      </details></div></div>`;
}

const KIM_LOAI = [["#f2f4f7", "#8c939d", "#3a3f47"], ["#ffe2c4", "#b9774a", "#4a2a17"], ["#e6fff9", "#5fb3a3", "#1f4a42"], ["#ffffff", "#b9c3cf", "#4b535e"], ["#fff3c4", "#d9a63a", "#5a3c0c"],
  ["#ffffff", "#c9c2e8", "#4a4366"], ["#fff6cf", "#f0b72e", "#6b4300"], ["#ffe6c7", "#f08a2a", "#5c2200"], ["#ffe1d6", "#e0473f", "#4a0508"], ["#ffffff", "#f3b6ff", "#5b2a6e"]];
/* Khung thẻ bài nổi bật theo hạng: viền, góc móc, thanh ngang giữa ảnh và tên (tự vẽ) */
function khungThe(r, i) {
  const id = "kt" + Math.random().toString(36).slice(2, 8), c = r.mau === "rainbow" ? "#ff9cf5" : r.mau, KL = KIM_LOAI[i];
  const M = `url(#${id}m)`, A = `url(#${id}a)`;
  const defs = `<defs><linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${KL[0]}"/><stop offset=".5" stop-color="${KL[1]}"/><stop offset="1" stop-color="${KL[2]}"/></linearGradient>
    <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".75"/></linearGradient>${r.mau === "rainbow" ? `<linearGradient id="${id}r"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffc400"/><stop offset=".5" stop-color="#3fcf5b"/><stop offset=".75" stop-color="#3ec6e0"/><stop offset="1" stop-color="#9b5cff"/></linearGradient>` : ""}</defs>`;
  // thanh ngang (càng cao càng nhiều chi tiết)
  const t = [];
  t.push(`<rect x="8" y="13.5" width="284" height="${i >= 3 ? 3.5 : 2.2}" rx="1" fill="${M}"/>`);
  if (i >= 2) t.push(`<rect x="34" y="19" width="232" height="1.2" fill="${M}" opacity=".8"/><path d="M8 13.5l-6 4 6 4M292 13.5l6 4-6 4" fill="none" stroke="${M}" stroke-width="2"/>`);
  if (i >= 1) t.push(`<path d="M128 13l22 13 22-13h-7l-15 8-15-8z" fill="${M}"/>`);
  if (i >= 4) t.push(`<path d="M116 15l16 8 18 11 18-11 16-8z" fill="${A}" opacity=".9"/><path d="M58 15l6-6 6 6-6 6zM230 15l6-6 6 6-6 6z" fill="${A}" stroke="#fff" stroke-width=".6"/>`);
  if (i >= 3) t.push(`<path d="M150 3l8 11-8 11-8-11z" fill="${A}" stroke="#fff" stroke-width=".8"/><path d="M150 3l3 11-3 11" fill="#fff" opacity=".4"/>`);
  if (i >= 5) t.push(`<circle cx="36" cy="15" r="5" fill="${A}" stroke="${M}" stroke-width="2"/><circle cx="264" cy="15" r="5" fill="${A}" stroke="${M}" stroke-width="2"/><path d="M84 15c20-10 40-12 54-10M216 15c-20-10-40-12-54-10" fill="none" stroke="${M}" stroke-width="2"/>`);
  if (i >= 6) t.push(`<path d="M132 24l18 14 18-14-8 1-10 7-10-7zM96 18l-14 8h20zM204 18l14 8h-20z" fill="${M}"/>`);
  if (i >= 7) t.push(`<path d="M2 15C-2 6 4-2 14-4c-6 5-8 12-4 19zM298 15c4-9-2-17-12-19 6 5 8 12 4 19z" fill="${M}" stroke="${c}" stroke-width=".6"/>`);
  if (r.mau === "rainbow") t.push(`<rect x="8" y="13.5" width="284" height="3.5" rx="1" fill="url(#${id}r)" opacity=".65"/>`);
  const thanh = `<svg class="kt-thanh" viewBox="-6 -8 312 48" aria-hidden="true">${defs}${t.join("")}</svg>`;
  // góc trên (trái, phải đối xứng) — kim loại 2 tông (mép sáng + mép tối), dải màu khảm, mũi móc vuốt nhọn
  const g = [], d = [], k0 = KL[0], k2 = KL[2], W = i >= 4 ? 7 : 5, L = i >= 4 ? 92 : 70;
  if (i >= 1) {
    g.push(`<path d="M0 ${L}V22C0 9 9 0 22 0H${L}v${W}H24C13 ${W} ${W} 13 ${W} 24V${L}z" fill="${M}"/>`);
    g.push(`<path d="M.8 ${L}V22C.8 9.5 9.5 .8 22 .8H${L}" fill="none" stroke="${k0}" stroke-width=".9" opacity=".9"/>`);
    g.push(`<path d="M${W - .6} ${L}V24C${W - .6} 14 14 ${W - .6} 24 ${W - .6}H${L}" fill="none" stroke="${k2}" stroke-width=".9"/>`);
  }
  if (i >= 2) g.push(`<path d="M${W / 2} ${L - 2}V23C${W / 2} 12 12 ${W / 2} 23 ${W / 2}H${L - 2}" fill="none" stroke="${c}" stroke-width="${i >= 4 ? 1.8 : 1.3}"/>`);
  if (i >= 3) g.push(`<path d="M${L} 0c6 0 10 2 13 6-1 5-4 9-9 12 2-4 2-7 0-9-1-2-3-3-4-3z" fill="${M}" stroke="${k2}" stroke-width=".5"/><path d="M0 ${L}c0 6 2 10 6 13 5-1 9-4 12-9-4 2-7 2-9 0-2-1-3-3-3-4z" fill="${M}" stroke="${k2}" stroke-width=".5"/>`);
  if (i >= 5) g.push(`<path d="M9 40C10 24 22 10 40 8c-6 4-10 8-12 13-9 3-15 10-19 19z" fill="${M}" stroke="${k2}" stroke-width=".5"/><path d="M14 31c4-8 10-13 18-15" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M9 9l7-2-2 7-7 2z" fill="${A}" stroke="#fff" stroke-width=".6"/>`);
  if (i >= 7) g.push(`<path d="M30 8c12-3 24 0 32 8-9-3-19-4-30-1z" fill="${A}"/>`);
  // lưỡi trăng khuyết vươn lên từ hai góc dưới (A+)
  if (i >= 4) {
    d.push(`<path d="M0 30C4 58 22 80 56 94H40C18 86 4 66 0 46z" fill="${M}"/><path d="M1 36C6 60 22 80 50 92" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M0 30C4 58 22 80 56 94" fill="none" stroke="${k0}" stroke-width=".8" opacity=".85"/>`);
    if (i >= 6) d.push(`<path d="M0 62C8 78 20 88 36 94H24C12 88 4 80 0 72z" fill="#14161d" stroke="${M}" stroke-width="1"/>`);
  }
  const goc = (g.length ? `<svg class="kt-goc l" viewBox="0 0 110 110" aria-hidden="true">${defs}${g.join("")}</svg><svg class="kt-goc r" viewBox="0 0 110 110" aria-hidden="true">${defs.replaceAll(id, id + "b")}${g.join("").replaceAll(id, id + "b")}</svg>` : "")
    + (d.length ? `<svg class="kt-duoi l" viewBox="0 0 96 96" aria-hidden="true">${defs.replaceAll(id, id + "d")}${d.join("").replaceAll(id, id + "d")}</svg><svg class="kt-duoi r" viewBox="0 0 96 96" aria-hidden="true">${defs.replaceAll(id, id + "e")}${d.join("").replaceAll(id, id + "e")}</svg>` : "");
  // huy hiệu tròn ở đáy (S+)
  const day = i >= 5 ? `<svg class="kt-day" viewBox="0 0 40 40" aria-hidden="true">${defs.replaceAll(id, id + "c")}<circle cx="20" cy="20" r="15" fill="#0b0d14" stroke="${M.replace(id, id + "c")}" stroke-width="3"/><path d="M20 9l6 11-6 11-6-11z" fill="${A.replace(id, id + "c")}"/></svg>` : "";
  return `<span class="kt t${i}${r.mau === "rainbow" ? " rb" : ""}" style="--rc:${c};--k0:${KL[0]};--k1:${KL[1]};--k2:${KL[2]}" aria-hidden="true">${goc}${thanh}${day}</span>`;
}
/* Huy hiệu riêng "HUYỀN THOẠI CỦA LỚP" (tự vẽ): khiên đỏ thẫm, vương miện vàng, đôi cánh, dải băng */
function logoHuyenThoai(cls = "") {
  const id = "ht" + Math.random().toString(36).slice(2, 8);
  const canh = `<path d="M78 30C56 17 30 13 4 19c22 6 44 13 68 22z"/><path d="M76 41C54 34 30 33 8 41c22 5 44 8 66 10z"/><path d="M76 52c-18 0-38 4-54 13 19-1 37-3 52-6z"/>`;
  return `<span class="ht-logo ${cls}" title="Huyền thoại của lớp Thạch Thất"><svg viewBox="0 -4 200 96" aria-hidden="true">
    <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".5" stop-color="#f0b72e"/><stop offset="1" stop-color="#7a4a00"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".55" stop-color="#b3101e"/><stop offset="1" stop-color="#3a0006"/></linearGradient>
      <radialGradient id="${id}d" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#4a0a12"/><stop offset="1" stop-color="#12030a"/></radialGradient></defs>
    <g fill="url(#${id}g)" stroke="#3a2400" stroke-width=".8">${canh}<g transform="matrix(-1 0 0 1 200 0)">${canh}</g></g>
    <path d="M87 20l3-13 6 7 4-10 4 10 6-7 3 13q-13-4-26 0z" fill="url(#${id}g)" stroke="#3a2400" stroke-width=".8"/>
    <circle cx="100" cy="2.5" r="2.4" fill="#ff4d5e" stroke="#fff6cf" stroke-width=".6"/>
    <circle cx="100" cy="43" r="24" fill="url(#${id}d)" stroke="url(#${id}g)" stroke-width="4"/>
    <circle cx="100" cy="43" r="19.5" fill="none" stroke="#f0b72e" stroke-width=".8" opacity=".8"/>
    <path d="M100 63c-11-4-16-13-13-24 4 7 8 11 13 13zM100 63c11-4 16-13 13-24-4 7-8 11-13 13z" fill="url(#${id}g)" stroke="#3a2400" stroke-width=".6"/>
    <path d="M100 19l9 18-9 24-9-24z" fill="url(#${id}r)" stroke="url(#${id}g)" stroke-width="1.4"/>
    <path d="M100 19v42M91 37h18M100 19l-4 18 4 24M100 19l4 18-4 24" fill="none" stroke="#fff" stroke-width=".55" opacity=".55"/>
    <path d="M100 21l3 15h-6z" fill="#fff" opacity=".45"/>
    <path d="M46 70h108l-7 8 7 8H46l7-8z" fill="url(#${id}r)" stroke="url(#${id}g)" stroke-width="1.8"/>
    <text x="100" y="81.5" text-anchor="middle" class="ht-chu">HUYỀN THOẠI</text></svg></span>`;
}
/* Khung avatar theo hạng — tự vẽ, hạng càng cao khung càng cầu kỳ */
const chuCai = t => String(t || "").trim().split(/\s+/).slice(-2).map(w => w[0] || "").join("").toUpperCase() || "?";
/* Ảnh đại diện: ảnh em tự đổi (Tài khoản) → ảnh Google → ảnh anh chị đặt sẵn trong data */
// Mỗi tài khoản một ảnh riêng: lưu theo Gmail (máy dùng chung không bị lẫn ảnh của người khác)
let myAvatar = "";
const AVA_KEY = m => "lvtt-avatar:" + String(m || "").toLowerCase();
try { localStorage.removeItem("lvtt-avatar"); } catch (e) {} // khoá cũ dùng chung cho mọi tài khoản — bỏ
function napAvatarMay(m) { myAvatar = ""; if (!m) return; try { myAvatar = localStorage.getItem(AVA_KEY(m)) || ""; } catch (e) {} }
const boDau = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
function anhCua(ten) {
  try { // myHv/user khai báo phía sau: lúc trang mới mở thì bỏ qua
    const me = (myHv && myHv.ten) || (user && user.displayName);
    if (ten && me && boDau(ten) === boDau(me) && (myAvatar || (user && user.photoURL))) return myAvatar || user.photoURL;
  } catch (e) {}
  const k = Object.keys(AVATAR || {}).find(n => boDau(n) === boDau(ten));
  return k ? AVATAR[k] : "";
}
function khungAvatar(r, i, ten = "", anh = "", cls = "") {
  const id = "ka" + Math.random().toString(36).slice(2, 8), c = r.mau === "rainbow" ? "#ff9cf5" : r.mau;
  // kim loại của khung theo hạng: thép → đồng → bạc → vàng → bạch kim → vàng ròng…
  const KL = KIM_LOAI[i];
  const M = `url(#${id}m)`, A = `url(#${id}a)`, g = [];
  const la = (cx, cy, rot, s = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${6.6 * s}" ry="${2.6 * s}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  // nhành nguyệt quế hai bên (E+)
  if (i >= 1) { const L = []; for (let k = 0; k < 5; k++) { const t = (118 + k * 11) * Math.PI / 180, x = 50 + 47 * Math.cos(t), y = 48 + 47 * Math.sin(t), rot = (118 + k * 11) + 90 + 28;
      L.push(la(x.toFixed(1), y.toFixed(1), rot, 1 - k * .08), la((100 - x).toFixed(1), y.toFixed(1), 180 - rot, 1 - k * .08)); }
    g.push(`<g fill="${M}" stroke="${KL[2]}" stroke-width=".4">${L.join("")}</g>`); }
  // mũi giáo + ngọc trên đỉnh (C+)
  if (i >= 2) g.push(`<path d="M50-10l4 9-4 10-4-10z" fill="${M}" stroke="${KL[2]}" stroke-width=".5"/><path d="M44 6q6-5 12 0" fill="none" stroke="${M}" stroke-width="2"/><circle cx="50" cy="3" r="2.6" fill="${A}" stroke="#fff" stroke-width=".5"/>`);
  // ngọc hai bên trong giá đỡ (B+)
  if (i >= 3) g.push(`<g><path d="M3 41q-6 7 0 14M97 41q6 7 0 14" fill="none" stroke="${M}" stroke-width="2.2"/><path d="M2 48l5-6 5 6-5 6zM88 48l5-6 5 6-5 6z" fill="${A}" stroke="#fff" stroke-width=".6"/></g>`);
  // lưỡi cánh hai lớp (A+)
  if (i >= 4) g.push(`<path d="M6 30C-7 42-8 62 4 76c-5-14-4-30 2-46zM94 30c13 12 14 32 2 46 5-14 4-30-2-46z" fill="${M}" stroke="${KL[2]}" stroke-width=".5"/><path d="M-1 22c-15 16-15 44 1 62-9-19-9-41-1-62zM101 22c15 16 15 44-1 62 9-19 9-41 1-62z" fill="${M}" opacity=".75"/>`);
  // vương miện (S+)
  if (i >= 5) g.push(`<path d="M31 11l1-12 8 7 10-12 10 12 8-7 1 12q-19-6-38 0z" fill="${M}" stroke="${KL[2]}" stroke-width=".6"/><circle cx="32" cy="-1" r="1.8" fill="${A}"/><circle cx="68" cy="-1" r="1.8" fill="${A}"/><circle cx="50" cy="-6" r="2.4" fill="${A}" stroke="#fff" stroke-width=".5"/>`);
  // lưỡi lửa phía dưới (SS+)
  if (i >= 6) g.push(`<path d="M20 84C8 82 2 70 5 58c3 8 8 12 14 12-3 5-2 10 1 14zM80 84c12-2 18-14 15-26-3 8-8 12-14 12 3 5 2 10-1 14z" fill="${A}" opacity=".9"/><path d="M27 92c-8 1-14-3-17-9 6 2 11 1 15-3z M73 92c8 1 14-3 17-9-6 2-11 1-15-3z" fill="${M}"/>`);
  // sừng + ngọc đáy (SS+)
  if (i >= 7) g.push(`<path d="M28 14C15 9 9-2 12-14c3 11 10 17 20 19zM72 14c13-5 19-16 16-28-3 11-10 17-20 19z" fill="${M}" stroke="${KL[2]}" stroke-width=".6"/><circle cx="50" cy="101" r="5.5" fill="#07080c" stroke="${M}" stroke-width="2"/><circle cx="50" cy="101" r="2.4" fill="${A}"/>`);
  anh = anh || anhCua(ten);
  const nen = anh ? `<image href="${esc(anh)}" x="14" y="12" width="72" height="72" clip-path="url(#${id}c)" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="50" y="56.5" text-anchor="middle" class="ka-chu" fill="${M}">${esc(chuCai(ten))}</text>`;
  const notch = i >= 3 ? [...Array(12)].map((_, k) => `<circle cx="50" cy="8.6" r=".9" transform="rotate(${k * 30 + 15} 50 48)"/>`).join("") : "";
  return `<span class="ka t${i}${r.mau === "rainbow" ? " rb" : ""} ${cls}" style="--rc:${c}" title="Khung hạng ${r.ma} · ${r.kim}"><svg viewBox="-18 -18 136 132" aria-hidden="true">
    <defs><clipPath id="${id}c"><circle cx="50" cy="48" r="36"/></clipPath>
      <linearGradient id="${id}m" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${KL[0]}"/><stop offset=".5" stop-color="${KL[1]}"/><stop offset="1" stop-color="${KL[2]}"/></linearGradient>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".7"/></linearGradient>
      <radialGradient id="${id}b" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#1b2030"/><stop offset=".8" stop-color="#090b11"/><stop offset="1" stop-color="${c}" stop-opacity=".35"/></radialGradient></defs>
    ${g.join("")}
    <circle cx="50" cy="48" r="36" fill="url(#${id}b)"/>${nen}
    <circle cx="50" cy="48" r="43.4" fill="none" stroke="${KL[0]}" stroke-width=".6" opacity=".55"/>
    <circle cx="50" cy="48" r="40" fill="none" stroke="${M}" stroke-width="${i >= 5 ? 6.5 : 5.5}"/>
    <circle cx="50" cy="48" r="40" fill="none" stroke="#000" stroke-width=".6" stroke-dasharray="1 5.3" opacity=".35"/>
    <g fill="${KL[0]}" opacity=".8">${notch}</g>
    <circle cx="50" cy="48" r="36.6" fill="none" stroke="${i ? c : KL[1]}" stroke-width="1.1"/>
    <path d="M31 84h38l5 6.5-5 6.5H31l-5-6.5z" fill="#07080c" stroke="${M}" stroke-width="1.6"/>
    <text x="50" y="93.6" text-anchor="middle" class="ka-ma" fill="${i ? A : KL[0]}">${r.ma}</text></svg></span>`;
}

/* ================= Thành tựu (trọn đời, 4 cấp Đồng → Bạc → Vàng → Kim Cương) ================= */
const G = { // biểu tượng tự vẽ cho từng thành tựu
  mau: '<path d="M32 12c-12 0-22 8-22 19 0 8 6 12 12 12 3 0 4 2 4 4 0 4 3 6 7 6 12 0 21-9 21-21S45 12 32 12z"/><circle cx="21" cy="28" r="3.6" class="h"/><circle cx="30" cy="20" r="3.6" class="h"/><circle cx="41" cy="21" r="3.6" class="h"/><circle cx="46" cy="31" r="3.6" class="h"/>',
  hinhhoa: '<path d="M44 8l12 12-28 28-15 3 3-15z"/><path d="M16 36l12 12" class="h2"/><path d="M40 12l12 12" class="h2"/><path d="M8 56c8-2 14-2 20 0" class="h2"/>',
  bocuc: '<circle cx="19" cy="19" r="11"/><rect x="36" y="8" width="20" height="20" rx="2" opacity=".75"/><path d="M32 30l20 26H12z" opacity=".9"/><path d="M6 60h52" class="h2"/>',
  chuyencan: '<path d="M33 6c2 10 14 14 14 28 0 10-7 18-15 18s-15-8-15-17c0-8 5-12 7-17 2 5 4 7 7 8-1-8 0-14 2-20z"/><path d="M32 52c-5 0-8-4-8-8 0-5 4-7 5-11 3 4 11 7 11 12 0 4-3 7-8 7z" class="h"/>',
  diemvang: '<circle cx="30" cy="34" r="20"/><circle cx="30" cy="34" r="13" class="h"/><circle cx="30" cy="34" r="6"/><path d="M30 34L54 10M46 10h8v8" class="h2"/>',
  noibat: '<rect x="8" y="12" width="48" height="40" rx="3"/><rect x="14" y="18" width="36" height="28" rx="1" class="h"/><path d="M32 22l3.2 6.6 7.2 1-5.2 5 1.3 7.2L32 38.4 25.5 41.8l1.3-7.2-5.2-5 7.2-1z"/>',
  quanquan: '<path d="M8 22l12 10 12-20 12 20 12-10-5 26H13z"/><rect x="13" y="50" width="38" height="6" rx="2"/><circle cx="8" cy="20" r="4"/><circle cx="32" cy="10" r="4"/><circle cx="56" cy="20" r="4"/>',
  chamchi: '<path d="M18 50C8 42 6 28 12 16M46 50c10-8 12-22 6-34" class="h2"/><path d="M12 22l-5-3M10 30l-6 0M12 38l-6 3M52 22l5-3M54 30l6 0M52 38l6 3" class="h2"/><path d="M34 10L22 34h10l-4 20 14-26H32z"/>',
  thithu: '<path d="M32 12L4 24l28 12 28-12z"/><path d="M16 30v12c0 5 8 9 16 9s16-4 16-9V30L32 37z" opacity=".85"/><path d="M56 26v16" class="h2"/><circle cx="56" cy="44" r="3"/>',
};
const THANH_TUU = [
  { ma: "mau", ten: "Hoạ Sĩ Sắc Màu", mo: "Nộp bài tập màu / trang trí màu", dv: "bài màu", moc: [25, 75, 150, 250], mau: "#ff5fa2" },
  { ma: "hinhhoa", ten: "Bàn Tay Than Chì", mo: "Nộp bài hình hoạ: tượng, chân dung, tĩnh vật", dv: "bài hình hoạ", moc: [25, 75, 150, 250], mau: "#c9d1dc" },
  { ma: "bocuc", ten: "Kiến Trúc Sư Bố Cục", mo: "Nộp bài bố cục, sắc độ, Mỹ thuật 2", dv: "bài bố cục", moc: [25, 75, 150, 250], mau: "#57a6ff" },
  { ma: "chuyencan", ten: "Ngọn Lửa Chuyên Cần", mo: "Đi học đầy đủ (anh chị điểm danh có mặt)", dv: "buổi", moc: [50, 150, 300, 500], mau: "#ff7a2f" },
  { ma: "diemvang", ten: "Điểm Vàng", mo: "Bài được anh chị chấm từ 8 điểm", dv: "bài ≥ 8đ", moc: [15, 50, 125, 250], mau: "#ffd23f" },
  { ma: "noibat", ten: "Ngôi Sao Phòng Tranh", mo: "Có bài lên mục Bài vẽ nổi bật", dv: "bài nổi bật", moc: [5, 15, 50, 100], mau: "#b98cff" },
  { ma: "quanquan", ten: "Quán Quân Tuần", mo: "Bài đạt Top 1 Bài vẽ nổi bật", dv: "lần Top 1", moc: [5, 15, 25, 50], mau: "#ffc400" },
  { ma: "chamchi", ten: "Top Chăm Chỉ", mo: "Anh chị trao cho học viên chăm nhất tháng", dv: "lần được trao", moc: [5, 15, 30, 50], mau: "#4fe0a6", trao: true },
  { ma: "thithu", ten: "Thủ Khoa Thi Thử", mo: "Điểm cao nhất một đợt thi thử", dv: "lần thủ khoa", moc: [5, 10, 15, 25], mau: "#ff4d5e", trao: true },
];
const CAP = [{ ten: "Chưa mở", mau: "#3a3f4b" }, { ten: "Đồng", mau: "#d08a52" }, { ten: "Bạc", mau: "#dfe6f0" }, { ten: "Vàng", mau: "#ffcf3a" }, { ten: "Kim Cương", mau: "#7ff3ff" }];
function tinhThanhTuu(dd, prog, fb, ten, hw = []) {
  const bo = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase().trim();
  const cua = x => ten && x && bo(ten).endsWith(bo(x));
  const loai = t => { t = bo(t); return /bo cuc|my thuat 2|\bmt2\b|sac do/.test(t) ? "bocuc" : /\bmau\b|trang tri/.test(t) ? "mau" : /hinh hoa|tuong|chan dung|tinh vat|ky hoa|dung hinh|khoi|than chi/.test(t) ? "hinhhoa" : ""; };
  const dem = { mau: 0, hinhhoa: 0, bocuc: 0, chuyencan: 0, diemvang: 0, noibat: 0, quanquan: 0, chamchi: 0, thithu: 0 };
  const nop = (prog || {}).baitap || {};
  hw.forEach(h => { if (nop[h.id]) { const l = loai([h.ten, h.khoa, h.lop].join(" ")); if (l) dem[l]++; } });
  const nb = nbAll().filter(b => !b.tg && cua(b.hocVien));
  nb.forEach(b => { const l = loai(b.loai + " " + (b.ghiChu || "")); if (l) dem[l]++; });
  dem.noibat = nb.length; dem.quanquan = nb.filter(b => b.hang === 1).length;
  dem.chuyencan = Object.entries(dd || {}).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}_/.test(k) && v === "co").length;
  dem.diemvang = Object.values(fb || {}).filter(x => x && soDiem(x.diem) !== null && soDiem(x.diem) >= 8).length;
  const trao = [...(THANH_TUU_TRAO || []), ...TT_DONG].filter(x => cua(x.hocVien));
  trao.forEach(x => { if (x.ma in dem) dem[x.ma] += Number(x.so) || 1; });
  return THANH_TUU.map(a => {
    const n = dem[a.ma], cap = a.moc.filter(m => n >= m).length, toi = a.moc[cap] || null;
    return { ...a, n, cap, toi, pct: toi ? Math.round(n / toi * 100) : 100, ghi: trao.filter(x => x.ma === a.ma).map(x => x.ghiChu).filter(Boolean) };
  });
}
const UU_TIEN = ["thithu", "quanquan", "chamchi", "noibat", "diemvang", "chuyencan", "mau", "hinhhoa", "bocuc"];
const ttNoiNhat = ten => tinhThanhTuu(null, null, null, ten).filter(a => a.cap).sort((a, b) => b.cap - a.cap || UU_TIEN.indexOf(a.ma) - UU_TIEN.indexOf(b.ma)).slice(0, 1);
const huyHieuTT = (a, cap, cls = "") => `<span class="tt-em ${cls}${cap ? "" : " khoa"}" style="--tc:${a.mau};--cc:${CAP[cap].mau}" title="${a.ten}${cap ? " · " + CAP[cap].ten : " · chưa mở khoá"}">
  <svg viewBox="0 0 64 64" aria-hidden="true"><g class="ray">${[...Array(12)].map((_, k) => `<path d="M32 1l2 7h-4z" transform="rotate(${k * 30} 32 32)"/>`).join("")}</g><circle class="ring" cx="32" cy="32" r="25"/><g class="gl" transform="translate(13.5 13.5) scale(.58)">${G[a.ma]}</g></svg>${cap ? `<i>${["", "I", "II", "III", "IV"][cap]}</i>` : ""}</span>`;
function theThanhTuu(ds) {
  const mo = ds.filter(a => a.cap).length;
  return `<div class="tt-card"><div class="tt-head"><p class="eyebrow">Thành tựu của em</p><b class="num">${mo}/${ds.length}</b></div>
    <div class="tt-grid">${ds.map(a => `<div class="tt-it${a.cap ? " mo" : ""}">${huyHieuTT(a, a.cap)}<b>${a.ten}</b>
      <span class="tt-cap" style="--cc:${CAP[a.cap].mau}">${a.cap ? "Cấp " + CAP[a.cap].ten : "Chưa mở"}</span>
      <small>${a.toi ? `${a.n}/${a.toi} ${a.dv} → ${CAP[a.cap + 1].ten}` : "Đã đạt cấp cao nhất"}</small>
      <span class="tt-bar"><i style="width:${Math.min(100, a.pct)}%"></i></span>${a.ghi.length ? `<em>${a.ghi.map(esc).join(" · ")}</em>` : ""}</div>`).join("")}</div></div>`;
}

/* Bảng xếp hạng công khai trên trang chủ */
const bangRankHTML = () => `<div class="xh-row xh-th" role="row"><span>Hạng</span><span>Huy hiệu</span><span>Mô tả</span><span>Cần</span></div>` +
    RANK.map((r, i) => `<div class="xh-row t${i}" role="row" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}">
      <b class="xh-ma${r.mau === "rainbow" ? " rb" : ""}">${r.ma}<small> RANK</small></b>${huyHieu(r, i, "sm")}
      <span class="xh-mo"><b><span class="xh-kim">${r.kim}</span> ${r.ten}</b><span>${r.mo}</span><i>${"★".repeat(i + 1)}</i></span><span class="xh-xp num">${r.xp} XP</span></div>`).join("");
// Các hạng trên trang Xếp hạng: một vòng xoay thẻ (gọn hơn bảng dài)
const bangVongHTML = () => `<div class="gv-ring rk-ring" aria-roledescription="vòng xoay" aria-label="Các hạng">
    <div class="gv-stage rk-stage">${RANK.map((r, i) => `<article class="gv rk-card" data-i="${i}" style="--rc:${r.mau === "rainbow" ? "#ffd6ff" : r.mau}" aria-roledescription="thẻ" aria-label="${i + 1} / ${RANK.length}: ${esc(r.kim)} ${esc(r.ten)}">
      <div class="gv-in rk-in">
        <span class="rk-top"><b class="xh-ma${r.mau === "rainbow" ? " rb" : ""}">${r.ma}<small> RANK</small></b>${huyHieu(r, i, "sm")}</span>
        <b class="rk-ten"><span class="xh-kim">${esc(r.kim)}</span> ${esc(r.ten)}</b>
        <span class="rk-mo">${esc(r.mo)}</span>
        <i class="rk-star">${"★".repeat(i + 1)}</i>
        <span class="rk-xp num">${r.xp} XP</span>
      </div></article>`).join("")}</div>
    <div class="gv-ctl">
      <button type="button" class="gv-nav" id="rk-prev" aria-label="Hạng trước">‹</button>
      <div class="gv-dots" id="rk-dots">${RANK.map((r, i) => `<button type="button" data-i="${i}" aria-label="${esc(r.kim)} ${esc(r.ten)}"></button>`).join("")}</div>
      <button type="button" class="gv-nav" id="rk-next" aria-label="Hạng sau">›</button>
    </div></div>`;
const cachXpHTML = () => `<ul class="xh-xpl">
    <li><b>+${XP.buoi}</b><span>Mỗi buổi đi học (anh chị điểm danh có mặt)</span></li>
    <li><b>+${XP.baiTap}</b><span>Mỗi bài tập đã nộp</span></li>
    <li><b>+${XP.baiHoc}</b><span>Mỗi bài giáo trình học xong</span></li>
    <li><b>+${XP.diemGioi}</b><span>Mỗi bài được chấm từ 8 điểm</span></li>
    <li><b>+${XP.noiBat}</b><span>Có bài lên Bài vẽ nổi bật</span></li>
    <li><b>+${XP.top1}</b><span>Thêm nếu bài đạt Top 1</span></li></ul>`;
const ttCardHTML = a => `${huyHieuTT(a, 4, "lg")}<b>${a.ten}</b><span>${a.mo}</span>
      <ol>${a.moc.map((m, j) => `<li style="--cc:${CAP[j + 1].mau}"><i>${CAP[j + 1].ten}</i>${m} ${a.dv}</li>`).join("")}</ol>${a.trao ? `<small>Anh chị trao</small>` : ""}`;
// Thành tựu cần săn trên trang Xếp hạng: vòng xoay thẻ (giống các hạng)
const thanhTuuVongHTML = () => `<h3>Thành tựu cần săn</h3><p class="muted">Thành tựu giữ trọn đời. Mỗi thành tựu có 4 cấp: <b style="color:${CAP[1].mau}">Đồng</b> → <b style="color:${CAP[2].mau}">Bạc</b> → <b style="color:${CAP[3].mau}">Vàng</b> → <b style="color:${CAP[4].mau}">Kim Cương</b>.</p>
    <div class="gv-ring tt-ring" aria-roledescription="vòng xoay" aria-label="Thành tựu cần săn">
      <div class="gv-stage tt-stage">${THANH_TUU.map((a, i) => `<article class="gv tt-s tt-car" data-i="${i}" style="--tc:${a.mau}" aria-roledescription="thẻ" aria-label="${i + 1} / ${THANH_TUU.length}: ${esc(a.ten)}">${ttCardHTML(a)}</article>`).join("")}</div>
      <div class="gv-ctl">
        <button type="button" class="gv-nav" id="tt-prev" aria-label="Thành tựu trước">‹</button>
        <div class="gv-dots" id="tt-dots">${THANH_TUU.map((a, i) => `<button type="button" data-i="${i}" aria-label="${esc(a.ten)}"></button>`).join("")}</div>
        <button type="button" class="gv-nav" id="tt-next" aria-label="Thành tựu sau">›</button>
      </div></div>`;
const thanhTuuSanHTML = () => `<h3>Thành tựu cần săn</h3><p class="muted">Thành tựu giữ trọn đời. Mỗi thành tựu có 4 cấp: <b style="color:${CAP[1].mau}">Đồng</b> → <b style="color:${CAP[2].mau}">Bạc</b> → <b style="color:${CAP[3].mau}">Vàng</b> → <b style="color:${CAP[4].mau}">Kim Cương</b>.</p>
    <div class="tt-show">${THANH_TUU.map(a => `<div class="tt-s" style="--tc:${a.mau}">${huyHieuTT(a, 4, "lg")}<b>${a.ten}</b><span>${a.mo}</span>
      <ol>${a.moc.map((m, j) => `<li style="--cc:${CAP[j + 1].mau}"><i>${CAP[j + 1].ten}</i>${m} ${a.dv}</li>`).join("")}</ol>${a.trao ? `<small>Anh chị trao</small>` : ""}</div>`).join("")}</div>`;
/* Bấm vào huy hiệu / chip hạng ở bất kỳ đâu → mở bảng ghi chú, bảng hạng và cách leo rank */
function moBangRank(ten) {
  let dlg = $("#rk-dlg");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "rk-dlg"; dlg.className = "rk-dlg"; document.body.append(dlg);
    dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-dong]")) dlg.close(); }); }
  const t = ten ? tinhRank(null, null, null, ten) : null;
  dlg.innerHTML = `<div class="rk-dlg-in">
    <button class="rk-x" type="button" data-dong aria-label="Đóng">✕</button>
    <p class="eyebrow">Hệ thống hạng lớp Thạch Thất</p><h2>Bảng hạng & cách leo rank</h2>
    ${t ? `<div class="rk-ai t${t.i}" style="--rc:${t.r.mau === "rainbow" ? "#ffd6ff" : t.r.mau}">${khungAvatar(t.r, t.i, ten, "", "lg")}<div><b>${esc(ten)}</b>
      <span>Hạng ${t.r.ma} · ${t.r.kim} · ${t.r.ten} · <b class="num">${t.xp} XP</b></span>
      <div class="rk-bar"><i style="width:${t.pct}%"></i></div>
      <small>${t.next ? `Còn <b class="num">${t.next.xp - t.xp} XP</b> nữa lên hạng ${t.next.ma} · ${t.next.kim} · ${t.next.ten}` : "Đã đạt hạng cao nhất!"}</small>
      ${t.thuongDs.length ? `<small class="rk-th">XP thưởng: ${t.thuongDs.map(x => `+${x.xp} — ${esc(x.ghiChu || "")}`).join(" · ")}</small>` : ""}</div></div>` : ""}
    ${ten ? (m => `<div class="rk-ttd"><b>🏆 Thành tựu đã đạt</b>${m.length ? `<ul>${m.map(a => `<li>${huyHieuTT(a, a.cap, "sm")}<span><b>${esc(a.ten)} <i style="color:${CAP[a.cap].mau}">· Cấp ${CAP[a.cap].ten}</i></b><small>Cách đạt: ${esc(a.mo)} — đã có <b>${a.n} ${esc(a.dv)}</b>${a.toi ? ` · cần ${a.toi} để lên ${CAP[a.cap + 1].ten}` : " · cấp cao nhất"}</small></span></li>`).join("")}</ul>` : `<p class="muted">Chưa có thành tựu nào. Nộp bài, đi học đều và có bài lên nổi bật để mở khoá!</p>`}</div>`)(tinhThanhTuu(null, null, null, ten).filter(a => a.cap)) : ""}
    <div class="rk-note"><b>📌 Ghi chú</b><ul>
      <li>Mùa xếp hạng bắt đầu từ <b>${fmtDate(new Date(RANK_BAT_DAU + "T00:00"))}</b>. Mọi học viên khởi đầu ở <b>hạng F · Sắt · Người Mới</b>.</li>
      <li>Hạng càng cao, huy hiệu càng rực rỡ: từ Sắt xám → Đồng → Thép → Bạc → Vàng → Bạch Kim → Kim Cương → Tinh Anh → Huyền Thoại đỏ rực → <b>Thách Đấu cầu vồng</b>.</li>
      <li><b>Càng lên cao càng khó:</b> mỗi hạng cần nhiều XP hơn hẳn hạng trước (F→E chỉ 100 XP). <b>Từ Lão Làng (A) trở lên, mỗi hạng cần thêm 2.000 XP</b>: A 1.400 → S 3.400 → SS 5.400 → SSS 7.400 → SSS+ 9.400. Chỉ những bạn chăm chỉ bền bỉ cả năm mới chạm tới SSS+ · Thách Đấu.</li>
      <li>XP cộng tự động khi em đi học, nộp bài, được chấm điểm cao hoặc có bài lên Bài vẽ nổi bật. Anh chị có thể thưởng thêm XP cho bài xuất sắc.</li>
      <li>Hạng đầy đủ của em (gồm đi học, bài tập) xem trong mục <b>Tài khoản</b>.</li></ul></div>
    <h3>Cách kiếm XP</h3>${cachXpHTML()}
    <div class="rk-dlg-tt">${thanhTuuSanHTML()}</div>
    <h3>Các hạng</h3><div class="xh-bang">${bangRankHTML()}</div></div>`;
  dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
}
document.addEventListener("click", e => {
  const el = e.target.closest && e.target.closest("[data-rk]"); if (!el || el.closest("#rk-dlg")) return;
  e.stopPropagation(); e.preventDefault(); moBangRank(el.dataset.rk);
}, true);
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target.closest && e.target.closest("[data-rk]"); if (!el || el.closest("#rk-dlg")) return;
  e.preventDefault(); e.stopPropagation(); moBangRank(el.dataset.rk);
}, true);
(function bangXepHang() {
  const bang = $("#xh-bang"); if (!bang) return;
  bang.classList.add("rk-box");
  bang.innerHTML = bangVongHTML();
  vongXoay(bang, bang.querySelector(".rk-stage"), [...bang.querySelectorAll(".rk-card")], [...bang.querySelectorAll("#rk-dots button")], bang.querySelector("#rk-prev"), bang.querySelector("#rk-next"), null);
  $("#xh-cach").innerHTML = `<h3>Cách kiếm XP</h3>${cachXpHTML()}
    <p class="muted">Mùa xếp hạng bắt đầu từ ${fmtDate(new Date(RANK_BAT_DAU + "T00:00"))}. Mọi học viên khởi đầu ở hạng F.</p>`;
  // Học viên có hạng nổi bật (từ Bài vẽ nổi bật)
  const ten = [...new Set(nbAll().filter(b => !b.tg && b.hocVien).map(b => b.hocVien))];
  const ds = ten.map(t => ({ t, k: tinhRank(null, null, null, t) })).sort((a, b) => b.k.xp - a.k.xp);
  $("#xh-top").innerHTML = ds.length ? `<h3>Học viên đang leo hạng</h3><div class="xh-hv">${ds.map(({ t, k }) => `<div class="t${k.i}" data-rk="${esc(t)}" role="button" tabindex="0" style="--rc:${k.r.mau === "rainbow" ? "#ffd6ff" : k.r.mau}">${huyHieu(k.r, k.i, "sm", t)}<b>${esc(t)}</b><span>Hạng ${k.r.ma} · ${k.r.kim} · ${k.r.ten} · ${k.xp} XP</span>${(m => m.length ? `<span class="xh-tt">${m.map(a => huyHieuTT(a, a.cap, "xs")).join("")}</span>` : "")(tinhThanhTuu(null, null, null, t).filter(a => a.cap))}</div>`).join("")}</div>
    <p class="muted xh-note">Tính từ bài vẽ nổi bật. Hạng đầy đủ (gồm đi học, bài tập) xem trong Tài khoản của từng em.</p>` : "";
  const tt = $("#xh-thanhtuu");
  if (tt) { tt.innerHTML = thanhTuuVongHTML(); vongXoay(tt, tt.querySelector(".tt-stage"), [...tt.querySelectorAll(".tt-car")], [...tt.querySelectorAll("#tt-dots button")], tt.querySelector("#tt-prev"), tt.querySelector("#tt-next"), null); }
})();
/* Trang chủ: chỉ hiện Top rank của lớp */
function veTopRank() {
  const box = $("#tr-list"); if (!box) return;
  const ten = [...new Set([...nbAll().filter(b => !b.tg && b.hocVien).map(b => b.hocVien), ...(XP_THUONG || []).map(x => x.hocVien), ...XP_DONG.map(x => x.hocVien)].filter(Boolean))];
  const ds = ten.map(t => ({ t, k: tinhRank(null, null, null, t) })).sort((a, b) => b.k.xp - a.k.xp || b.k.i - a.k.i).slice(0, 5);
  box.innerHTML = ds.map(({ t, k }, j) => `<li class="t${k.i}${j < 3 ? " p" + (j + 1) : ""}" data-rk="${esc(t)}" role="button" tabindex="0" style="--rc:${k.r.mau === "rainbow" ? "#ffd6ff" : k.r.mau}">
    <span class="tr-so num">${j + 1}</span>${khungAvatar(k.r, k.i, t, "", "md")}
    <span class="tr-ten"><b>${esc(t)}</b><small>Hạng ${k.r.ma} · ${k.r.kim} · ${k.r.ten}</small></span><span class="tr-xp num">${k.xp} XP</span></li>`).join("");
  $("#top-rank").hidden = !ds.length;
}
veTopRank();
/* ================= Lộ trình học: từng môn, theo tuần (lấy từ giáo trình có sẵn) ================= */
(function loTrinh() {
  const tabs = $("#lt-tabs"), body = $("#lt-body"); if (!tabs || !body) return;
  const MON = [
    { ma: "lt-co-ban", ten: "Hình hoạ cơ bản", cho: "Người mới bắt đầu · nền tảng cho cả Khối H và V", mau: "#c9d1dc" },
    { ma: "tuong-lo-trinh", ten: "Hình hoạ tượng", cho: "Khối V · thi Kiến trúc, Xây dựng", mau: "#e0b97a", them: "hh-quy-trinh" },
    { ma: "hhn-lo-trinh", ten: "Hình hoạ người", cho: "Khối H · thi Mỹ thuật Công nghiệp, Sư phạm", mau: "#f39b6d", them: "hhn-11-chuyen-de" },
    { ma: "mau-lo-trinh", ten: "Màu & bố cục màu", cho: "Khối H · bố cục trang trí màu", mau: "#ff5fa2", them: "bcm-trinh-tu" },
    { ma: "mt2-lo-trinh", ten: "Mỹ thuật 2", cho: "Khối V · tư duy sáng tạo, bố cục", mau: "#57a6ff", them: "mt2-yeu-to" },
  ].map(m => ({ ...m, d: GT_LO_TRINH.find(x => x[0] === m.ma), p: m.them && GT_LO_TRINH.find(x => x[0] === m.them) })).filter(m => m.d);
  let chon = 0;
  const tach = st => { const i = st.indexOf(" · "); return i > 0 ? [st.slice(0, i), st.slice(i + 3)] : ["", st]; };
  const ve = () => {
    tabs.innerHTML = MON.map((m, i) => `<button type="button" role="tab" aria-selected="${i === chon}" style="--lc:${m.mau}" data-i="${i}">${esc(m.ten)}</button>`).join("");
    const m = MON[chon], buoc = m.d[5], loiDan = m.d[6];
    body.innerHTML = `<div class="lt-head" style="--lc:${m.mau}"><div><b>${esc(m.ten)}</b><span>${esc(m.cho)}</span></div><em>${esc(m.d[2])}</em></div>
      <ol class="lt-tree" style="--lc:${m.mau}">${buoc.map((st, k) => { const [tuan, nd] = tach(st);
        return `<li style="--k:${k}"><span class="lt-dot">${k + 1}</span><div><small>${esc(tuan || "Giai đoạn " + (k + 1))}</small><p>${esc(nd)}</p></div></li>`; }).join("")}
        <li class="lt-dich"><span class="lt-dot">★</span><div><small>Đích đến</small><p>Vào phòng thi tự tin, đủ bài, đủ kỹ năng.</p></div></li></ol>
      ${loiDan ? `<p class="lt-dan">💡 ${esc(loiDan)}</p>` : ""}
      ${m.p ? `<details class="lt-them"><summary>${esc(m.p[2])} ▾</summary><ol>${m.p[5].map(x => `<li>${esc(x)}</li>`).join("")}</ol>${m.p[6] ? `<p class="muted">${esc(m.p[6])}</p>` : ""}</details>` : ""}
      <p class="lt-cta">Muốn biết em nên bắt đầu từ đâu? <a href="#dang-ky">Đăng ký học thử để anh chị xếp lộ trình riêng →</a></p>`;
    tabs.querySelectorAll("button").forEach(b => b.onclick = () => { chon = +b.dataset.i; ve(); });
  };
  // Bấm "Lộ trình học" trên menu / link #lo-trinh → tự mở thẻ
  const moThe = () => { if (location.hash === "#lo-trinh") $("#lt-wrap").open = true; };
  addEventListener("hashchange", moThe); moThe();
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest('a[href="#lo-trinh"]'); if (a) $("#lt-wrap").open = true; });
  tabs.addEventListener("keydown", e => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; chon = (chon + (e.key === "ArrowRight" ? 1 : MON.length - 1)) % MON.length; ve(); tabs.querySelectorAll("button")[chon].focus(); });
  ve();
})();
/* ================= Dấu "!" giải thích từng mục cho người mới — tự hiện khi lướt tới ================= */
const GHI_CHU = {
  "h-nb": "Những bài vẽ đẹp nhất do anh chị chọn. Bài mới vào Top Tuần, để lâu sẽ tự chuyển sang Top Tháng rồi Top Năm. Vuốt hoặc bấm vào ảnh bên cạnh để xem bài khác. Bấm vào RANK để xem hạng của bạn đó.",
  "h-tr": "5 học viên có hạng cao nhất lớp. Đi học đều, nộp bài, có bài lên mục nổi bật là được cộng XP để lên hạng. Bấm vào từng bạn để xem chi tiết.",
  "h-ve-lop": "Cách lớp dạy: học có mục tiêu theo trường em muốn thi, đi từ nền tảng đến luyện đề.",
  "h-lt": "Lộ trình chi tiết từng môn: tuần nào học gì, bao nhiêu bài. Bấm tên môn ở trên để đổi. Bấm “Quy trình…” ở cuối để xem các bước làm một bài.",
  "h-khoa": "Các khoá học của lớp. Vuốt sang hai bên để xem từng khoá, bấm vào khoá để xem chi tiết.",
  "h-bv": "Học viên của lớp đã đỗ đại học và điểm năng khiếu. Chọn năm hoặc trường để lọc, bấm “Xem điểm từng trường” để xem kỹ hơn. Huy hiệu cạnh tên đổi màu theo điểm: 8 · 8,5 · 9 · 9,5.",
  "h-gv": "Anh chị và trợ giảng đang dạy ở lớp. Vuốt để xem từng người, trường đang học và môn phụ trách.",
  "h-baive": "Bài vẽ của học viên trong quá trình học. Bấm vào ảnh để xem to.",
  "h-qloi": "Những gì em nhận được khi học ở lớp.",
  "h-thi": "Lịch thi năng khiếu dự kiến của các trường. Ngày chính xác sẽ cập nhật khi trường công bố.",
  "h-lich": "Giờ học ở hai cơ sở. Chọn ca phù hợp rồi đăng ký học thử ở cuối trang.",
  "h-khoi": "Giải thích Khối H và Khối V thi môn gì, vào ngành nào, để em chọn đúng khối.",
  "h-dk": "Điền họ tên, lớp và số điện thoại để đăng ký học thử miễn phí. Anh chị sẽ gọi lại tư vấn. Trang cũng đếm ngược còn bao nhiêu ngày đến kỳ thi của em.",
  "h-xh": "Bảng hạng F → SSS+, cách kiếm XP và các thành tựu. Hạng của em tự cập nhật khi đi học, nộp bài và có bài nổi bật.",
};
(function ghiChu() {
  let daXem = {}; try { daXem = JSON.parse(sessionStorage.getItem("lvtt-gc") || "{}"); } catch (e) {}
  // ô ghi chú nằm trên lớp cao nhất của trang (gắn vào body) để không bị ảnh / vòng xoay đè
  const pop = document.createElement("div"); pop.className = "gc-pop"; pop.setAttribute("role", "tooltip"); document.body.append(pop);
  let dang = null, hen = 0;
  const dat = () => { if (!dang) return; const r = dang.getBoundingClientRect(), m = 12, w = pop.offsetWidth;
    let x = r.left + r.width / 2 - 26; x = Math.max(m, Math.min(x, innerWidth - m - w));
    const hr = (dang.closest("h2") || dang).getBoundingClientRect();
    let y = hr.bottom + 10; if (y + pop.offsetHeight > innerHeight - 90 && r.top - pop.offsetHeight - 10 > 60) { y = r.top - pop.offsetHeight - 10; pop.classList.add("tren"); } else pop.classList.remove("tren");
    pop.style.left = x + "px"; pop.style.top = y + "px"; pop.style.setProperty("--ax", (r.left + r.width / 2 - x - 5) + "px");
    if (r.bottom < 0 || r.top > innerHeight) dong(); };
  const dong = () => { if (dang) dang.setAttribute("aria-expanded", "false"); dang = null; pop.classList.remove("mo"); clearTimeout(hen); };
  const mo = (b, tu) => { dang = b; b.setAttribute("aria-expanded", "true"); pop.innerHTML = `<b>Mục này là gì?</b>${esc(b.dataset.gc)}`;
    pop.classList.add("mo"); dat(); clearTimeout(hen); if (tu) hen = setTimeout(dong, 6000); };
  addEventListener("scroll", dat, { passive: true }); addEventListener("resize", dat, { passive: true });
  // Khi lướt tới mục (dấu ! nằm trong vùng giữa màn hình) thì tự hiện giải thích, mỗi mục một lần mỗi phiên
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const b = e.target.querySelector(".gc-i"), key = e.target.dataset.gcKey;
    if (!b || daXem[key]) return; io.unobserve(e.target); daXem[key] = 1; try { sessionStorage.setItem("lvtt-gc", JSON.stringify(daXem)); } catch (x) {}
    // Điện thoại: chỉ nhấp nháy dấu ?, không tự bật hộp che nội dung; máy tính mới tự mở gợi ý một lần
    if (matchMedia("(min-width: 900px)").matches) setTimeout(() => { if (!dang) mo(b, true); }, 350);
  }), { threshold: 0.5, rootMargin: "-15% 0px -25% 0px" }) : null;
  Object.entries(GHI_CHU).forEach(([id, nd]) => {
    const h = document.getElementById(id); if (!h || h.querySelector(".gc")) return;
    const w = document.createElement("span"); w.className = "gc";
    w.innerHTML = `<button type="button" class="gc-i" aria-label="Hướng dẫn mục này" aria-expanded="false">?</button>`;
    h.append(w);
    const b = w.querySelector(".gc-i"); b.dataset.gc = nd;
    b.addEventListener("click", e => { e.stopPropagation(); dang === b ? dong() : mo(b); });
    // rê chuột (máy tính) mới hiện khi rê; chạm trên điện thoại chỉ dùng click để không mở rồi đóng ngay
    b.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") mo(b); });
    b.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") dong(); });
    w.dataset.gcKey = id;
    if (io) io.observe(w);
  });
  document.addEventListener("click", e => { if (!e.target.closest(".gc")) dong(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") dong(); });
})();
/* ================= Bài vẽ nổi bật: tuần / tháng / năm, vòng xoay 3D =================
   Chỉ hiện TOP 5 do quản lý chọn (hạng 1–5). Bài khác nằm ở mục "Bài vẽ học viên".
   Anh chị thấy nút "+" ở cuối vòng xoay để đăng bài vẽ của học viên. */
(function noiBat() {
  const box = $("#nb-ring"); if (!box) return;
  const TEN = { tuan: "tuần", thang: "tháng", nam: "năm" };
  let ky = "tuan", vx = null, daChon = false;
  // Tự chuyển mục theo ngày chọn bài: 0–7 ngày = tuần, 8–30 = tháng, 31–365 = năm
  const KHOANG = { tuan: [0, 7], thang: [7, 30], nam: [30, 365] };
  const tuoi = b => b.ngay ? (Date.now() - new Date(b.ngay + "T00:00:00+07:00").getTime()) / 864e5 : null;
  const mucCua = b => { const t = tuoi(b); if (t === null) return b.ky || "tuan"; return Object.keys(KHOANG).find(k => t >= KHOANG[k][0] - 1 && t < KHOANG[k][1]) || ""; };
  // Mỗi vị trí Top chỉ 1 bài: bài quản lý chọn trên web được ưu tiên hơn bài có sẵn trong file
  // Tối đa 10 ảnh mỗi mục, trong đó chỉ 5 bài mang huy chương TOP 1–5 (mỗi hạng 1 bài, bài quản lý chọn trên web được ưu tiên)
  // Bài của trợ giảng, giáo viên, quản lý (hoặc bài mẫu giáo viên): không có hạng, có khung riêng
  const nhanVienBai = b => ["Trợ giảng", "Giáo viên", "Quản lý"].includes(b.chucVu) || !!b.mau;
  // Nhãn trên góc ảnh chỉ ghi vai trò ngắn gọn; biệt danh chuyển xuống dưới tên
  const nhanVienTen = b => (b.chucVu && b.chucVu !== "Học viên" ? b.chucVu : "Giáo viên");
  const nhanVienLop = b => ({ "Trợ giảng": "tg", "Quản lý": "ql" })[b.chucVu] || "gv"; // mỗi vai trò một khung màu
  const locNoiBat = k => { const daCo = new Set();
    const ds = [...BAI_NOI_BAT, ...BAIVE_DONG.filter(b => !String(b.id).startsWith("seed-")).map(b => ({ ...b, ngay: (b.hang >= 1 && b.hang <= 5 && b.ngayTop) || b.ngay, dong: true }))].filter(b => mucCua(b) === k)
      .map(b => ({ ...b, nv: nhanVienBai(b), top: !b.tg && !nhanVienBai(b) && b.hang >= 1 && b.hang <= 5 ? b.hang : 0 }))
      .sort((a, b) => (a.top || 99) - (b.top || 99) || (b.dong ? 1 : 0) - (a.dong ? 1 : 0) || (tuoi(a) || 0) - (tuoi(b) || 0) || (b.luc || 0) - (a.luc || 0));
    ds.forEach(b => { if (b.top) { if (daCo.has(b.top)) b.top = 0; else daCo.add(b.top); } });
    // Bài của trợ giảng, giáo viên, quản lý: không xếp hạng, đứng trước Top 1 và có khung riêng
    const thu = x => x.nv ? 0 : (x.top || 99);
    return ds.sort((a, b) => thu(a) - thu(b)).slice(0, 10).map(b => b.nv ? { ...b, tg: true, top: 0 } : b); };
  const coThem = () => !!(user && isTeacher);
  const theThem = i => `<figure class="nb-card nb-add" data-i="${i}" data-add="1"><div class="nb-add-in"><span class="nb-plus" aria-hidden="true">+</span><b>Thêm bài vẽ</b><small>Đăng ảnh bài học viên${isAdmin ? "<br>Chọn Top 5 ở trang Quản lý" : ""}</small></div></figure>`;
  let sig = "";
  const ve = () => {
    const ds = locNoiBat(ky);
    // Khoá so sánh nhẹ: không ghép cả chuỗi ảnh base64 (rất nặng) mỗi lần tải lại, chỉ dùng độ dài + thời điểm đăng
    const k = [ky, !!user && isTeacher, isAdmin, XP_DONG.length, TT_DONG.length, ...ds.map(b => [b.id || "", b.luc || 0, b.anh ? b.anh.length : 0, b.top, b.hocVien, b.loai, b.ghiChu, b.chucVu, b.biDanh, biDanhCua(b), b.mau, b.hang].join("~"))].join("|");
    if (k === sig) return; sig = k;
    if (!ds.length && !coThem()) { box.innerHTML = `<p class="nb-rong">Chưa có bài nổi bật ${TEN[ky]}. ${ky === "tuan" ? "Anh chị sẽ cập nhật bài đẹp mỗi tuần." : `Bài tuần trước tự chuyển sang đây khi ${ky === "thang" ? "qua 1 tuần" : "qua 1 tháng"}.`}</p>`; return; }
    box.innerHTML = `<div class="gv-stage nb-stage">${ds.map((b, i) => `<figure class="nb-card${b.nv ? " nb-nv nv-" + nhanVienLop(b) : ""}" data-i="${i}">
        ${b.nv ? `<span class="nb-nv-tag">${esc(nhanVienTen(b))}</span>` : ""}
        ${isAdmin && b.id ? `<button type="button" class="nb-more" data-mn="${esc(b.id)}" aria-label="Tuỳ chọn: sửa link, xoá bài">⋮</button>` : ""}
        <img src="${esc(b.anh)}" alt="${esc((b.loai || "Bài vẽ") + " · " + (b.hocVien || ""))}" ${i < 2 || b.nv ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">
        ${b.top ? `<span class="nb-medal h${b.top}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l1 5-3 1zM17 2h-4l-1 5 3 1z" class="rb"/><circle cx="12" cy="15" r="6.5" class="md"/><text x="12" y="18.2" text-anchor="middle">${b.top}</text></svg><b>TOP ${b.top}</b><i>${TEN[ky]}</i></span>` : ""}
        ${b.tg ? "" : (m => m.length ? (a => `<span class="nb-tt" data-rk="${esc(b.hocVien)}" role="button" tabindex="0" title="${esc(a.ten)} · ${CAP[a.cap].ten} — ${esc(a.mo)}">${huyHieuTT(a, a.cap, "sm")}<span class="nb-ttx"><b>${esc(a.ten)}</b><small>${a.n} ${esc(a.dv)} · ${CAP[a.cap].ten}</small></span></span>`)(m[0]) : "")(ttNoiNhat(b.hocVien))}
        ${b.tg ? "" : (t => khungThe(t.r, t.i))(tinhRank(null, null, null, b.hocVien))}
        <figcaption><b>${esc(b.hocVien || "")} ${b.tg ? "" : (t => huyHieu(t.r, t.i, "xs", b.hocVien))(tinhRank(null, null, null, b.hocVien))}</b>${b.nv && biDanhCua(b) ? `<em class="nb-bd">${esc(biDanhCua(b))}</em>` : ""}<span>${esc([b.loai, b.ghiChu].filter(Boolean).join(" · "))}</span></figcaption></figure>`).join("")}${coThem() ? theThem(ds.length) : ""}</div>
      <div class="gv-ctl"><button type="button" class="gv-nav" aria-label="Bài trước">‹</button>
        <div class="gv-dots">${ds.map((b, i) => `<button type="button" data-i="${i}" aria-label="Bài ${i + 1}"></button>`).join("")}${coThem() ? `<button type="button" data-i="${ds.length}" aria-label="Thêm bài vẽ"></button>` : ""}</div>
        <button type="button" class="gv-nav" aria-label="Bài sau">›</button></div>`;
    const [p, n] = box.querySelectorAll(".gv-nav");
    // Nút ⋮ (chỉ quản lý thấy): sửa link/thông tin hoặc xoá bài; bấm ⋮ không được kéo hay mở ảnh
    box.querySelectorAll(".nb-more").forEach(bt => {
      const stop = e => e.stopPropagation();
      bt.addEventListener("pointerdown", stop); bt.addEventListener("click", e => { e.stopPropagation(); e.preventDefault(); moMenuBai(bt, BAIVE_DONG.find(y => y.id === bt.dataset.mn)); });
    });
    const cards = [...box.querySelectorAll(".nb-card")];
    vx = vongXoay(box, box.querySelector(".nb-stage"), cards, [...box.querySelectorAll(".gv-dots button")], p, n, c => {
      if (c.dataset.add) { moDangBai(); return; }
      galList = ds; showLb(Number(c.dataset.i));
    });
  };
  const chonKy = () => { if (daChon) return; ky = ["tuan", "thang", "nam"].find(k => locNoiBat(k).length) || "tuan"; $$("#nb-tabs [data-k]").forEach(x => x.setAttribute("aria-selected", x.dataset.k === ky)); };
  addEventListener("xephang-doi", () => ve());
  addEventListener("baive-doi", () => { chonKy(); ve(); });
  addEventListener("vaitro-doi", () => ve());
  $$("#nb-tabs [data-k]").forEach(t => t.onclick = () => { daChon = true; ky = t.dataset.k; $$("#nb-tabs [data-k]").forEach(x => x.setAttribute("aria-selected", x === t)); ve(); });
  // Mặc định mở mục có bài gần nhất (tuần → tháng → năm)
  chonKy();
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
  vongXoay(box, stage, cards, [...ctl.querySelectorAll(".gv-dots button")], prev, next, c => moTheKhoa(c));
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
        ${g.anh ? `<img class="gv-bai${g.bai ? " gv-art-full" : ""}" src="${esc(g.bai || IMG + g.anh + "-bai.jpg")}" alt="Bài vẽ của ${esc(g.ten)}" loading="lazy" decoding="async" width="348" height="234" draggable="false">`
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
    <button type="button" class="gv-nav" id="gv-prev" aria-label="Anh chị trước">‹</button>
    <div class="gv-dots" id="gv-dots">${GIAO_VIEN.map((g, i) => `<button type="button" data-i="${i}" aria-label="${esc(g.ten)}"></button>`).join("")}</div>
    <button type="button" class="gv-nav" id="gv-next" aria-label="Anh chị sau">›</button>
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
/* Huy hiệu "Thợ săn danh hiệu" cạnh tên Bảng vàng — theo điểm cao nhất: 8 · 8,5 · 9 · 9,5 (tự vẽ) */
const THO_SAN = [
  { tu: 9.5, ten: "Huyền Thoại", mau: "#ff3b4e", kl: ["#fff6cf", "#f0b72e", "#6b4300"] },
  { tu: 9, ten: "Vàng", mau: "#ffcf3a", kl: ["#fff6cf", "#e2a92c", "#5a3c0c"] },
  { tu: 8.5, ten: "Bạc", mau: "#7fe3ff", kl: ["#ffffff", "#c3ccd8", "#4b535e"] },
  { tu: 8, ten: "Đồng", mau: "#e08a4c", kl: ["#ffe2c4", "#b9774a", "#4a2a17"] },
];
function thoSan(d, cls = "") {
  const n = Number(d); if (!(n >= 8)) return "";
  const k = THO_SAN.findIndex(x => n >= x.tu), t = THO_SAN[k], cap = 4 - k, id = "ts" + Math.random().toString(36).slice(2, 8), c = t.mau;
  const M = `url(#${id}m)`, x = [];
  if (cap >= 4) x.push(`<g fill="${c}" opacity=".85">${[...Array(8)].map((_, j) => `<path d="M24 -4l1.6 6h-3.2z" transform="rotate(${j * 45} 24 24)"/>`).join("")}</g>`);
  if (cap >= 2) x.push(`<g fill="${M}" stroke="${t.kl[2]}" stroke-width=".4">${[0, 1, 2].map(j => `<ellipse cx="${5 - j * .6}" cy="${30 - j * 7}" rx="4.4" ry="1.8" transform="rotate(${-60 - j * 12} ${5 - j * .6} ${30 - j * 7})"/><ellipse cx="${43 + j * .6}" cy="${30 - j * 7}" rx="4.4" ry="1.8" transform="rotate(${60 + j * 12} ${43 + j * .6} ${30 - j * 7})"/>`).join("")}</g>`);
  if (cap >= 3) x.push(`<path d="M24 0l4 5-4 4-4-4z" fill="${c}" stroke="#fff" stroke-width=".6"/>`);
  x.push(`<path d="M24 5l16 9v20l-16 9-16-9V14z" fill="#0d0f16" stroke="${M}" stroke-width="${cap >= 3 ? 3 : 2.4}"/>`);
  x.push(`<path d="M24 9l12.5 7v16L24 39l-12.5-7V16z" fill="none" stroke="${c}" stroke-width=".8" opacity=".7"/>`);
  // tâm ngắm + mũi tên: biểu tượng thợ săn
  x.push(`<circle cx="24" cy="24" r="7.5" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M24 14v4M24 30v4M14 24h4M30 24h4" stroke="${c}" stroke-width="1.4"/>`);
  x.push(`<path d="M15 33l15-15" stroke="${M}" stroke-width="2.2" stroke-linecap="round"/><path d="M32.5 15.5l-7.5 1.2 6.3 6.3z" fill="${M}"/><path d="M15 33l-3 .5M15 33l-.5 3M17 31l-3 .6M17 31l-.6 3" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>`);
  if (cap >= 4) x.push(`<path d="M15 3l2-7 4 4 3-6 3 6 4-4 2 7q-9-2.5-18 0z" fill="${M}" stroke="${t.kl[2]}" stroke-width=".5"/>`);
  return `<span class="tsd c${cap} ${cls}" style="--tc:${c}" title="Thợ săn danh hiệu · ${t.ten} (từ ${String(t.tu).replace(".", ",")} điểm)"><svg viewBox="-4 -10 56 60" aria-hidden="true"><defs><linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.kl[0]}"/><stop offset=".5" stop-color="${t.kl[1]}"/><stop offset="1" stop-color="${t.kl[2]}"/></linearGradient></defs>${x.join("")}</svg><i>${t.ten}</i></span>`;
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
      <div class="mg-name"><span>${esc(ho)}</span><b>${esc(ten)}${x.top ? thoSan(x.top.d) : ""}</b>${tatCa ? `<em class="mg-yr">Khoá ${x.nam}</em>` : ""}
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
          <b class="mg-nm">${esc(x.ten)}${x.top ? thoSan(x.top.d, "sm") : ""}</b>
          <span class="mg-sub">${x.top ? `${esc(x.top.m)} · ${esc(x.top.tr)}${nhanNam(x)}` : `Đỗ ${esc(x.truongs.join(", "))}${nhanNam(x)}`}</span>
          <span class="mg-sc"><b class="num">${x.top ? fmtDiem(x.top.d) : "–"}</b><small>Đ</small></span></summary>
        <ul class="kq">${chiTiet(x)}</ul></details></li>`).join("")}</ol>
      ${rest.length > 6 ? `<button type="button" class="mg-more" id="bv-more">${bvMore ? "Thu gọn ▲" : `Xem tất cả ${list.length} học viên ▼`}</button>` : ""}
    </div>
    <p class="muted bv-note">Bấm vào tên để xem điểm từng trường. Xếp theo điểm môn vẽ cao nhất của mỗi bạn.</p>`;
  // Phân tích tỷ lệ đỗ (tính từ dữ liệu Bảng vàng; % đỗ cần số học viên dự thi ở SO_DU_THI)
  {
    const ds = BANG_VANG.filter(x => hopNam(x, bvYear)), nam = bvYear ? [bvYear] : BV_NAM;
    const duThi = nam.reduce((a, y) => a + (Number((SO_DU_THI || {})[y]) || 0), 0);
    const hvDo = new Set(ds.map(x => x.ten.trim().toLowerCase() + "|" + x.nam)).size;
    const theoTr = Object.keys(TRUONG).map(k => ({ k, n: ds.filter(x => x.truong === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
    const diem = all.filter(x => x.top).map(x => x.top.d);
    const MUC = [["Từ 9", d => d >= 9, "#ffcf3a"], ["8,5 – 8,9", d => d >= 8.5 && d < 9, "#7fe3ff"], ["8 – 8,4", d => d >= 8 && d < 8.5, "#e08a4c"], ["7 – 7,9", d => d >= 7 && d < 8, "#9aa3ad"], ["Dưới 7", d => d < 7, "#5b6170"]];
    const tb = diem.length ? diem.reduce((a, b) => a + b, 0) / diem.length : 0;
    const max = Math.max(1, ...theoTr.map(x => x.n));
    const bar = (nhan, n, tong, mau) => `<div class="pt-r"><span>${nhan}</span><i style="--w:${Math.round(n / tong * 100)}%;--c:${mau}"></i><b class="num">${n}${tong ? ` · ${Math.round(n / (diem.length || 1) * 100)}%` : ""}</b></div>`;
    $("#bv-body").insertAdjacentHTML("beforeend", `<details class="bv-pt"><summary>📊 Phân tích tỷ lệ đỗ ${tatCa ? "· tất cả các khoá" : "· mùa thi " + bvYear}</summary>
      <div class="pt-grid">
        <div class="pt-o pt-lon">${duThi ? `<b class="num">${Math.round(hvDo / duThi * 100)}%</b><span>tỷ lệ đỗ (${hvDo}/${duThi} học viên dự thi)</span>` : `<b class="num">${hvDo}</b><span>học viên đỗ / có điểm · <em>thêm số học viên dự thi để tính %</em></span>`}</div>
        <div class="pt-o"><b class="num">${fmtDiem(Math.round(tb * 100) / 100)}</b><span>điểm vẽ trung bình (môn cao nhất)</span></div>
        <div class="pt-o"><b class="num">${diem.length ? Math.round(diem.filter(d => d >= 8).length / diem.length * 100) : 0}%</b><span>bài đạt từ 8 điểm</span></div>
        <div class="pt-o"><b class="num">${diem.length ? Math.round(diem.filter(d => d >= 9).length / diem.length * 100) : 0}%</b><span>bài đạt từ 9 điểm</span></div>
      </div>
      <div class="pt-2"><div><h4>Lượt đỗ theo trường</h4>${theoTr.map(x => `<div class="pt-r"><span>${esc(x.k)}</span><i style="--w:${Math.round(x.n / max * 100)}%;--c:${esc(tr(x.k).mau)}"></i><b class="num">${x.n} · ${Math.round(x.n / ds.length * 100)}%</b></div>`).join("")}</div>
        <div><h4>Phân bố điểm vẽ cao nhất</h4>${MUC.map(([nhan, f, mau]) => bar(nhan, diem.filter(f).length, Math.max(1, ...MUC.map(m => diem.filter(m[1]).length)), mau)).join("")}</div></div>
      <p class="muted pt-note">Tính từ ${ds.length} lượt đỗ/có điểm trên Bảng vàng. Phần trăm theo trường = số lượt đỗ trường đó / tổng lượt.</p></details>`);
  }
  if ($("#bv-clear")) $("#bv-clear").onclick = () => { bvSchool = ""; renderHonor(); };
  if ($("#bv-more")) $("#bv-more").onclick = () => { bvMore = !bvMore; renderHonor(); if (!bvMore) $("#bang-vang").scrollIntoView({ block: "start" }); };
}
renderHonor();
renderGiaoVien();

/* ================= Đăng ký học thử ================= */
// Gửi thẳng cho anh chị qua email (không bắt phụ huynh tự sao chép), kèm nút Gọi / Zalo dự phòng.
const SDT_LOP = String(LIEN_HE.sdt || "").replace(/\D/g, "");
$("#dk-call").href = "tel:" + SDT_LOP;
$("#dk-zalo").href = ZALO_LINK;

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
      // Bỏ nút hướng dẫn "?" nằm trong tiêu đề, kẻo tên mục trong kết quả tìm kiếm dính dấu "?" thừa;
      // chèn khoảng trắng giữa các phần của tiêu đề (tiêu đề trang đầu tách dòng nên dễ dính "Học VẽKhông Vui").
      const tieuDe = h.cloneNode(true); tieuDe.querySelectorAll("button").forEach(x => x.remove());
      tieuDe.querySelectorAll("*").forEach(x => x.after(" "));
      them("Mục", tieuDe.textContent.replace(/\s+/g, " ").trim(), (sec.querySelector(".sec-head p.muted, .cine-lede") || {}).textContent || "", "#" + sec.id, sec.textContent.slice(0, 900));
    });
    $$(".course").forEach(c => them("Khoá học", (c.querySelector("h3") || {}).textContent || "", [(c.querySelector(".eyebrow") || {}).textContent, (c.querySelector(".len") || {}).textContent].filter(Boolean).join(" · "), "#khoa-hoc", c.textContent));
    GIAO_VIEN.forEach(g => them("Giáo viên", g.ten, `${g.vaiTro} · ${g.khoi}${g.truong ? " · " + g.truong : ""}`, "#giao-vien", g.nganh));
    const hv = new Map();
    BANG_VANG.forEach(r => { const k = r.ten + "|" + r.nam; const d = Object.entries(r.diem || {}).map(([m, v]) => `${m} ${fmtDiem(v)}`).join(", ");
      hv.set(k, (hv.get(k) || []).concat(`${r.truong}${d ? ": " + d : ""}`)); });
    hv.forEach((v, k) => { const [ten, nam] = k.split("|"); them("Bảng vàng", ten, `Khoá ${nam} · ${v.join(" · ")}`, "#bang-vang"); });
    LICH_THI.forEach(e => them("Lịch thi", e.ten, `${e.dot} · ${e.hienThi}/${e.ngay.slice(0, 4)}`, "#lich-thi", e.truong));
    them("Trang", "Đăng ký học thử", "Gửi thông tin, anh chị gọi lại tư vấn · đếm ngược ngày thi", "#dang-ky", "dang ky hoc thu tu van hoc phi lien he so dien thoai zalo");
    them("Trang", "Tài khoản học viên", "Đăng nhập, giáo trình, bài tập, nhắn tin anh chị", "#tai-khoan", "dang nhap dang ky tai khoan giao trinh bai tap");
    them("Liên hệ", "Gọi " + (LIEN_HE.sdt || "") + " · Zalo " + (LIEN_HE.zaloHienThi || LIEN_HE.zalo || ""), "Cơ sở Bình Phú · Kim Quan, Thạch Thất", "#dang-ky", "lien he dien thoai zalo dia chi co so");
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
      : `<li class="tk-rong">Không tìm thấy “${esc(q.value)}”. Thử từ khác, hoặc <a href="#dang-ky">nhắn anh chị</a>.</li>`;
    $("#tk-goi").textContent = q.value ? `${kq.length} kết quả · ↑↓ để chọn · Enter để mở` : "Gợi ý: “hình hoạ”, “kiến trúc”, “9,5”, “Kim Quan”, tên học viên…";
  };
  let tha = null;
  const mo = () => { if (ov.hidden) tha = voiQuayLai(() => { tha = null; dong(); }); ov.hidden = false; document.body.style.overflow = "hidden"; q.value = ""; sel = 0; ve(); setTimeout(() => q.focus(), 20); };
  const dong = diLink => { ov.hidden = true; document.body.style.overflow = ""; if (tha) { const f = tha; tha = null; f(diLink === true); } };
  $("#nav-search").onclick = mo; $("#tk-x").onclick = dong;
  ov.addEventListener("click", e => { if (e.target === ov) dong(); if (e.target.closest("a")) dong(true); });
  q.addEventListener("input", () => { sel = 0; ve(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(kq.length - 1, sel + 1); ve(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); ve(); e.preventDefault(); }
    if (e.key === "Enter" && kq[sel]) { dong(true); location.hash = kq[sel].url; }
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
  // Số liệu trên hero lấy thẳng từ Bảng vàng + lịch thi, anh chị không phải sửa tay
  if (BANG_VANG.length) {
    const diem = BANG_VANG.flatMap(r => Object.entries(r.diem || {}).filter(([m]) => !/phỏng vấn/i.test(m)).map(([, d]) => Number(d))).filter(d => !isNaN(d));
    if (diem.length) $("#hs-top").textContent = fmtDiem(Math.max(...diem));
    const co = new Set(BANG_VANG.map(r => r.truong));
    $("#hero-schools").innerHTML = Object.keys(TRUONG).filter(k => co.has(k)).map(k => `<a href="#bang-vang" data-t="${esc(k)}" style="--c:${esc(TRUONG[k].mau)}" title="Xem học viên đỗ ${esc(TRUONG[k].ten)}">${esc(k)}</a>`).join("");
    // Bấm tên trường ở trang đầu → mở Bảng vàng, lọc sẵn học viên đỗ trường đó
    $$("#hero-schools a").forEach(a => a.addEventListener("click", () => { bvYear = 0; bvSchool = a.dataset.t; bvMore = false; renderHonor(); }));
  }
  const sap = LICH_THI.map(e => ({ ...e, n: daysUntil(e.ngay) })).filter(e => e.n >= 0).sort((a, b) => a.n - b.n)[0];
  if (sap && !store.get("lvkv-moc-thi", null)) datBadgeThi(sap, "đầu tiên");

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
    if (dock.hidden !== !home) { dock.hidden = !home; dispatchEvent(new Event("resize")); } // nút Chì tự né thanh dưới
    dock.classList.toggle("show", home && y > h * .6 && !(dk.top < innerHeight && dk.bottom > 0));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("hashchange", () => requestAnimationFrame(onScroll));
  requestAnimationFrame(onScroll); // đọc kích thước sau khi trang vẽ xong, không làm chậm lần mở đầu

  // Sản phẩm thêm (khoá học nâng cao, ebook): đổ từ SAN_PHAM vào menu trên web và menu ☰ (điện thoại)
  { const box = $("#sp-p");
    if (box) box.innerHTML = SAN_PHAM.map(p => {
      const coLink = !!p.link, ngoai = coLink && !p.link.startsWith("#");
      return `<a class="link" href="${esc(p.link || "#dang-ky")}"${ngoai ? ' target="_blank" rel="noopener"' : ""}><b>${esc(p.ten)}</b><small>${esc(coLink ? p.moTa : "Sắp ra mắt · hỏi anh chị")}</small></a>`;
    }).join(""); }

  // Menu toàn màn hình trên điện thoại
  const ov = $("#menu-ov"), burger = $("#nav-burger");
  // Menu điện thoại: chia 3 nhóm, mỗi mục một ô gọn (tên + mô tả nhỏ), dễ nhìn, dễ bấm
  { let i = 0;
    const o = (href, t, d) => `<a href="${esc(href)}" style="--i:${i++}"><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</a>`;
    $("#menu-links").innerHTML = $$("nav .dd").map(dd => `<div class="mn-g"><h4>${esc(dd.querySelector(".dd-t").textContent.trim())}</h4><div class="mn-ds">${
      [...dd.querySelectorAll("a.link")].map(a => o(a.getAttribute("href"), (a.querySelector("b") || a).textContent.trim(), (a.querySelector("small") || {}).textContent || "")).join("")}</div></div>`).join("")
      + `<div class="mn-g"><h4>Khác</h4><div class="mn-ds">${o("#tai-khoan", "Tài khoản", "Học viên · Giáo viên")}${o("#dang-ky", "Liên hệ", "Gọi · Zalo · chỉ đường")}</div></div>`; }
  let menuTha = null;
  const setMenu = (open, diLink) => {
    if (open && !ov.classList.contains("open")) menuTha = voiQuayLai(() => { menuTha = null; setMenu(false); });
    if (!open && menuTha) { const f = menuTha; menuTha = null; f(diLink === true); }
    ov.classList.toggle("open", open); ov.setAttribute("aria-hidden", !open); burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : ""; onScroll();
  };
  burger.onclick = () => setMenu(true);
  $("#menu-x").onclick = () => setMenu(false);
  ov.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false, true); });
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
    "bai-ve": [null, "deco/mau.svg"], "lich-thi": ["deco/captoc-lich-thi.svg", null], "lich-hoc": [null, "deco/khoi.svg"], "khoi": ["hinh-hoa-tuong.png", null], "dang-ky": [null, "deco/mt2.svg"] };
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

  // Điện thoại: mỗi khối nội dung trượt nhẹ và hiện dần khi cuộn tới, để đỡ bị rối mắt. Máy tính giữ nguyên.
  const diDon = matchMedia("(max-width:640px)"), nghiGiam = matchMedia("(prefers-reduced-motion:reduce)");
  const BO_QUA = ".gv-stage,.tb-stage,.tb-noi,.tt-grid,.cs-stage,.courses,.lesson-nav,.cine-bg,.tk-box,nav,header";
  if ("IntersectionObserver" in window) {
    const hien = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("rv-in"); hien.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    const quetRv = () => {
      if (!diDon.matches || nghiGiam.matches) return;
      $$("main > section, main > .page-head, main .sec-head, main .card").forEach(el => {
        if (el.dataset.rv || el.closest(BO_QUA)) return;
        el.dataset.rv = "1"; el.classList.add("rv-pre"); hien.observe(el);
      });
    };
    quetRv(); addEventListener("hashchange", () => setTimeout(quetRv, 60));
    let hen = 0; new MutationObserver(() => { clearTimeout(hen); hen = setTimeout(quetRv, 250); }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
  }

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
  $("#dock-zalo").href = ZALO_LINK;

  // Khối H/V: trên điện thoại thu gọn phần chi tiết
  if (matchMedia("(max-width:640px)").matches) $$(".khoi-dl").forEach(d => d.open = false);

  // Video nền (nếu anh chị đã điền VIDEO_BIA): mờ dần vào/ra mỗi vòng lặp, chạy bằng requestAnimationFrame
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
  // Ô họ tên chỉ gõ dấu cách vẫn qua được kiểm tra "bắt buộc" của trình duyệt, nên kiểm tra lại sau khi bỏ khoảng trắng.
  if (!v("#dk-ten")) { st.textContent = "Em chưa điền họ tên học sinh."; st.classList.add("err"); $("#dk-ten").value = ""; $("#dk-ten").focus(); return; }
  const sdt = String(v("#dk-sdt")).replace(/[\s.\-()]/g, "");
  if (!/^(0|\+84)\d{9,10}$/.test(sdt)) {
    st.textContent = "Số điện thoại chưa đúng. Viết 10 số, bắt đầu bằng số 0."; st.classList.add("err"); $("#dk-sdt").focus(); return;
  }
  const lines = ["Chào anh chị, em muốn đăng ký học thử / tư vấn:",
    "- Học sinh: " + v("#dk-ten"), "- SĐT phụ huynh: " + sdt, "- Đang học: " + v("#dk-lop"),
    "- Muốn học: " + v("#dk-khoi"), "- Hình thức: " + v("#dk-hinh")];
  if (v("#dk-ranh")) lines.push("- Lúc rảnh để học thử: " + v("#dk-ranh"));
  if (v("#dk-truong")) lines.push("- Trường muốn thi: " + v("#dk-truong"));
  if (v("#dk-ghichu")) lines.push("- Câu hỏi: " + v("#dk-ghichu"));
  const text = lines.join("\n");
  $("#dk-text").textContent = text;
  $("#dk-status").textContent = ""; st.textContent = "";
  const btn = $("#dk-btn"), xong = (msg, ok) => {
    btn.disabled = false; btn.textContent = "Gửi đăng ký cho anh chị";
    $("#dk-ok").textContent = msg; $("#dk-ok").classList.toggle("err", !ok);
    $("#dk-out").hidden = false; $("#dk-out").scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  if (dkSent === text) { xong("Đăng ký này đã gửi rồi, anh chị sẽ gọi lại sớm. Cần gấp thì gọi hoặc nhắn Zalo bên dưới.", true); return; } // bấm 2 lần không gửi trùng
  if (!EMAIL_NHAN_THONG_BAO) { xong("Bấm Gọi quản lý hoặc Nhắn Zalo (dán tin nhắn bên dưới) để gửi đăng ký cho anh chị nhé.", true); return; }
  // Chỉ báo "đã gửi" khi máy chủ nhận xong; quá 15 giây coi như mạng yếu.
  btn.disabled = true; btn.textContent = "Đang gửi…";
  const huy = new AbortController(), hen = setTimeout(() => huy.abort(), 15000);
  fetch("https://formsubmit.co/ajax/" + EMAIL_NHAN_THONG_BAO, {
    method: "POST", signal: huy.signal, headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ _subject: `Đăng ký học thử: ${v("#dk-ten")} · ${sdt}`, _template: "table", _captcha: "false",
      "Học sinh": v("#dk-ten"), "SĐT phụ huynh": sdt, "Đang học": v("#dk-lop"), "Muốn học": v("#dk-khoi"),
      "Hình thức": v("#dk-hinh"), "Lúc rảnh": v("#dk-ranh"), "Trường muốn thi": v("#dk-truong"), "Câu hỏi": v("#dk-ghichu") })
  }).then(r => { if (!r.ok) throw 0; }).then(() => {
    dkSent = text; dropDraft("nhap-hocthu");
    xong("Đã gửi cho anh chị! Anh chị sẽ gọi lại cho bố mẹ em sớm. Cần gấp thì gọi hoặc nhắn Zalo ngay bên dưới.", true);
  }, () => {
    xong("Mạng yếu nên chưa gửi được. Thông tin em nhập vẫn giữ nguyên: bấm Gửi lại, hoặc Gọi quản lý / Nhắn Zalo (dán tin nhắn bên dưới).", false);
  }).finally(() => clearTimeout(hen));
});
$("#dk-copy").onclick = () => copyText($("#dk-text").textContent, $("#dk-status"), "Đã sao chép. Dán vào Zalo hoặc Messenger để gửi cho lớp.", $("#dk-text"));

/* ================= Firebase ================= */
const configured = !String(firebaseConfig.apiKey || "").startsWith("DAN_");
let app, auth, db;

let teachers = [], feedbackAll = {}, myFeedback = {};
let diemdanhAll = {}, myDiemdanh = {}, myHv = null, hvTuMayChu = false;
let troLyDaTai = { diemDanh: false, diem: false, bai: false };
const gradeOpen = new Set(), gradeDraft = {};
let needRedraw = false;
// Khi giáo viên gõ xong (rời ô nhập), vẽ lại nếu trong lúc gõ có dữ liệu mới.
document.addEventListener("focusout", () => setTimeout(() => { if (needRedraw) renderHomework(); }, 0));
let lessons = [], homework = [], roster = [], requests = [], progressAll = {};
let myProgress = { bai: {}, baitap: {} };
let course = null, lessonId = null, hwView = "open";
let hinhBai = null, hinhBaiDang = false;
let lichNhac = []; // khung giờ nhắc cố định do quản lý đặt
const lichDaBao = new Set(); // nhắc đã hiện một lần trong phiên, tránh báo lặp mỗi phút
let myAnhBT = {}, anhBaiTapAll = {};   // ảnh bài học viên đã tải lên: { [hwId]: [đường dẫn kho] }
let unsubs = [];
// Khu Làm việc
let lvTB = [], lvCV = [], lvKenh = [], lvMine = null, lvErr = "", lvTab = "tin", lvOpen = "", lvMsgs = [], lvMsgUnsub = null, lvPending = [];
let cvView = "mo", chatFilter = "hocvien", reqCount = 0;
window.__lvReady = true;

function renderLocks(state) {
  const msg = {
    checking: ["Đang kiểm tra tài khoản…", "Chờ một chút nhé."],
    setup: ["Web chưa được kết nối Firebase", "Giáo viên cần dán cấu hình Firebase vào file firebase-config.js."],
    out: ["Em cần đăng nhập để xem mục này", "Mục này chỉ dành cho học viên chính thức đã được anh chị duyệt Gmail."],
    pending: ["Gmail của em chưa được duyệt", "Em đã đăng nhập nhưng anh chị chưa duyệt Gmail này."]
  }[state];
  $$("[data-lock]").forEach(el => {
    el.hidden = state === "ok";
    if (state === "ok") return;
    el.innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-lock"/></svg><h3>${msg[0]}</h3><p class="muted">${msg[1]}</p>
      ${state === "checking" || state === "setup" ? "" : `<ol><li>Đăng nhập (lần đầu thì tạo tài khoản) bằng Gmail em dùng để học.</li><li>Gửi yêu cầu duyệt ở trang Đăng nhập / Đăng ký.</li><li>Khi anh chị duyệt xong, mở lại trang này.</li></ol>
      <div class="ctas"><a class="btn primary" href="#tai-khoan">Đăng nhập / Đăng ký</a><a class="btn" href="#dang-ky">Chưa là học viên? Đăng ký học</a></div>`}`;
  });
  $("#gt-body").hidden = state !== "ok";
  // Đã được duyệt: ẩn 3 bước hướng dẫn, chỉ giữ thẻ tài khoản gọn. Chưa duyệt thì vẫn hiện đầy đủ.
  const daDuyet = state === "ok";
  $("#stepper").hidden = daDuyet;
  $("#v-tai-khoan > .page-head > p.muted").hidden = daDuyet;
  $("#v-tai-khoan > .page-head > h1").textContent = daDuyet ? "Tài khoản của em" : "Vào lớp học";
  $("#bt-body").hidden = state !== "ok";
  $("#lv-body").hidden = state !== "ok";
  capNhatTheKhoa();
  renderHvInfo();
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
    $("#who-mail").textContent = "Anh chị cần dán mã kết nối vào config/firebase-config.js.";
    $("#who-status").innerHTML = ""; setStep(1); return;
  }
  if (!user) {
    $("#who-name").textContent = "Bước 1: Tạo tài khoản hoặc đăng nhập";
    $("#who-mail").textContent = "Dùng Gmail của em (hoặc của bố mẹ). Chưa có tài khoản thì chọn “Lần đầu: Tạo tài khoản”.";
    $("#who-status").innerHTML = ""; $("#who-avatar").hidden = true; $("#who-ava").hidden = true; $("#btn-ql").hidden = true;
    $("#nav-acct-t").textContent = "Vào lớp học";
    { const k = $("#nav-ka"); if (k) { k.remove(); $("#nav-acct").classList.remove("has-ka"); } }
    baoTroLy(false);
    setStep(1); return;
  }
  $("#who-name").textContent = user.displayName || "Xin chào";
  $("#who-mail").textContent = mail;
  $("#nav-acct-t").textContent = "Tài khoản";
  $("#btn-learn").textContent = isTeacher ? "Xem giáo trình" : "Vào học ngay →";
  { const q = $("#btn-ql"); q.hidden = !isTeacher || needVerify; q.href = isAdmin ? "#duyet" : "#diem-danh"; }
  if (needVerify) {
    $("#who-status").innerHTML = `<span class="chip line">Chưa xác nhận Gmail</span>`;
    $("#verify-text").textContent = `Anh chị đã gửi một thư xác nhận vào ${mail}. Em bấm link trong thư để chứng minh Gmail này là của em.`;
    setStep(1); return;
  }
  const quyen = ds => `<ul class="quyen">${ds.map(x => `<li>${x}</li>`).join("")}</ul>`;
  if (isAdmin) { $("#who-status").innerHTML = `<span class="chip">Quản lý</span>` + quyen(["Quản lý học viên: đi học, tiến độ, % đỗ", "Chọn Top 5 bài vẽ nổi bật tuần", "Duyệt tài khoản, cộng XP, kho hoạ cụ", "Sửa giáo trình, đăng bài vẽ, bản tin"]); setStep(4); return; }
  if (isTeacher) { $("#who-status").innerHTML = `<span class="chip">Giáo viên</span>` + quyen(["Điểm danh học viên", "Giao bài & chấm bài tập", "Đăng ảnh bài vẽ học viên", "Đăng bản tin nổi bật tuần"]) + `<p class="muted quyen-note">Top 5 bài nổi bật do quản lý chọn.</p>`; setStep(4); return; }
  if (approved) { $("#who-status").innerHTML = `<span class="chip ok">Đã duyệt</span> Em đã vào học được rồi.`; setStep(4); return; }
  if (pendingReq && !editingReq) {
    $("#who-status").innerHTML = `<span class="chip line">Chờ duyệt</span>`;
    $("#wait-text").textContent = `Em đã gửi ngày ${fmtDate(pendingReq.guiLuc)}. Anh chị duyệt xong, trang này tự mở khoá, em không cần làm gì thêm.`;
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

/* ---------- Khoá được cấp ----------
   Học viên đã duyệt được cấp một số khoá (hocvien/<gmail>.khoaHoc, quản lý chọn lúc duyệt hoặc sửa trong danh sách).
   Hồ sơ cũ chưa có khoaHoc thì suy ra từ lớp vẽ em đăng ký. Thẻ khoá ở trang chủ đổi thành "Vào học →". */
const KHOA_GOC = ["Hình hoạ cơ bản", "Hình hoạ người", "Hình hoạ tượng", "Màu & bố cục màu", "Mỹ thuật 2", "Ôn thi cấp tốc"];
const goc = k => String(k || "").split(" · ")[0].trim();
let khoaMuon = null; // khoá học viên vừa bấm "Vào học" khi giáo trình chưa tải xong
function khoaTuChuongTrinh(ct) {
  const s = String(ct || "");
  if (/khối h/i.test(s)) return ["Hình hoạ cơ bản", "Hình hoạ người", "Màu & bố cục màu"];
  if (/khối v/i.test(s)) return ["Hình hoạ cơ bản", "Hình hoạ tượng", "Mỹ thuật 2"];
  if (/cơ bản/i.test(s)) return ["Hình hoạ cơ bản"];
  return KHOA_GOC.slice(); // học online, cấp tốc, chưa rõ: mở hết, anh chị bớt sau
}
const khoaCuaHv = hv => {
  const k = hv && Array.isArray(hv.khoaHoc) ? hv.khoaHoc.filter(x => KHOA_GOC.includes(x)) : [];
  return k.length ? k : khoaTuChuongTrinh(hv && (hv.chuongTrinh || hv.lop));
};
function khoaDuocCap() {
  if (isTeacher) return KHOA_GOC.slice();
  return approved ? khoaCuaHv(myHv) : [];
}
const oChonKhoa = (id, chon) => `<div class="khoa-cap" data-kc="${esc(id)}">${KHOA_GOC.map(k =>
  `<label><input type="checkbox" value="${esc(k)}"${chon.includes(k) ? " checked" : ""}><span>${esc(k)}</span></label>`).join("")}</div>`;
const khoaDaChon = id => $$(`[data-kc="${CSS.escape(id)}"] input:checked`).map(i => i.value);
function capNhatTheKhoa() {
  const cap = khoaDuocCap(), daVao = !!user && !needVerify;
  $$("#khoa-hoc .course").forEach(c => {
    const vao = cap.includes(goc((c.querySelector("h3") || {}).textContent));
    c.dataset.cta = vao ? "Vào học →" : approved ? "Nhắn anh chị để học thêm khoá này →" : daVao ? "Xem tình trạng duyệt tài khoản →" : "Đăng ký học thử →";
    c.classList.toggle("vao", vao);
  });
}
function moTheKhoa(c) {
  const ten = goc((c.querySelector("h3") || {}).textContent);
  if (khoaDuocCap().includes(ten)) {
    khoaMuon = ten; if (lessonId) dongBai(true); lessonId = null; gtLoc = "tat";
    if (location.hash !== "#giao-trinh") location.hash = "#giao-trinh";
    if (lessons.length) {
      renderLessons();
      if (!lessons.some(l => goc(l.khoa) === ten)) toast(`Khoá ${ten} chưa có bài trên giáo trình, anh chị sẽ cập nhật sớm.`);
      else { toast(`Đã chuyển sang môn ${ten}.`); setTimeout(() => $("#gt-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
    }
    return;
  }
  location.hash = approved ? "#lam-viec" : user && !needVerify ? "#tai-khoan" : "#dang-ky";
}

/* ---------- Bài học đầy đủ: hiển thị nội dung viết bằng markdown (tiêu đề, bảng, danh sách, trích dẫn) ---------- */
function mdHTML(md) {
  const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const L = String(md || "").split("\n"), out = [];
  for (let i = 0; i < L.length;) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,4})\s+(.*)/))) { const h = Math.min(m[1].length + 1, 5); out.push(`<h${h}>${inl(m[2])}</h${h}>`); i++; continue; }
    if (l.trim().startsWith("|")) {
      const rows = []; while (i < L.length && L[i].trim().startsWith("|")) rows.push(L[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
      const hasHead = rows[1] && /^\s*\|?\s*:?-{3}/.test(rows[1]);
      const head = hasHead ? `<thead><tr>${cells(rows[0]).map(c => `<th>${inl(c)}</th>`).join("")}</tr></thead>` : "";
      const body = (hasHead ? rows.slice(2) : rows).map(r => `<tr>${cells(r).map(c => `<td>${inl(c)}</td>`).join("")}</tr>`).join("");
      out.push(`<div class="bai-bang"><table>${head}<tbody>${body}</tbody></table></div>`); continue;
    }
    if (l.startsWith(">")) { const q = []; while (i < L.length && L[i].startsWith(">")) q.push(L[i++].replace(/^>\s?/, "")); out.push(`<blockquote>${q.map(inl).join("<br>")}</blockquote>`); continue; }
    if (/^\s*(?:[-*]|\d+\.)\s/.test(l)) {
      const so = /^\s*\d+\./.test(l), it = [];
      while (i < L.length && /^\s*(?:[-*]|\d+\.)\s/.test(L[i])) {
        const t = L[i++].replace(/^\s*(?:[-*]|\d+\.)\s/, ""), con = /^\s{2,}/.test(L[i - 1]);
        const ck = t.match(/^\[( |x)\]\s*(.*)/i);
        it.push(`<li${con ? ' class="con"' : ""}${ck ? ' class="ck"' : ""}>${ck ? `<span class="o${ck[1].trim() ? " x" : ""}"></span>${inl(ck[2])}` : inl(t)}</li>`);
      }
      out.push(so ? `<ol>${it.join("")}</ol>` : `<ul>${it.join("")}</ul>`); continue;
    }
    const p = []; while (i < L.length && L[i].trim() && !/^(#{2,4}\s|\||>|\s*(?:[-*]|\d+\.)\s)/.test(L[i])) p.push(L[i++]);
    out.push(`<p>${p.map(inl).join("<br>")}</p>`);
  }
  return out.join("");
}
/* Quản lý mở trang: tự đưa bài học mới (data/bai-hoc.js) lên giáo trình, không phải bấm nút.
   Chỉ chạy khi có bản mới (BAN đổi); bài quản lý đã xoá thì không thêm lại. */
let daDongBo = false;
const MAU_ID = id => /^bai-/.test(id) || GT_LO_TRINH.some(x => x[0] === id);
async function dongBoBaiHoc() {
  if (daDongBo || !isAdmin || !db) return; daDongBo = true;
  try {
    const { BAN, BAI_HOC } = await import("../../data/bai-hoc.js?v=20261010bf");
    const meta = (await getDoc(doc(db, "giaotrinh", "_meta"))).data() || {};
    if (meta.ban === BAN) return;
    const xoa = new Set(meta.daxoa || []), co = new Set(lessons.map(l => l.id));
    const batch = writeBatch(db); let n = 0;
    BAI_HOC.forEach(({ id, ...d }) => { if (!xoa.has(id)) { batch.set(doc(db, "giaotrinh", id), { ...d, buoc: [], ghichu: "" }); n++; } });
    GT_LO_TRINH.forEach(([id, khoa, ten, loai, thutu, buoc, ghichu]) => { if (!co.has(id) && !xoa.has(id)) batch.set(doc(db, "giaotrinh", id), { khoa, ten, loai, thutu, buoc, ghichu }); });
    lessons.filter(l => /^pm-/.test(l.id)).forEach(l => batch.delete(doc(db, "giaotrinh", l.id))); // bản tóm tắt cũ, nay đã có bài đầy đủ
    batch.set(doc(db, "giaotrinh", "_meta"), { ban: BAN, daxoa: [...xoa] }, { merge: true });
    await timed("Cập nhật bài học", batch.commit());
    toast(`Đã cập nhật giáo trình: ${n} bài học đầy đủ cho học viên.`);
  } catch (e) { daDongBo = false; }
}
async function ghiDaXoa(id) {
  if (!MAU_ID(id)) return;
  try {
    const meta = (await getDoc(doc(db, "giaotrinh", "_meta"))).data() || {};
    await setDoc(doc(db, "giaotrinh", "_meta"), { daxoa: [...new Set([...(meta.daxoa || []), id])] }, { merge: true });
  } catch (e) {}
}

/* ---------- Giáo trình ---------- */
function courses() { return [...new Set(lessons.map(l => l.khoa))]; }
function renderLessons() {
  const csAll = courses();
  $("#khoa-list").innerHTML = csAll.map(c => `<option value="${esc(c)}">`).join("");
  const selectedCourse = $("#bt-khoa").value || store.get(homeworkDraftKey(), {})?.["bt-khoa"];
  $("#bt-khoa").innerHTML = csAll.concat(["Chung"]).map(c => `<option>${esc(c)}</option>`).join("");
  if (csAll.concat(["Chung"]).includes(selectedCourse)) $("#bt-khoa").value = selectedCourse;
  // Học viên chỉ thấy các khoá được cấp (không khớp khoá nào thì vẫn hiện hết để em không bị trống trang).
  const cap = khoaDuocCap();
  let cs = isTeacher ? csAll : csAll.filter(c => cap.includes(goc(c)));
  if (!cs.length) cs = csAll;
  if (khoaMuon && csAll.length) { const k = cs.find(c => goc(c) === khoaMuon); if (k) course = k; khoaMuon = null; }
  const hien = lessons.filter(l => cs.includes(l.khoa));
  // Quản lý luôn thấy khung này: lần đầu để nạp, về sau để cập nhật bài có sẵn (bài tự thêm không bị đụng tới).
  $("#seed-box").hidden = !isAdmin;
  $("#seed-title").textContent = lessons.length ? "Cập nhật giáo trình có sẵn" : "Giáo trình đang trống";
  $("#btn-seed").textContent = lessons.length ? "Cập nhật giáo trình có sẵn" : "Nạp giáo trình có sẵn";
  if (!cs.length) {
    $("#course-tabs").innerHTML = ""; $("#gt-td").innerHTML = ""; $("#gt-loc").innerHTML = ""; $("#lesson").hidden = true;
    $("#gt-ds").innerHTML = `<p class="muted gt-trong">Giáo trình chưa có bài nào.${isAdmin ? " Bấm “Nạp giáo trình có sẵn” ở khung bên dưới, hoặc tự thêm bài." : ""}</p>`;
    return;
  }
  if (!cs.includes(course)) course = cs[0];
  // Bảng thuật ngữ Trung – Việt (assets/js/hinh-bai.js): tải riêng lần đầu mở giáo trình, xong thì vẽ lại
  if (!hinhBai && !hinhBaiDang) { hinhBaiDang = true; import("./hinh-bai.js?v=20261010bf").then(m => { hinhBai = m; renderLessons(); }).catch(() => { hinhBaiDang = false; }); }
  const tenMon = c => goc(c).replace("Màu & bố cục màu", "Màu & Bố cục màu");
  $("#course-tabs").innerHTML = cs.map(c => { const ds = lessons.filter(l => l.khoa === c && !laLoTrinh(l)), xong = ds.filter(l => myProgress.bai[l.id]).length;
    return `<button type="button" class="gt-mon-nut" data-c="${esc(c)}" aria-pressed="${c === course}"><b>${esc(tenMon(c))}</b><small class="num">${isTeacher ? ds.length + " bài" : `${xong}/${ds.length} bài`}</small></button>`; }).join("");
  $("#course-tabs").hidden = cs.length <= 1;
  $$("#course-tabs button").forEach(b => b.onclick = () => { if (course === b.dataset.c && !lessonId) return; course = b.dataset.c; dongBai(true); gtLoc = "tat"; renderLessons(); });
  const list = lessons.filter(l => l.khoa === course);
  const baiSo = list.filter(l => !laLoTrinh(l));                       // bài đánh số (thẻ Lộ trình đứng riêng ở đầu)
  const trangThai = l => myProgress.bai[l.id] ? "xong" : (myProgress.xem || {})[l.id] ? "dang" : "chua";
  // Học theo thứ tự: bài trước hoàn thành mới mở bài sau (giáo viên, quản lý xem được hết)
  const moKhoa = l => { if (isTeacher) return true; const k = baiSo.indexOf(l); return k <= 0 || !!myProgress.bai[l.id] || !!myProgress.bai[baiSo[k - 1].id]; };
  gtMoKhoa = l => !baiSo.includes(l) || moKhoa(l);
  // ---- Thẻ tiến độ: số liệu thật từ dữ liệu tiến độ (bấm "Đã hoàn thành" mới tính xong; mở bài chỉ là "đang học")
  const xong = baiSo.filter(l => trangThai(l) === "xong").length, dang = baiSo.filter(l => trangThai(l) === "dang").length;
  const pt = baiSo.length ? Math.round(xong / baiSo.length * 100) : 0, tiep = baiSo.find(l => trangThai(l) !== "xong");
  if (isTeacher) {
    const hv = roster.filter(x => x.vaiTro !== "giaovien"), tb = hv.length && baiSo.length ? Math.round(hv.reduce((a, x) => a + baiSo.filter(l => progressAll[x.id]?.bai?.[l.id]).length, 0) / (hv.length * baiSo.length) * 100) : 0;
    $("#gt-td").innerHTML = `<p class="eyebrow">${esc(tenMon(course))}</p><div class="gt-td-so"><b class="num">${baiSo.length}</b><span>bài trong môn</span></div>
      <p>Lớp <b class="num">${hv.length}</b> học viên · trung bình hoàn thành <b class="num">${tb}%</b></p><div class="gt-bar" role="progressbar" aria-valuenow="${tb}" aria-valuemin="0" aria-valuemax="100"><i style="width:${tb}%"></i></div>
      <p class="muted">Mỗi thẻ bài ghi số học viên đã hoàn thành.</p>`;
  } else {
    $("#gt-td").innerHTML = `<p class="eyebrow">Tiến độ · ${esc(tenMon(course))}</p>
      <div class="gt-td-so"><b class="num">${xong}/${baiSo.length}</b><span>bài đã hoàn thành</span><b class="num gt-pt">${pt}%</b></div>
      <div class="gt-bar" role="progressbar" aria-valuenow="${pt}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ môn"><i style="width:${pt}%"></i></div>
      <ul class="gt-td-ds"><li><span class="gt-dot xong"></span>Hoàn thành <b class="num">${xong}</b></li><li><span class="gt-dot dang"></span>Đang học <b class="num">${dang}</b></li><li><span class="gt-dot chua"></span>Chưa học <b class="num">${baiSo.length - xong - dang}</b></li></ul>
      ${tiep ? `<button type="button" class="btn primary gt-tiep" data-mo="${esc(tiep.id)}"><small>Bài tiếp theo</small><span>Bài ${pad2b(baiSo.indexOf(tiep) + 1)} · ${esc(tiep.ten.replace(/^(Bài|Chuyên đề)\s*[\d–-]+\s*[–-]\s*/i, ""))}</span><i aria-hidden="true">→</i></button>` : `<p class="gt-xong-het">🎉 Em đã hoàn thành cả môn này!</p>`}`;
  }
  // ---- Bộ lọc trạng thái
  const LOC = isTeacher ? [] : [["tat", "Tất cả", baiSo.length], ["dang", "Đang học", dang], ["chua", "Chưa học", baiSo.length - xong - dang], ["xong", "Hoàn thành", xong]];
  $("#gt-loc").innerHTML = LOC.map(([k, t, n]) => `<button type="button" class="tab" data-loc="${k}" aria-selected="${gtLoc === k}">${t} <span class="num">${n}</span></button>`).join("");
  $("#gt-loc").hidden = !LOC.length;
  $$("#gt-loc button").forEach(b => b.onclick = () => { gtLoc = b.dataset.loc; renderLessons(); });
  // ---- Danh sách thẻ bài
  const loTrinh = list.filter(laLoTrinh);
  const hien2 = baiSo.filter(l => gtLoc === "tat" || trangThai(l) === gtLoc);
  const hvXong = l => roster.filter(x => x.vaiTro !== "giaovien" && progressAll[x.id]?.bai?.[l.id]).length;
  const TT = { xong: ["Hoàn thành", "✓"], dang: ["Đang học", "◐"], chua: ["Chưa học", "○"] };
  const the = l => { const k = baiSo.indexOf(l), tt = trangThai(l), khoa = !moKhoa(l);
    return `<button type="button" class="gt-the tt-${isTeacher ? "gv" : khoa ? "khoa" : tt}" data-mo="${esc(l.id)}"${khoa ? ` aria-disabled="true" data-truoc="${esc(baiSo[k - 1].ten)}"` : ""}>
      <span class="gt-anh">${anhBai(l)}</span>
      <span class="gt-noi"><small class="gt-so">Bài ${pad2b(k + 1)}</small><b class="gt-ten">${esc(l.ten)}</b><span class="gt-mota">${esc(moTaBai(l))}</span>
      <span class="gt-tt">${isTeacher ? `<span class="chip">${hvXong(l)}/${roster.filter(x => x.vaiTro !== "giaovien").length} học viên đã xong</span>` : `${khoa ? `<span class="gt-chip khoa"><i aria-hidden="true">🔒</i>Chưa mở khoá</span>` : `<span class="gt-chip ${tt}"><i aria-hidden="true">${TT[tt][1]}</i>${TT[tt][0]}</span>`}`}</span></span></button>`; };
  $("#gt-ds").innerHTML = (gtLoc === "tat" && loTrinh.length ? loTrinh.map(l => `<button type="button" class="gt-lt" data-mo="${esc(l.id)}"><span>🗺️</span><span><b>${esc(l.ten)}</b><small class="muted">Xem lộ trình cả khoá trước khi học</small></span><span aria-hidden="true">›</span></button>`).join("") : "")
    + (hien2.length ? `<div class="gt-luoi">${hien2.map(the).join("")}</div>` : `<p class="muted gt-trong">Không có bài nào ở mục này.</p>`);
  $$("#gt-ds [data-mo], #gt-td [data-mo]").forEach(b => b.onclick = () => b.dataset.truoc ? toast(`Hoàn thành bài “${b.dataset.truoc}” trước để mở bài này nhé.`) : moBai(b.dataset.mo));
  // ---- Trang chi tiết bài
  const dangMo = lessonId && list.find(l => l.id === lessonId && moKhoa(l));
  $("#gt-wrap").classList.toggle("dang-doc", !!dangMo);
  $("#lesson").hidden = !dangMo;
  if (!dangMo) return;
  const l = dangMo, k = baiSo.indexOf(l), tt = trangThai(l);
  const tnHTML = hinhBai && hinhBai.THUAT_NGU && hinhBai.THUAT_NGU_BAI.includes(l.id) ? `<details class="bai-tn"><summary><b>Bảng dịch thuật ngữ giải phẫu Trung – Việt</b> <small class="muted">· dùng khi đọc sách vẽ tiếng Trung</small></summary>
    <div class="bai-tn-cuon"><table><thead><tr><th>Chữ Trung</th><th>Tiếng Việt</th><th>Khi vẽ, nhìn ở đâu</th></tr></thead><tbody>${hinhBai.THUAT_NGU.map(x => `<tr class="tn-${x.nhom === "Xương" ? "x" : x.nhom === "Cơ" ? "c" : "k"}"><td lang="zh">${esc(x.trung)}</td><td><b>${esc(x.viet)}</b></td><td>${esc(x.ve)}</td></tr>`).join("")}</tbody></table></div></details>` : "";
  const coAnh = l.anh && /^(https:|data:image\/|assets\/)/.test(l.anh);
  const anhMH = coAnh ? `<img class="gtb-anh" src="${esc(l.anh)}" alt="${esc(l.ten)}" loading="lazy" decoding="async">` : isAdmin ? `<p class="muted">Bài này chưa có ảnh. Bấm <b>Sửa tên, mô tả, ảnh</b> ở cuối bài để tải lên.</p>` : "";
  // Sắp các đoạn có sẵn của bài vào đúng phần (không đổi chữ)
  const P = chiaPhanBai(l.noidung || "");
  const items = Array.isArray(l.buoc) ? l.buoc : [];
  if (items.length) (l.loai === "noi-dung" ? P.kienthuc : P.quytrinh).push(l.loai === "noi-dung" ? items.map(x => "- " + x).join("\n") : items.map((x, q) => `${q + 1}. ${x}`).join("\n"));
  const phan = (icon, ten, noi) => noi ? `<section class="gtb-phan"><h3><span aria-hidden="true">${icon}</span>${ten}</h3>${noi}</section>` : "";
  const md = a => a.length ? `<div class="bai-md">${a.map(mdHTML).join("")}</div>` : "";
  const truoc = k > 0 ? baiSo[k - 1] : null, sau = k >= 0 && k < baiSo.length - 1 ? baiSo[k + 1] : null, sauKhoa = sau && !moKhoa(sau);
  const nutXong = isTeacher ? "" : `<button type="button" class="btn ${tt === "xong" ? "" : "primary"} gtb-xong" id="mark">${tt === "xong" ? "✓ Đã hoàn thành · bấm để bỏ" : "Đánh dấu đã hoàn thành bài này"}</button>`;
  $("#lesson").innerHTML = `<button type="button" class="gtb-ve" id="gtb-ve">‹ Tất cả bài · ${esc(tenMon(course))}</button>
    <header class="gtb-dau"><p class="eyebrow">${k >= 0 ? `Bài ${pad2b(k + 1)}/${baiSo.length}` : "Lộ trình"} · ${esc(tenMon(l.khoa))}</p><h2>${esc(l.ten)}</h2>
      ${isTeacher ? `<span class="chip">${hvXong(l)} học viên đã hoàn thành</span>` : `<span class="gt-chip ${tt}"><i aria-hidden="true">${TT[tt][1]}</i>${TT[tt][0]}</span>`}</header>
    ${phan("🎯", "Mục tiêu cần đạt", md(P.muctieu))}
    ${phan("📘", "Kiến thức cần nắm", md(P.kienthuc) + tnHTML)}
    ${phan("🖼️", "Hình ảnh minh hoạ", anhMH)}
    ${phan("🪜", "Quy trình thực hiện", md(P.quytrinh))}
    ${phan("⚠️", "Lỗi thường gặp & cách sửa", md(P.loi))}
    ${phan("✅", "Yêu cầu hoàn thành", md(P.yeucau) + (l.ghichu ? `<p class="gc"><b>Anh chị dặn:</b> ${esc(l.ghichu)}</p>` : "") + (nutXong ? `<p class="muted gtb-ghichu">Làm xong bài và tự kiểm theo các ý trên rồi mới bấm hoàn thành. Mở bài chỉ được tính là “Đang học”.</p>${nutXong}` : ""))}
    <div class="gtb-chuyen" role="navigation" aria-label="Chuyển bài">${truoc ? `<button type="button" data-mo="${esc(truoc.id)}"><small>‹ Bài trước</small><b>${esc(truoc.ten)}</b></button>` : "<span></span>"}${sau ? `<button type="button" data-mo="${esc(sau.id)}" class="sau${sauKhoa ? " khoa" : ""}"${sauKhoa ? ` data-truoc="${esc(l.ten)}"` : ""}><small>${sauKhoa ? "🔒 Hoàn thành bài này để mở" : "Bài tiếp theo ›"}</small><b>${esc(sau.ten)}</b></button>` : "<span></span>"}</div>
    ${isAdmin ? `<div class="gtb-ql"><b>Quản lý bài</b><button class="btn small" type="button" id="gtb-sua">Sửa tên, mô tả, ảnh</button><button class="btn small" type="button" id="gtb-len" ${k <= 0 ? "disabled" : ""}>↑ Lên</button><button class="btn small" type="button" id="gtb-xuong" ${k < 0 || k >= baiSo.length - 1 ? "disabled" : ""}>↓ Xuống</button><button class="btn small" type="button" id="del-l">Xoá bài này</button></div>` : ""}`;
  $("#gtb-ve").onclick = () => dongBai();
  $$("#lesson [data-mo]").forEach(b => b.onclick = () => b.dataset.truoc ? toast(`Hoàn thành bài “${b.dataset.truoc}” trước để mở bài tiếp theo nhé.`) : moBai(b.dataset.mo));
  if ($("#mark")) $("#mark").onclick = () => toggleProgress("bai", l.id).then(renderLessons);
  if (isAdmin) {
    confirmButton($("#del-l"), () => { ghiDaXoa(l.id); dongBai(true); return deleteDoc(doc(db, "giaotrinh", l.id)); });
    const doi = d => { const o = baiSo[k + d]; if (!o) return; const a = l.thutu, b = o.thutu; const bt = writeBatch(db);
      bt.set(doc(db, "giaotrinh", l.id), { thutu: b }, { merge: true }); bt.set(doc(db, "giaotrinh", o.id), { thutu: a === b ? b + d * 0.001 : a }, { merge: true });
      timed("Đổi thứ tự bài", bt.commit()).then(() => toast("Đã đổi thứ tự ✓"), () => toast("Chưa đổi được thứ tự. Thử lại.", "err")); };
    $("#gtb-len").onclick = () => doi(-1); $("#gtb-xuong").onclick = () => doi(1);
    $("#gtb-sua").onclick = () => suaBai(l);
  }
}
const laLoTrinh = l => /^lộ trình/i.test(String(l.ten || ""));
let gtLoc = "tat", gtTha = null, gtMoKhoa = () => true;
// Mở một bài: ghi "đang học" (chưa phải hoàn thành), có nút Quay lại để về danh sách
function moBai(id) {
  const lb = lessons.find(x => x.id === id); if (lb && !gtMoKhoa(lb)) { toast("Hoàn thành bài trước để mở bài này nhé."); return; }
  const moi = !lessonId; lessonId = id;
  if (!isTeacher && approved && !myProgress.bai[id] && !(myProgress.xem || {})[id]) {
    const v = Date.now(); myProgress.xem = { ...(myProgress.xem || {}), [id]: v }; saveData(); try { luuTienDo({ xem: { [id]: v } }).catch(() => {}); } catch (e) {}
  }
  if (moi && !gtTha) gtTha = voiQuayLai(() => { gtTha = null; lessonId = null; renderLessons(); });
  renderLessons();
  requestAnimationFrame(() => { const el = $("#lesson"); if (el && !el.hidden) el.scrollIntoView({ block: "start", behavior: "smooth" }); });
}
function dongBai(khongVe) {
  lessonId = null; if (gtTha) { const f = gtTha; gtTha = null; f(); }
  if (!khongVe) { renderLessons(); requestAnimationFrame(() => $("#gt-wrap")?.scrollIntoView({ block: "start" })); }
}
const pad2b = n => String(n).padStart(2, "0");
// Ảnh của thẻ: chỉ ảnh quản lý tải lên (nút Sửa), chưa có thì để ô trống
function anhBai(l) {
  return l.anh && /^(https:|data:image\/|assets\/)/.test(l.anh) ? `<img src="${esc(l.anh)}" alt="${esc(l.ten)}" loading="lazy" decoding="async">` : `<span class="gt-ph" aria-hidden="true">🖼️</span>`;
}
// Mô tả ngắn: câu đầu tiên của bài (bỏ bảng, tiêu đề, định dạng)
function moTaBai(l) {
  if (l.moTa) return l.moTa;
  const t = String(l.noidung || "").split("\n").filter(x => x.trim() && !/^(#|\||>|-{3})/.test(x.trim())).map(x => x.replace(/\*\*|\*|`/g, "").replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim())[0]
    || (Array.isArray(l.buoc) ? l.buoc.slice(0, 3).join(" · ") : "");
  return t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, "") + "…" : t;
}
// Chia nội dung bài thành các phần theo nhãn có sẵn trong bài (Em sẽ làm được, Lỗi hay gặp, Tự kiểm tra…)
function chiaPhanBai(md) {
  const P = { muctieu: [], kienthuc: [], quytrinh: [], loi: [], yeucau: [] };
  const loaiNhan = t => /em sẽ làm được|mục tiêu|đọc nhanh/i.test(t) ? "muctieu" : /lỗi/i.test(t) ? "loi" : /tự kiểm|đạt khi|qua cổng|bài về nhà|tự hỏi|yêu cầu/i.test(t) ? "yeucau" : null;
  const loaiDe = t => /lỗi/i.test(t) ? "loi" : /quy trình|các bước|\d+ bước/i.test(t) ? "quytrinh" : /phiếu tự kiểm|tiến độ của em|các cổng/i.test(t) ? "yeucau" : null;
  const phan = []; let cur = { de: null, dong: [] };
  String(md).split("\n").forEach(d => { if (/^#{2,5}\s/.test(d)) { phan.push(cur); cur = { de: d, dong: [] }; } else cur.dong.push(d); });
  phan.push(cur);
  phan.forEach(({ de, dong }) => {
    const ld = de && loaiDe(de.replace(/^#+\s*/, ""));
    if (ld) { P[ld].push([de, ...dong].join("\n")); return; }
    const khoi = dong.join("\n").split(/\n\s*\n/).filter(x => x.trim()); const giu = [];
    for (let q = 0; q < khoi.length; q++) {
      let b = khoi[q]; const m = b.trim().match(/^\*\*([^*]+?)\*\*/), ln = m && loaiNhan(m[1]);
      if (ln) { if (/^\*\*[^*]+\*\*\s*$/.test(b.trim()) && khoi[q + 1]) b += "\n\n" + khoi[++q]; P[ln].push(b); } else giu.push(b);
    }
    if (giu.length || de) P.kienthuc.push([de, ...giu].filter(Boolean).join("\n\n"));
  });
  P.kienthuc = P.kienthuc.filter(x => x.replace(/^#+.*$/m, "").trim() || x.split("\n").length > 1);
  return P;
}
function suaBai(l) {
  let anh = l.anh || "";
  const h = moHop(`<h3>Sửa bài</h3><label>Tên bài<input id="sb-ten" maxlength="120" value="${esc(l.ten)}"></label>
    <label>Mô tả ngắn trên thẻ (để trống = lấy câu đầu của bài)<input id="sb-mt" maxlength="160" value="${esc(l.moTa || "")}"></label>
    <label class="btn small">🖼️ Chọn ảnh minh hoạ (bài vẽ thật)<input type="file" id="sb-anh" accept="image/*" hidden></label>
    <label>Hoặc dán link ảnh (https://…)<input id="sb-link" value="${esc(/^https:/.test(anh) ? anh : "")}"></label>
    <div class="tt-xem" id="sb-xem"></div>
    <div class="hop-nut"><button class="btn" type="button" data-dong>Huỷ</button><button class="btn primary" type="button" id="sb-luu">Lưu</button></div>`, "Sửa bài");
  const xem = () => { $("#sb-xem").innerHTML = anh ? `<figure><img src="${esc(anh)}" alt="Ảnh minh hoạ"><button type="button" class="btn small" id="sb-bo">Bỏ ảnh</button></figure>` : ""; if ($("#sb-bo")) $("#sb-bo").onclick = () => { anh = ""; $("#sb-link").value = ""; xem(); }; };
  xem();
  $("#sb-anh").onchange = async e => { try { anh = await nenAnh(e.target.files[0], 900, 300000); xem(); } catch (er) { toast(er.message || "Ảnh lỗi", "err"); } };
  $("#sb-link").oninput = e => { const v = e.target.value.trim(); if (!v || /^https:\/\/\S+$/.test(v)) { anh = v; xem(); } };
  $("#sb-luu").onclick = e => {
    const ten = $("#sb-ten").value.trim(); if (!ten) return toast("Tên bài không được trống.", "err");
    e.target.disabled = true;
    timed("Sửa bài", setDoc(doc(db, "giaotrinh", l.id), { ten, moTa: $("#sb-mt").value.trim(), anh }, { merge: true }))
      .then(() => { toast("Đã lưu bài ✓"); h.dong(); }, () => { e.target.disabled = false; toast("Chưa lưu được. Kiểm tra mạng rồi thử lại.", "err"); });
  };
}

/* ---------- Bài tập ---------- */
/* ---------- Chấm theo 3 tiêu chí: chưa đạt thì học viên phải nộp lại ---------- */
const TIEU_CHI = [["hinh", "Hình cơ bản"], ["sacdo", "Sắc độ"], ["tongthe", "Tổng thể"]];
const nopLuc = v => typeof v === "number" ? v : (v ? 1 : 0);          // thời điểm học viên bấm nộp (bản cũ lưu true)
const canLamLai = (fb, nop) => fb && fb.trangThai === "lamlai" && !(nopLuc(nop) > (fb.luc || 0));
const daNopLai = (fb, nop) => fb && fb.trangThai === "lamlai" && nopLuc(nop) > (fb.luc || 0);
const chuaDat = fb => TIEU_CHI.filter(([k]) => fb && fb.tieuChi && fb.tieuChi[k] === false).map(([, t]) => t);
function nopLai(id) {
  const v = Date.now(); myProgress.baitap[id] = v; saveData();
  timed("Nộp lại bài", luuTienDo({ baitap: { [id]: v } }))
    .then(() => toast("Đã báo anh chị: em đã nộp lại bài. Cố lên!"))
    .catch(() => alertStatus("Chưa gửi được. Kiểm tra mạng rồi bấm lại."));
  renderHomework(); if (typeof capNhatNhac === "function") capNhatNhac();
}
function renderHomework() {
  try { capNhatNhac(); } catch (e) {}
  // Không vẽ lại khi giáo viên đang gõ điểm/nhận xét, tránh mất chữ đang gõ.
  const ae = document.activeElement;
  if (ae && ae.closest && ae.closest(".grade") && ae.matches("input")) { needRedraw = true; return; }
  needRedraw = false;
  $("#hw-workspace").classList.toggle("staff", isTeacher);
  $("#hw-intro").textContent = isTeacher ? "Giao đề, chia sẻ tài liệu và theo dõi bài nộp của học viên trong một không gian." : "Đọc đề, tải tài liệu và theo dõi hạn nộp tại đây. Bài vẽ nộp trên lớp hoặc qua nhóm lớp.";
  const open = homework.filter(h => !h.han || daysUntil(h.han) >= 0);
  const soon = open.filter(h => h.han && daysUntil(h.han) <= 3);
  const done = isTeacher ? homework.filter(h => roster.some(r => (progressAll[r.id]?.baitap?.[h.id] && !feedbackAll[r.id]?.[h.id]) || daNopLai(feedbackAll[r.id]?.[h.id], progressAll[r.id]?.baitap?.[h.id]))).length : homework.filter(h => myProgress.baitap[h.id]).length;
  // Đã nộp / Đã chấm chỉ có nghĩa với học viên
  if (isTeacher && (hwView === "nop" || hwView === "cham")) { hwView = "open"; $$("#hw-filter .tab").forEach(x => x.setAttribute("aria-selected", x.dataset.h === "open")); }
  $$("#hw-filter [data-hv]").forEach(b => b.hidden = isTeacher);
  const hop = h => hwView === "tat" ? true : hwView === "open" ? !h.han || daysUntil(h.han) >= 0 : hwView === "past" ? !!h.han && daysUntil(h.han) < 0
    : hwView === "nop" ? !!myProgress.baitap[h.id] && !myFeedback[h.id] : !!myFeedback[h.id];
  const dem = v => { const cu = hwView; hwView = v; const n = homework.filter(hop).length; hwView = cu; return n; };
  ["tat", "open", "nop", "cham", "past"].forEach(v => $("#hw-count-" + v).textContent = dem(v));
  $("#hw-overview").innerHTML = `<article><span>Đang làm</span><b class="num">${open.length}</b><small>Bài còn thời gian</small></article><article><span>Sắp đến hạn</span><b class="num">${soon.length}</b><small>Trong 3 ngày tới</small></article><article><span>${isTeacher ? "Cần chấm" : "Đã nộp"}</span><b class="num">${done}</b><small>${isTeacher ? "Bài có học viên chờ chấm" : "Bài đã đánh dấu nộp"}</small></article>`;
  const courseSelect = $("#hw-course"), selected = courseSelect.value;
  const courses = [...new Set(homework.map(h => h.khoa).filter(Boolean))].sort((a,b) => a.localeCompare(b, "vi"));
  courseSelect.innerHTML = '<option value="">Tất cả khóa học</option>' + courses.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  courseSelect.value = courses.includes(selected) ? selected : "";
  const q = timTen($("#hw-search").value), khoa = courseSelect.value;
  const list = homework.filter(h => hop(h)
    && (!khoa || h.khoa === khoa) && (!q || timTen(`${h.ten} ${h.mota || ""} ${h.lop || ""}`).includes(q)))
    .sort((a,b) => hwView !== "past" ? String(a.han || "9999").localeCompare(String(b.han || "9999")) : String(b.han).localeCompare(String(a.han)));
  $("#hw-results").textContent = `${list.length} bài tập · ${hwView !== "past" ? "Hạn gần nhất trước" : "Hết hạn gần nhất trước"}`;
  if (!list.length) {
    $("#hw-list").innerHTML = `<div class="hw-empty"><b>${q || khoa ? "Không tìm thấy bài phù hợp" : ({ tat: "Chưa có bài tập nào", open: "Chưa có bài tập đang làm", nop: "Chưa có bài chờ chấm", cham: "Chưa có bài được chấm", past: "Chưa có bài hết hạn" })[hwView]}</b><p>${q || khoa ? "Thử đổi từ khóa hoặc chọn lại khóa học." : isTeacher ? "Bắt đầu bằng một đề bài và tài liệu hướng dẫn." : "Bài anh chị giao sẽ xuất hiện tại đây."}</p>${q || khoa ? '<button class="btn small" type="button" id="hw-clear">Xóa bộ lọc</button>' : ""}</div>`;
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
        <button class="btn small" data-sua="${esc(h.id)}">Sửa</button>
        <button class="btn small" data-nhan-ban="${esc(h.id)}">Nhân bản</button>
        <button class="btn small" data-del="${esc(h.id)}">Xoá</button>`;
    const studentBar = `<button class="btn small ${myProgress.baitap[h.id] ? "" : "primary"}" data-hw="${esc(h.id)}">${myProgress.baitap[h.id] ? "Đã nộp ✓" : "Đánh dấu đã nộp"}</button>`;
    const tt = isTeacher ? null : canLamLai(fb, myProgress.baitap[h.id]) ? ["lamlai", "Cần làm lại"] : fb ? ["cham", "Đã chấm"] : myProgress.baitap[h.id] ? ["nop", "Đã nộp"] : n < 0 ? ["tre", "Quá hạn"] : ["chua", "Chưa nộp"];
    // Yêu cầu nhiều dòng → gạch đầu dòng cho dễ đọc
    const dong = String(h.mota || "").split("\n").map(x => x.replace(/^\s*[-•*+]\s*/, "").trim()).filter(Boolean);
    const moTa = dong.length > 1 ? `<ul class="desc">${dong.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : h.mota ? `<p class="desc">${esc(h.mota)}</p>` : "";
    return `<div class="hw" data-nhac-id="${esc("bt-" + h.id)}"><div>${tt ? `<span class="hw-tt tt-${tt[0]}">${tt[1]}</span>` : ""}<p class="eyebrow">${esc(h.khoa)}${h.lop ? " · " + esc(h.lop) : ""}</p><h3>${esc(h.ten)}</h3></div>
      <p class="due ${n <= 1 ? "late" : ""}">${due}</p>${moTa}
      ${homeworkFilesHTML(h)}
      ${!isTeacher && fb ? `<p class="fb ${fb.trangThai === "lamlai" ? "lamlai" : fb.trangThai === "dat" ? "dat" : ""}"><b>Anh chị nhận xét${fb.diem ? ` · Điểm ${esc(fb.diem)}` : ""}:</b> ${esc(fb.nhanXet || "")}${fb.tieuChi ? `<span class="tc-ket">${TIEU_CHI.map(([k, t]) => `<i class="${fb.tieuChi[k] === false ? "chua" : "ok"}">${fb.tieuChi[k] === false ? "✗" : "✓"} ${t}</i>`).join("")}</span>` : ""}<br><span class="muted">${esc(fb.nguoiCham || "")} · ${fmtDate(fb.luc)}</span></p>` : ""}
      ${!isTeacher && canLamLai(fb, myProgress.baitap[h.id]) ? `<div class="lamlai-box"><b>⚠ Bài này cần làm lại</b><span>Chưa đạt: ${esc(chuaDat(fb).join(", ") || "theo nhận xét của anh chị")}.${fb.hanLamLai ? ` Hạn nộp lại: <b>${ngayVN(fb.hanLamLai)}</b>` : ""} Làm lại sớm để không bị chậm tiến độ cả lớp nhé.</span><button class="btn small primary" data-nl="${esc(h.id)}">Em đã làm lại · Nộp lại</button></div>` : ""}
      ${!isTeacher && daNopLai(fb, myProgress.baitap[h.id]) ? `<p class="nl-cho">✓ Đã nộp lại, chờ anh chị chấm lại.</p>` : ""}
      ${isTeacher ? "" : anhHocVien(h)}
      <div class="acts">${isTeacher ? staffBar : studentBar}</div>
      ${isTeacher && gradeOpen.has(h.id) ? gradeTable(h) : ""}</div>`;
  }).join("");
  $$("#hw-list [data-hw]").forEach(b => b.onclick = () => toggleProgress("baitap", b.dataset.hw).then(renderHomework));
  $$("#hw-list [data-nl]").forEach(b => b.onclick = () => nopLai(b.dataset.nl));
  $$("#hw-list .tc-t").forEach(b => b.onclick = () => { const v = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", v); gradeDraft[b.dataset.key] = v; });
  $$("#hw-list [data-del]").forEach(b => confirmButton(b, () => deleteHomework(b.dataset.del)));
  $$("#hw-list [data-sua]").forEach(b => b.onclick = () => { const h = homework.find(x => x.id === b.dataset.sua); if (h) moSuaBaiTap(h, false); });
  $$("#hw-list [data-nhan-ban]").forEach(b => b.onclick = () => { const h = homework.find(x => x.id === b.dataset.nhanBan); if (h) moSuaBaiTap(h, true); });
  $$("#hw-list [data-file]").forEach(b => b.onclick = () => downloadHomeworkFile(b));
  $$("#hw-list [data-grade]").forEach(b => b.onclick = () => {
    const id = b.dataset.grade; gradeOpen.has(id) ? gradeOpen.delete(id) : gradeOpen.add(id); renderHomework();
  });
  $$("#hw-list .grade input").forEach(i => i.oninput = () => { gradeDraft[i.dataset.key] = i.value; });
  $$("#hw-list [data-save]").forEach(b => b.onclick = () => saveGrade(b));
  $$("#hw-list [data-up]").forEach(i => i.onchange = () => taiAnhBaiTap(i.dataset.up, i.files));
  $$("#hw-list .g-xs").forEach(c => c.onchange = () => danhDauXuatSac(c));
  hienAnhTuKho(); tongHopBaiTap();
}
/* ---------- Ảnh bài học viên tải lên (tối đa 3 ảnh mỗi bài) ---------- */
function anhHocVien(h) {
  const ds = myAnhBT[h.id] || [];
  return `<div class="bt-anh"><div class="bt-anh-ds">${ds.map(p => `<img data-anh="${esc(p)}" alt="Ảnh bài đã nộp">`).join("")}</div>
    ${ds.length < 3 ? `<label class="btn small bt-anh-chon">📷 Tải ảnh bài (${ds.length}/3)<input type="file" accept="image/*" multiple data-up="${esc(h.id)}" hidden></label>` : `<span class="muted">Đã đủ 3 ảnh cho bài này.</span>`}</div>`;
}
const anhTrongBai = (uid, hid) => { const ds = (anhBaiTapAll[uid] || {})[hid] || []; return ds.length ? `<div class="bt-anh-nho">${ds.map(p => `<img data-anh="${esc(p)}" alt="Ảnh bài">`).join("")}</div>` : ""; };
async function taiAnhBaiTap(hid, files) {
  const con = 3 - (myAnhBT[hid] || []).length;
  if (!files || !files.length) return;
  if (con <= 0) return toast("Bài này đã đủ 3 ảnh.", "err");
  const list = [...files].slice(0, con);
  if (files.length > con) toast(`Chỉ nhận thêm ${con} ảnh cho bài này.`);
  toast("Đang tải ảnh…");
  try {
    const sdk = await attachmentStorage(app), moi = [];
    for (const [i, f] of list.entries()) {
      try {
        const data = await nenAnh(f, 1400, 850000);
        const blob = await (await fetch(data)).blob();
        const path = `nopbai/${hid}/${mail}/${Date.now()}-${i}.jpg`;
        await sdk.uploadBytes(sdk.ref(sdk.storage, path), blob, { contentType: "image/jpeg" });
        moi.push(path);
      } catch (e) { toast(`Chưa tải được ${f.name || "ảnh"}. Thử ảnh khác nhỏ hơn.`, "err"); }
    }
    if (!moi.length) return;
    await timed("Lưu ảnh bài", setDoc(doc(db, "anhbaitap", mail), { [hid]: [...(myAnhBT[hid] || []), ...moi] }, { merge: true }));
    toast("Đã tải ảnh bài lên ✓");
  } catch (e) { toast("Chưa tải được ảnh. Kiểm tra mạng rồi thử lại.", "err"); }
}
async function hienAnhTuKho() {
  const nodes = [...document.querySelectorAll("#hw-list img[data-anh]:not([data-dang])")];
  if (!nodes.length) return;
  let sdk; try { sdk = await attachmentStorage(app); } catch (e) { return; }
  nodes.forEach(async img => {
    img.dataset.dang = "1"; img.classList.add("bt-anh-cho");
    img.onclick = () => img.src && window.open(img.src, "_blank", "noopener");
    try { img.src = await sdk.getDownloadURL(sdk.ref(sdk.storage, img.dataset.anh)); img.classList.remove("bt-anh-cho"); }
    catch (e) { img.alt = "Chưa mở được ảnh"; }
  });
}
/* Bài xuất sắc: giáo viên đánh dấu, ảnh bài được đưa vào Bài vẽ học viên (tách hẳn khỏi bài nổi bật và bài học) */
const xsKey = (hid, uid) => `xs_${hid}_${uid}`.replace(/[^A-Za-z0-9_@.-]/g, "_");
async function danhDauXuatSac(c) {
  const [hid, uid] = c.dataset.xs.split("|");
  const ref = doc(db, "baive", xsKey(hid, uid));
  try {
    if (!c.checked) { await timed("Bỏ đánh dấu xuất sắc", deleteDoc(ref)); toast("Đã bỏ khỏi Bài vẽ học viên."); return; }
    const path = ((anhBaiTapAll[uid] || {})[hid] || [])[0];
    if (!path) { c.checked = false; return toast("Học viên chưa tải ảnh bài này nên chưa đưa lên được.", "err"); }
    const sdk = await attachmentStorage(app), url = await sdk.getDownloadURL(sdk.ref(sdk.storage, path));
    const hv = roster.find(r => r.id === uid), bt = homework.find(h => h.id === hid);
    await timed("Đưa bài xuất sắc", setDoc(ref, { anh: url, hocVien: (hv && hv.ten) || uid, loai: "Bài tập", ghiChu: bt ? bt.ten : "", nguoi: mail, ten: tenToi(), luc: Date.now(), hang: 0, nguonId: xsKey(hid, uid) }));
    toast("Đã đưa lên Bài vẽ học viên ⭐");
  } catch (e) { c.checked = !c.checked; toast("Chưa lưu được. Kiểm tra mạng rồi thử lại.", "err"); }
}
/* Đánh giá bài: bảng tổng hợp theo từng bài, cho giáo viên và quản lý */
function tongHopBaiTap() {
  if (!isTeacher) return;
  let box = $("#bt-tong");
  if (!box) { box = document.createElement("div"); box.id = "bt-tong"; $("#hw-overview").after(box); }
  if (!homework.length || !roster.length) { box.innerHTML = ""; return; }
  const dong = homework.map(h => {
    const fbs = roster.map(r => (feedbackAll[r.id] || {})[h.id]).filter(Boolean);
    const nop = roster.filter(r => (progressAll[r.id] || {}).baitap && progressAll[r.id].baitap[h.id]).length;
    const diems = fbs.map(f => soDiem(f.diem)).filter(x => x !== null);
    const dat = fbs.filter(f => f.trangThai === "dat").length, lamLai = fbs.filter(f => f.trangThai === "lamlai").length;
    const anh = roster.filter(r => ((anhBaiTapAll[r.id] || {})[h.id] || []).length).length;
    const tb = diems.length ? (diems.reduce((a, b) => a + b, 0) / diems.length).toFixed(1).replace(".", ",") : "–";
    return `<tr><td><b>${esc(h.ten)}</b><small>${esc(h.khoa || "")}</small></td><td class="num">${nop}/${roster.length}</td><td class="num">${fbs.length}</td><td class="num">${anh}</td><td class="num">${tb}</td><td class="num">${fbs.length ? Math.round(dat / fbs.length * 100) + "%" : "–"}</td><td class="num">${lamLai}</td></tr>`;
  }).join("");
  box.innerHTML = `<section class="bt-tong"><p class="eyebrow">Đánh giá bài tập</p><div class="bt-tong-bang"><table><thead><tr><th>Bài</th><th>Đã nộp</th><th>Đã chấm</th><th>Có ảnh</th><th>Điểm TB</th><th>Đạt 3 tiêu chí</th><th>Làm lại</th></tr></thead><tbody>${dong}</tbody></table></div></section>`;
  hienAnhTuKho();
}
function gradeTable(h) {
  if (!roster.length) return `<div class="grade"><p class="muted">Chưa có học viên nào được duyệt.</p></div>`;
  const items = roster.map(r => {
    const done = (progressAll[r.id] || {}).baitap && progressAll[r.id].baitap[h.id];
    const fb = (feedbackAll[r.id] || {})[h.id] || {};
    const k1 = `${h.id}|${r.id}|diem`, k2 = `${h.id}|${r.id}|nx`;
    const d = gradeDraft[k1] ?? fb.diem ?? "", nx = gradeDraft[k2] ?? fb.nhanXet ?? "";
    const tc = k => { const key = `${h.id}|${r.id}|tc-${k}`; return gradeDraft[key] ?? (fb.tieuChi ? fb.tieuChi[k] !== false : true); };
    const nopLaiRoi = daNopLai(fb, done);
    return `<div class="g-row ${nopLaiRoi ? "nop-lai" : ""}">
      <div class="g-who"><b>${esc(r.ten)}</b> ${nopLaiRoi ? '<span class="chip warn">Đã nộp lại · chấm lại</span>' : fb.trangThai === "lamlai" ? '<span class="chip bad">Đang phải làm lại</span>' : done ? '<span class="chip ok">Đã nộp</span>' : '<span class="chip line">Chưa nộp</span>'}
        <span class="muted">${esc(r.chuongTrinh || r.lop || "")}</span>${anhTrongBai(r.id, h.id)}</div>
      <div class="g-in">
        <label>Điểm<input class="g-diem" data-key="${esc(k1)}" value="${esc(d)}" maxlength="6" inputmode="decimal" placeholder="VD: 8"></label>
        <label class="g-nx-l">Nhận xét<input class="g-nx" data-key="${esc(k2)}" value="${esc(nx)}" maxlength="300" placeholder="Nhận xét ngắn"></label>
        <button class="btn small primary" data-save="${esc(h.id)}|${esc(r.id)}">${fb.luc ? "Lưu lại" : "Lưu"}</button>
      </div>
      <label class="xs-l"><input type="checkbox" class="g-xs" data-xs="${esc(h.id)}|${esc(r.id)}" ${BAIVE_DONG.some(b => b.nguonId === xsKey(h.id, r.id)) ? "checked" : ""}> ⭐ Xuất sắc · đưa lên Bài vẽ học viên (không đưa vào bài nổi bật hay bài học)</label>
      <div class="g-tc"><span class="muted">Đạt tiêu chí (bỏ chọn nếu chưa đạt → học viên phải nộp lại):</span>${TIEU_CHI.map(([k, t]) => `<button type="button" class="tc-t" data-key="${esc(h.id)}|${esc(r.id)}|tc-${k}" data-k="${k}" aria-pressed="${tc(k)}">${t}</button>`).join("")}</div></div>`;
  }).join("");
  return `<div class="grade">${items}</div>`;
}
async function saveGrade(btn) {
  const [hid, email] = btn.dataset.save.split("|");
  const k1 = `${hid}|${email}|diem`, k2 = `${hid}|${email}|nx`;
  const row = btn.closest(".g-row");
  const diem = row.querySelector(".g-diem").value.trim(), nhanXet = row.querySelector(".g-nx").value.trim();
  const tieuChi = {}; row.querySelectorAll(".tc-t").forEach(b => { tieuChi[b.dataset.k] = b.getAttribute("aria-pressed") === "true"; delete gradeDraft[b.dataset.key]; });
  const dat = Object.values(tieuChi).every(Boolean);
  const han = new Date(Date.now() + 3 * 864e5 + 7 * 36e5).toISOString().slice(0, 10);
  delete gradeDraft[k1]; delete gradeDraft[k2];
  btn.textContent = dat ? "Đã lưu ✓" : "Đã lưu · yêu cầu làm lại";
  timed("Lưu điểm", setDoc(doc(db, "nhanxet", email), { [hid]: { diem, nhanXet, tieuChi, trangThai: dat ? "dat" : "lamlai", hanLamLai: dat ? "" : han, nguoiCham: (user && user.displayName) || mail, luc: Date.now() } }, { merge: true }))
    .catch(() => { gradeDraft[k1] = diem; gradeDraft[k2] = nhanXet; btn.textContent = "Lỗi, bấm lưu lại"; });
}
$$("#hw-filter .tab").forEach(b => b.onclick = () => {
  hwView = b.dataset.h; $$("#hw-filter .tab").forEach(x => x.setAttribute("aria-selected", x === b)); renderHomework();
});
window.__hwView = v => { const b = $(`#hw-filter .tab[data-h="${v}"]`); if (b) b.click(); };   // cho Nhắc việc mở đúng tab bài tập
$("#hw-search").oninput = renderHomework;
$("#hw-course").onchange = renderHomework;
$("#hw-new").onclick = () => { $("#hw-composer").open = true; $("#hw-composer").scrollIntoView({block:"start", behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}); $("#bt-ten").focus({preventScroll:true}); };
if (matchMedia("(max-width:900px)").matches) $("#hw-composer").open = false;

/* ---------- Tệp bài tập: chọn trước, tải khi giao bài, chỉ báo thành công sau khi lưu ---------- */
let homeworkFiles = [], homeworkBusy = false, homeworkUpload = null, homeworkCanceled = false;
const homeworkDraftKey = () => mail ? "nhap-bt-" + mail : null;

/* ---------- Sửa / Nhân bản bài đã giao: dùng lại đúng khung giao bài ---------- */
// editingHomeworkId = id bài đang sửa (null = đang soạn bài mới hoặc bản sao). editingHomeworkKept = tệp cũ còn giữ lại.
let editingHomeworkId = null, editingHomeworkKept = [];
function renderKeptFiles() {
  const box = $("#bt-file-existing"); if (!box) return;   // trang cũ còn nằm trong bộ nhớ đệm chưa có khung này
  box.hidden = !editingHomeworkKept.length;
  box.innerHTML = editingHomeworkKept.map((f,i) => `<li><span class="file-kind">${esc(fileExt(f.name).toUpperCase())}</span><span class="file-detail"><b>${esc(f.name)}</b><small>${fileSize(f.size)} · tệp đang có</small></span><button type="button" class="file-remove" data-remove-kept="${i}" aria-label="Bỏ tệp ${esc(f.name)}" ${homeworkBusy ? "disabled" : ""}>×</button></li>`).join("");
  $$("[data-remove-kept]").forEach(b => b.onclick = () => { if (homeworkBusy) return; editingHomeworkKept.splice(Number(b.dataset.removeKept),1); $("#bt-file-error").textContent = ""; renderKeptFiles(); });
}
function datCheDoSoanBai(che) {   // "moi" | "sua" | "saochep"
  const tieuDe = $("#hw-compose-title"), huy = $("#bt-huy-sua");
  if (tieuDe) tieuDe.textContent = che === "sua" ? "Sửa bài tập" : che === "saochep" ? "Nhân bản bài tập" : "Giao bài tập mới";
  $("#bt-submit").firstChild.textContent = che === "sua" ? "Lưu thay đổi " : che === "saochep" ? "Giao bản sao cho học viên " : "Giao bài cho học viên ";
  if (huy) huy.hidden = che === "moi";
}
function moSuaBaiTap(h, nhanBan) {
  if (homeworkBusy) return;
  clearHomeworkFiles(); $("#bt-file-error").textContent = ""; $("#bt-status").textContent = ""; $("#bt-status").classList.remove("err");
  $("#bt-ten").value = nhanBan ? `${h.ten} (bản sao)`.slice(0, 180) : (h.ten || "");
  if ([...$("#bt-khoa").options].some(o => o.value === h.khoa)) $("#bt-khoa").value = h.khoa;
  $("#bt-han").value = nhanBan ? "" : (h.han || "");
  $("#bt-lop").value = h.lop || ""; $("#bt-mota").value = h.mota || "";
  // Tệp đính kèm gắn với mã bài gốc nên bản sao không mang theo tệp; anh chị đính kèm lại nếu cần.
  editingHomeworkId = nhanBan ? null : h.id;
  editingHomeworkKept = nhanBan ? [] : (Array.isArray(h.tepDinhKem) ? h.tepDinhKem.filter(f => validAttachmentPath(f.path,h.id)) : []);
  renderKeptFiles(); datCheDoSoanBai(nhanBan ? "saochep" : "sua");
  $("#hw-composer").open = true;
  $("#hw-composer").scrollIntoView({block:"start", behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  $("#bt-ten").focus({preventScroll:true});
}
function thoatSuaBaiTap(xoaForm) {
  editingHomeworkId = null; editingHomeworkKept = []; renderKeptFiles(); datCheDoSoanBai("moi");
  if (xoaForm) { $("#f-bt").reset(); clearHomeworkFiles(); dropDraft(homeworkDraftKey()); $("#bt-file-error").textContent = ""; $("#bt-status").textContent = ""; }
}
if ($("#bt-huy-sua")) $("#bt-huy-sua").onclick = () => { if (!homeworkBusy) thoatSuaBaiTap(true); };
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
  } catch (e) { toast(e?.code === 'storage/object-not-found' ? "Tệp không còn trong kho. Nhờ anh chị cập nhật lại tài liệu." : "Chưa tải được tài liệu. Kiểm tra kết nối hoặc liên hệ anh chị.","err"); }
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
  // Đang sửa bài cũ: ghi đè đúng bài đó, giữ ngày giao gốc và các tệp chưa bị bỏ.
  const goc = editingHomeworkId ? homework.find(h => h.id === editingHomeworkId) : null;
  if (editingHomeworkId && !goc) { thoatSuaBaiTap(false); st.textContent = "Bài này vừa bị xoá nên không sửa được nữa. Bấm lại để giao thành bài mới."; st.classList.add("err"); return; }
  const kept = goc ? [...editingHomeworkKept] : [];
  if (kept.length + files.length > FILE_LIMITS.count) { $("#bt-file-error").textContent = `Mỗi bài tối đa ${FILE_LIMITS.count} tệp (đang có ${kept.length} tệp cũ). Bỏ bớt tệp rồi lưu lại.`; return; }
  const boDi = goc ? (goc.tepDinhKem || []).filter(f => validAttachmentPath(f.path,goc.id) && !kept.some(k => k.path === f.path)) : [];
  const data = {ten:$("#bt-ten").value.trim(),khoa:$("#bt-khoa").value,han:$("#bt-han").value,lop:$("#bt-lop").value.trim(),mota:$("#bt-mota").value.trim(),taoLuc:goc ? (goc.taoLuc || Date.now()) : Date.now()};
  if (goc) data.suaLuc = Date.now();
  if (!data.ten) { st.textContent = "Vui lòng nhập tên bài tập."; st.classList.add("err"); $("#bt-ten").focus(); return; }
  homeworkBusy = true; homeworkCanceled = false;
  $("#bt-fields").disabled = true; $("#bt-cancel").disabled = false; $("#bt-upload-progress").value = 0;
  $("#bt-upload-state").hidden = !files.length;
  st.classList.remove("err"); st.textContent = files.length ? "Đang gửi tệp. Giữ trang mở cho đến khi hoàn tất." : goc ? "Đang lưu thay đổi…" : "Đang giao bài…";
  const assignment = goc ? doc(db,"baitap",goc.id) : doc(collection(db,"baitap")), uploaded = [], paths = [];
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
    await setDoc(assignment,{...data,tepDinhKem:[...kept,...uploaded]});
    // Tệp cũ đã bị bỏ khỏi bài: dọn khỏi kho sau khi bài lưu xong (dọn lỗi cũng không ảnh hưởng bài).
    if (boDi.length) { try { const s = sdk || await attachmentStorage(app); await Promise.allSettled(boDi.map(f => s.deleteObject(s.ref(s.storage,f.path)))); } catch {} }
    if (user?.uid === owner) {
      form.reset(); clearHomeworkFiles(); dropDraft(draftKey); thoatSuaBaiTap(false);
      st.textContent = goc ? "Đã lưu thay đổi của bài tập." : `Đã giao bài${uploaded.length ? ` cùng ${uploaded.length} tệp đính kèm` : ""}.`; toast(st.textContent);
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
// Lưu tiến độ của học viên (bài đã hoàn thành, bài đang học, bài tập đã nộp)
// Chỉ ghi đúng phần vừa đổi (gộp vào hồ sơ trên máy chủ) — không bao giờ ghi đè cả tiến độ bằng dữ liệu đang có trên máy này
function luuTienDo(thay) { return setDoc(doc(db, "tiendo", mail), { ...(thay || {}), capNhat: Date.now() }, { merge: true }); }
function toggleProgress(kind, id) {
  const cu = myProgress[kind][id], moi = cu ? false : Date.now(); myProgress[kind][id] = moi; saveData(); // lưu thời điểm để tính hạng
  timed("Lưu tiến độ", luuTienDo({ [kind]: { [id]: moi } }))
    .catch(() => { if (myProgress[kind][id] === moi) { myProgress[kind][id] = cu; renderLessons(); renderHomework(); } alertStatus("Chưa lưu được tiến độ. Kiểm tra mạng rồi thử lại."); });
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
  let buoc = "Phiếu đăng ký";
  try {
    await setDoc(ref, mau); await deleteDoc(ref);
    buoc = "Điểm danh";
    const ddRef = doc(db, "diemdanh", "_kiem-tra"); await setDoc(ddRef, { thu: "co" }); await deleteDoc(ddRef);
    buoc = "Việc cần làm";
    const cvRef = doc(db, "congviec", "_kiem-tra"); await setDoc(cvRef, { viec: "thử", cho: "tatca", xong: false, luc: Date.now() }); await deleteDoc(cvRef);
    buoc = "Báo sự cố";
    // Phiếu thử của lần kiểm tra trước có thể còn sót (đóng trang giữa chừng): dọn trước, nếu không lần ghi này bị tính là "sửa" và bị chặn oan
    const scRef = doc(db, "suco", "_kiem-tra"); await deleteDoc(scRef).catch(() => {}); await setDoc(scRef, { coSo: "thử", loai: "Khác", moTa: "thử", ai: mail, ten: "", luc: Date.now(), capNhat: Date.now(), trangThai: "moi" }); await deleteDoc(scRef);
    box.className = "sv-status ok"; box.textContent = "✓ Máy chủ hoạt động tốt: học viên gửi phiếu sẽ hiện ngay ở đây.";
  } catch (e) {
    const code = (e && e.code) || "";
    box.className = "sv-status bad";
    box.innerHTML = code === "permission-denied"
      ? `<b>⚠ Luật bảo mật trên Firebase đang là bản CŨ</b>, nên phiếu học viên gửi bị máy chủ chặn (anh chị vẫn nhận email nhưng danh sách trống).
         <ol><li>Bấm <b>Sao chép luật mới</b>.</li><li>Bấm <b>Mở trang dán luật</b> → xoá hết chữ cũ trong khung → dán vào → bấm <b>Publish</b>.</li><li>Quay lại đây, bấm <b>Kiểm tra lại</b>.</li></ol><small>Bước bị chặn: ${esc(buoc)}.</small>
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
  // Một dòng tóm tắt: chỉ những thứ cần để quyết định duyệt hay không
  const tomTat = r => (r.vaiTro === "giaovien"
    ? [r.coso]
    : [r.lopHoc, r.khoi, r.namThi && "thi " + r.namThi, r.coso, r.chuongTrinh]
  ).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join("");
  // Số điện thoại bấm được để gọi hoặc lưu danh bạ
  const soDt = (so, nhan) => { const s = String(so || "").replace(/\D/g, ""); return s
    ? `<a class="req-sdt" href="tel:${esc(s)}">${esc(so)}<small>${esc(nhan)}</small></a>` : ""; };
  $("#requests").innerHTML = requests.map(r => {
    const gv = r.vaiTro === "giaovien";
    return `<div class="req-item">
      <div class="req-head"><div class="req-ai"><b>${v(r.ten)}</b> <span class="chip ${gv ? "" : "ok"}">${gv ? "Giáo viên" : "Học viên"}</span>
        <span class="muted num">Gửi ${fmtDate(r.guiLuc)}</span></div>
        <div class="req-nut"><button class="btn small" data-no="${esc(r.id)}">Từ chối</button><button class="btn small primary" data-ok="${esc(r.id)}">✓ ${gv ? "Duyệt giáo viên" : "Duyệt học viên"}</button></div></div>
      <p class="req-tom">${tomTat(r) || `<span class="muted">Chưa điền thông tin lớp</span>`}</p>
      <div class="req-lh">${soDt(r.sdtPh, "bố mẹ")}${soDt(r.sdt, gv ? "điện thoại" : "của em")}
        <span class="req-mail">${v(r.gmail)}</span></div>
      ${r.ghiChu ? `<p class="req-nhan">“${esc(r.ghiChu)}”</p>` : ""}
      <details class="req-them"><summary>Xem đầy đủ</summary>
        <div class="req-body">
          ${line("Gmail", r.gmail)}${line("Năm sinh", r.namSinh)}${line("Cơ sở", r.coso)}${line("Lớp vẽ", r.chuongTrinh)}
          ${line(gv ? "Điện thoại" : "SĐT của em", r.sdt)}${line("SĐT bố mẹ", r.sdtPh)}
          ${line("Trường", [r.truong, r.lopHoc].filter(Boolean).join(" · "))}${line("Nhà ở", r.khuVuc)}
          ${line("Mục tiêu", [r.khoi, r.namThi, r.mucTieu].filter(Boolean).join(" · "))}${line("Lời nhắn", r.ghiChu)}
        </div></details>
      ${gv ? "" : `<div class="kc-wrap"><span class="muted">Cấp khoá học <small>· chọn trước khi bấm Duyệt, em sẽ thấy nút "Vào học" ở các khoá này</small></span>${oChonKhoa(r.id, khoaTuChuongTrinh(r.chuongTrinh))}</div>`}</div>`;
  }).join("");
  $$("#requests [data-ok]").forEach(b => b.onclick = async () => {
    const r = requests.find(x => x.id === b.dataset.ok); if (!r) return;
    const khoaHoc = khoaDaChon(r.id);
    requests = requests.filter(x => x.id !== r.id); renderRequests();
    const { id, vaiTro, ...data } = r;
    const batch = writeBatch(db);
    if (vaiTro === "giaovien") batch.set(doc(db, "giaovien", r.id), { ten: r.ten, gmail: r.gmail, sdt: r.sdt || "", coso: r.coso || "", ghiChu: r.ghiChu || "", duyetLuc: Date.now() });
    else batch.set(doc(db, "hocvien", r.id), { ...data, lop: r.chuongTrinh || r.lop || "", khoaHoc, duyetLuc: Date.now() });
    batch.delete(doc(db, "yeucau", r.id));
    toast(`Đã duyệt ${r.ten}. ${vaiTro === "giaovien" ? "Anh/chị" : "Em"} ấy mở lại web là vào được.`);
    timed("Duyệt " + r.ten, batch.commit()).catch(() => { requests.unshift(r); renderRequests(); toast("Chưa duyệt được " + r.ten + ". Kiểm tra mạng rồi bấm lại.", "err"); });
  });
  $$("#requests [data-no]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "yeucau", b.dataset.no)), "Bấm lần nữa để từ chối"));
}
/* ===== Thông tin học viên: khối, cơ sở, SĐT, trường thi; xin đổi tên (anh chị duyệt) ===== */
const TRUONG_THI = ["HAU", "MTCN", "HUCE", "SIS", "NUAE", "Khác"];
let doiTen = [], doiTenCuaToi = null, doiTenDaTai = "";
// Ngày thi theo TRƯỜNG THI DỰ KIẾN học viên đã chọn (lấy từ lịch thi LICH_THI).
// Trường chưa có lịch trên web (HUCE, SIS, NUAE, Khác) hoặc chưa chọn → null, dùng mốc chung theo khối.
function mocThiCuaToi() {
  const tt = myHv && !isTeacher && myHv.truongThi;
  if (!tt) return null;
  const kh = khoiOf(myHv);
  const ds = LICH_THI.map(e => ({ ...e, n: daysUntil(e.ngay) }))
    .filter(e => e.truong === tt && e.n >= 0).sort((a, b) => a.n - b.n);
  const hop = ds.find(e => kh && e.dot.includes(kh)) || ds[0];
  return hop || null;
}
// Chữ ở góc trang đầu: nếu học viên đã chọn trường có lịch thi thì hiện theo trường đó
function capNhatBadgeThi() {
  const el = $("#hero-badge"); if (!el) return;
  // Học viên đang đăng nhập: chờ hồ sơ thật từ máy chủ (có trường thi) rồi mới đổi, tránh nhảy số qua lại
  if (mail && !isTeacher && !hvTuMayChu) return;
  const m = mocThiCuaToi();
  if (m) { datBadgeThi(m, m.truong); return; }
  const sap = LICH_THI.map(e => ({ ...e, n: daysUntil(e.ngay) })).filter(e => e.n >= 0).sort((a, b) => a.n - b.n)[0];
  if (sap) datBadgeThi(sap, "đầu tiên");
}
// Nhớ mốc thi để lần sau đoạn script trong index.html hiện số ngày ngay, không chờ tải xong web
function datBadgeThi(e, ten) {
  const el = $("#hero-badge"); if (el) el.textContent = `Còn ${e.n} ngày đến kỳ thi ${ten}`;
  store.set("lvkv-moc-thi", { ngay: e.ngay, ten });
}
function renderHvInfo() {
  capNhatBadgeThi();
  const box = $("#hv-info"); if (!box) return;
  if (!user || !approved || isAdmin || isTeacher || !myHv) { box.hidden = true; return; }
  if (db && doc && doiTenDaTai !== mail) { doiTenDaTai = mail; doiTenCuaToi = null; getDoc(doc(db, "doiten", mail)).then(s => { doiTenCuaToi = s.exists() ? s.data() : null; renderHvInfo(); }).catch(() => {}); }
  const tt = myHv.truongThi || "", dang = doiTenCuaToi;
  box.hidden = false;
  box.innerHTML = `
    <dl class="hv-dl">
      <div><dt>Khối</dt><dd>${esc(khoiOf(myHv) || "Chưa xếp khối")}</dd></div>
      <div><dt>Cơ sở</dt><dd>${esc(myHv.coso || "—")}</dd></div>
      <div><dt>Lớp vẽ</dt><dd>${esc(myHv.chuongTrinh || myHv.lop || "—")}</dd></div>
    </dl>
    <form class="hv-form" id="f-hv-info" novalidate>
      <label>Số điện thoại của em<input id="hv-sdt" inputmode="tel" maxlength="15" autocomplete="tel" value="${esc(myHv.sdt || "")}" placeholder="VD: 0912345678"></label>
      <label>Khối học<select id="hv-khoi"><option value="">Chưa chọn</option>${["Khối H", "Khối V", "Cơ bản"].map(k => `<option${k === (myHv.khoi || "") ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Trường thi dự kiến<select id="hv-truong-thi"><option value="">Chưa chọn</option>${TRUONG_THI.map(t => `<option${t === tt ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
      <div><button class="btn primary" type="submit">Lưu thông tin</button> <span class="status" id="hv-info-st" role="status"></span></div>
    </form>
    ${donCuaToiHTML()}
    <div class="hv-doiten">${dang
      ? `<p class="muted">Đã gửi yêu cầu đổi tên thành <b>${esc(dang.tenMoi)}</b>. Đang chờ anh chị duyệt.</p>`
      : `<form id="f-doiten" novalidate><label>Xin đổi họ tên (anh chị duyệt trước khi đổi)<input id="doiten-moi" maxlength="80" autocomplete="name" placeholder="Họ và tên mới"></label>
         <div><button class="btn" type="submit">Gửi yêu cầu đổi tên</button> <span class="status" id="doiten-st" role="status"></span></div></form>`}
    </div>`;
  $$("#hv-info [data-dadong]").forEach(b => b.onclick = () => danhDauDaChuyen(b.dataset.dadong));
  $("#f-hv-info").onsubmit = e => {
    e.preventDefault();
    const sdt = cleanPhone($("#hv-sdt").value), truongThi = $("#hv-truong-thi").value, khoi = $("#hv-khoi").value, st = $("#hv-info-st");
    if (sdt && !/^\d{9,11}$/.test(sdt)) { st.textContent = "Số điện thoại chưa đúng (9–11 số)."; return; }
    st.textContent = "Đang lưu…";
    const capNhat = { sdt, truongThi };
    if (khoi) capNhat.khoi = khoi; // chỉ ghi khi học viên chọn khối; chưa chọn thì giữ khối cũ
    const b = writeBatch(db); b.update(doc(db, "hocvien", mail), capNhat);
    timed("Lưu thông tin học viên", b.commit()).then(() => { myHv = { ...myHv, ...capNhat }; st.textContent = "Đã lưu."; toast("Đã lưu thông tin của em."); renderHvInfo(); })
      .catch(e => { st.textContent = e && e.code === "permission-denied"
        ? "Máy chủ chưa cho lưu: nhờ anh chị quản lý dán luật bảo mật mới (firestore.rules) một lần."
        : "Chưa lưu được. Kiểm tra mạng rồi bấm lại."; });
  };
  const fd = $("#f-doiten");
  if (fd) fd.onsubmit = e => {
    e.preventDefault();
    const moi = $("#doiten-moi").value.trim().replace(/\s+/g, " "), st = $("#doiten-st");
    if (moi.length < 2) { st.textContent = "Nhập họ và tên mới."; return; }
    st.textContent = "Đang gửi…";
    timed("Gửi yêu cầu đổi tên", setDoc(doc(db, "doiten", mail), { tenMoi: moi, tenCu: myHv.ten || "", luc: Date.now() }))
      .then(() => { doiTenCuaToi = { tenMoi: moi }; toast("Đã gửi yêu cầu. Anh chị duyệt xong tên sẽ đổi."); renderHvInfo(); })
      .catch(e => { st.textContent = e && e.code === "permission-denied"
        ? "Máy chủ chưa cho gửi: nhờ anh chị quản lý dán luật bảo mật mới (firestore.rules) một lần."
        : "Chưa gửi được. Kiểm tra mạng rồi bấm lại."; });
  };
}
function renderDoiTen() {
  const box = $("#doiten-list"), chip = $("#doiten-count"); if (!box) return;
  chip.hidden = !doiTen.length; chip.textContent = doiTen.length;
  box.innerHTML = doiTen.length ? doiTen.map(x => `<div class="req-item">
      <div class="req-head"><b>${esc(x.tenMoi)}</b> <span class="muted">đổi từ: ${esc(x.tenCu || "")}</span> <span class="muted num">Gửi ${fmtDate(x.luc)}</span></div>
      <div class="req-body"><div><span class="muted">Gmail:</span> ${esc(x.id)}</div></div>
      <div class="ctas" style="margin-top:12px"><button class="btn primary" data-doiten-ok="${esc(x.id)}">Duyệt đổi tên</button>
        <button class="btn" data-doiten-no="${esc(x.id)}">Từ chối</button></div></div>`).join("")
    : `<p class="muted">Không có yêu cầu đổi tên nào.</p>`;
  $$("#doiten-list [data-doiten-ok]").forEach(b => b.onclick = () => {
    const x = doiTen.find(y => y.id === b.dataset.doitenOk); if (!x) return;
    doiTen = doiTen.filter(y => y.id !== x.id); renderDoiTen();
    const bt = writeBatch(db); bt.update(doc(db, "hocvien", x.id), { ten: x.tenMoi }); bt.delete(doc(db, "doiten", x.id));
    timed("Đổi tên " + x.tenMoi, bt.commit()).then(() => toast(`Đã đổi tên thành ${x.tenMoi}.`))
      .catch(() => { doiTen.unshift(x); renderDoiTen(); toast("Chưa đổi được tên. Kiểm tra mạng rồi bấm lại.", "err"); });
  });
  $$("#doiten-list [data-doiten-no]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "doiten", b.dataset.doitenNo)), "Bấm lần nữa để từ chối"));
}
function renderRoster() {
  if (!roster.length) { $("#roster").innerHTML = `<tbody><tr><td class="muted">Chưa có học viên nào được duyệt.</td></tr></tbody>`; return; }
  const total = lessons.length;
  $("#roster").innerHTML = `<thead><tr><th>Họ tên</th><th>Gmail</th><th>Chương trình</th><th>Cơ sở</th><th>Điện thoại</th><th>Đã học</th><th>Ngày duyệt</th><th></th></tr></thead><tbody>` +
    roster.map(r => {
      const p = progressAll[r.id]; const n = p && p.bai ? lessons.filter(l => p.bai[l.id]).length : 0;
      return `<tr><td>${esc(r.ten)}${r.namSinh ? `<br><span class="muted num">Sinh năm ${esc(r.namSinh)}</span>` : ""}</td><td>${esc(r.gmail)}</td><td>${esc(r.chuongTrinh || r.lop)}${oChonKhoa(r.id, khoaCuaHv(r))}</td><td>${esc(r.coso)}</td>
        <td class="num">${r.sdt ? "HV: " + esc(r.sdt) : ""}${r.sdtPh ? "<br>PH: " + esc(r.sdtPh) : ""}</td>
        <td class="num">${n}/${total}</td><td class="num">${fmtDate(r.duyetLuc)}</td>
        <td><button class="btn small" data-rm="${esc(r.id)}">Thu hồi</button>${teachers.some(t => t.id === r.id) ? `<span class="chip ok">Đang là GV</span>` : `<button class="btn small" data-lengv="${esc(r.id)}">Trao quyền GV</button>`}</td></tr>`;
    }).join("") + `</tbody>`;
  $$("#roster [data-rm]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "hocvien", b.dataset.rm)), "Bấm lần nữa để thu hồi"));
  // Trao quyền giáo viên cho học viên (vẫn giữ hồ sơ học viên; gỡ quyền thì trở lại học viên)
  $$("#roster [data-lengv]").forEach(b => confirmButton(b, () => { const r = roster.find(x => x.id === b.dataset.lengv) || {};
    return setDoc(doc(db, "giaovien", b.dataset.lengv), { ten: r.ten || "", gmail: r.gmail || b.dataset.lengv, sdt: r.sdt || "", coso: r.coso || "", ghiChu: "Trao từ học viên", duyetLuc: Date.now() }); }, "Bấm lần nữa để trao quyền"));
  $$("#roster .khoa-cap").forEach(box => box.onchange = () => {
    const id = box.dataset.kc, r = roster.find(x => x.id === id), khoaHoc = khoaDaChon(id);
    if (!khoaHoc.length) { toast("Cần chọn ít nhất một khoá.", "err"); renderRoster(); return; }
    timed("Cấp khoá " + id, setDoc(doc(db, "hocvien", id), { khoaHoc }, { merge: true }))
      .then(() => toast(`Đã cập nhật khoá học cho ${(r && r.ten) || id}.`))
      .catch(() => { toast("Chưa lưu được. Kiểm tra mạng rồi chọn lại.", "err"); renderRoster(); });
  });
}

function renderTeachers() {
  renderRoster(); // cập nhật nút Trao quyền GV / chữ "Đang là GV" trong bảng học viên
  if (!teachers.length) { $("#teachers").innerHTML = `<tbody><tr><td class="muted">Chưa có giáo viên nào. Quản lý luôn có toàn quyền.</td></tr></tbody>`; return; }
  $("#teachers").innerHTML = `<thead><tr><th>Họ tên</th><th>Gmail</th><th>Cơ sở</th><th>Điện thoại</th><th>Ngày duyệt</th><th></th></tr></thead><tbody>` +
    teachers.map(t => `<tr><td>${esc(t.ten)}</td><td>${esc(t.gmail)}</td><td>${esc(t.coso)}</td><td class="num">${esc(t.sdt)}</td>
      <td class="num">${fmtDate(t.duyetLuc)}</td><td><button class="btn small" data-rmgv="${esc(t.id)}">Gỡ quyền giáo viên</button></td></tr>`).join("") + `</tbody>`;
  $$("#teachers [data-rmgv]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "giaovien", b.dataset.rmgv)), "Bấm lần nữa để gỡ quyền"));
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
  if (!keys.length) loi.push(["info", "Chưa có buổi điểm danh nào. Anh chị sẽ điểm danh sau mỗi buổi học, tiến độ của em hiện ở đây."]);
  if (streak >= 2) loi.push(["bad", `Em đã vắng ${streak} buổi liên tiếp. Đi học lại ngay buổi tới để không bị hổng bài nhé.`]);
  if (keys.length && !records28) loi.push(["info", "Chưa có điểm danh trong 4 tuần gần đây. Nhờ anh chị kiểm tra lại trước khi đánh giá số buổi đi học."]);
  if (keys.length && daysLeft === 0) loi.push(["info", "Đã đến ngày thi mục tiêu. Nhờ anh chị cập nhật lịch học tiếp theo."]);
  else if (keys.length && need === 0) loi.push(["ok", "Em đã đủ số giờ học mục tiêu. Tiếp tục luyện bài theo hướng dẫn của anh chị."]);
  else if (records28) loi.push([perWeek + 0.01 < suggested ? "warn" : "ok", `4 tuần qua đã ghi nhận em đi ${co28} buổi. Lịch học đề xuất: ${suggested} buổi/tuần, dựa trên số giờ còn thiếu và mức tối thiểu của lớp. Trao đổi với anh chị để sắp xếp lịch phù hợp.`]);
  if (avg !== null && avg < MUC_TIEU.diemDat) loi.push(["warn", `Điểm bài tập gần đây trung bình ${nf1(avg)}, mục tiêu ${nf1(MUC_TIEU.diemDat)}. Làm đủ bài về nhà và hỏi anh chị chỗ chưa vững.`]);
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
  const intro = `Lớp Vẽ Thạch Thất gửi phụ huynh em ${r.ten}: `;
  if (!t.records28) return intro + `Lớp chưa có dữ liệu điểm danh của em trong 4 tuần qua (${ngayVN(start)}–${ngayVN(todayVN())}), nên chưa kết luận được số buổi em đi học. Lớp sẽ kiểm tra lại và trao đổi với bố mẹ ạ.`;
  return intro + `Trong 4 tuần qua (${ngayVN(start)}–${ngayVN(todayVN())}), lớp ghi nhận em đi học ${t.co28} buổi.`
    + (t.trackedDays < 28 ? ` Dữ liệu mới được theo dõi trong ${t.trackedDays} ngày gần đây.` : "")
    + (t.streak >= 2 ? ` Em đã vắng ${t.streak} buổi liên tiếp không tính các buổi nghỉ phép.` : "")
    + (t.daysLeft > 0 ? ` Còn ${t.daysLeft} ngày đến ngày thi mục tiêu (${ngayVN(t.ngayThi)}).` : " Đã đến ngày thi mục tiêu; anh chị sẽ cập nhật lịch học tiếp theo.")
    + (t.suggested !== null ? ` Lớp đề xuất em học ${t.suggested} buổi/tuần để bổ sung số giờ còn thiếu và duy trì việc luyện tập.`
      : t.need === 0 ? " Em đã đủ số giờ học mục tiêu và tiếp tục luyện bài theo hướng dẫn của anh chị." : "")
    + (t.avg !== null ? ` Điểm bài tập gần đây trung bình ${nf1(t.avg)}/10.` : "")
    + " Bố mẹ cùng lớp trao đổi để sắp xếp lịch học phù hợp cho em nhé. Cảm ơn bố mẹ!";
}
function renderMyProg() {
  capNhatHocTapTroLy();
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
  box.innerHTML = theRank(tinhRank(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName))) + theThanhTuu(tinhThanhTuu(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName), homework)) + `
    <div class="mp-head">
      <div><p class="eyebrow">Tiến độ của em · ${esc(t.khoi)}</p>
        <h3>Còn <b class="num">${mocThiCuaToi()?.n ?? t.daysLeft}</b> ngày đến kỳ thi <span class="muted">(${ngayVN(mocThiCuaToi()?.ngay ?? t.ngayThi)}${mocThiCuaToi() ? " · " + esc(mocThiCuaToi().truong) : ""})</span></h3></div>
      <div class="mp-gauge ${t.muc}" style="--p:${t.pass ?? 0}"><b class="num">${t.pass === null ? "–" : t.pass + "%"}</b><span>khả năng đỗ<br>ước tính</span></div>
    </div>
    <div class="mp-stats">
      <div><span>Giờ đã học <small>(tính theo buổi đã điểm danh)</small></span><b class="num">${t.gio}<small>/${t.gioCan} giờ</small></b><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div><span>Đã đi học trong 4 tuần</span><b class="num">${t.records28 ? t.co28 + " buổi" : "–"}</b><div class="mp-study-plan">${t.records28 ? esc(lichHocDeXuat(t)) : "Chưa có điểm danh trong 4 tuần"}</div></div>
      <div><span>Chuyên cần 30 ngày</span><b class="num">${t.att === null ? "–" : Math.round(t.att * 100) + "%"}</b></div>
      <div><span>Điểm bài tập TB</span><b class="num">${t.avg === null ? "–" : nf1(t.avg)}<small> · mục tiêu ${nf1(MUC_TIEU.diemDat)}</small></b></div>
    </div>
    <ul class="mp-advice">${t.loi.map(([k, x]) => `<li class="${k}">${esc(x)}</li>`).join("")}</ul>
    <div class="mp-dots" aria-label="Điểm danh 8 tuần gần nhất">${dots}</div>
    <p class="mp-note">Chấm xanh: có mặt · đỏ: vắng · xám: nghỉ phép. Khả năng đỗ là ước tính từ chuyên cần, giờ học và điểm bài tập, tự cập nhật sau mỗi buổi — không phải cam kết.</p>`;
}
function renderAttend() {
  try { renderQL(); } catch (e) { console.warn(e); }
  if (!isTeacher || !$("#dd-list")) return;
  const ngay = $("#dd-ngay").value || todayVN(), ca = $("#dd-ca").value || caMacDinh(), cs = $("#dd-cs").value;
  const key = `${ngay}_${ca}`;
  const search = $("#dd-search").value;
  const rows = hocVienDiemDanh(cs, search, $("#dd-sort").value);
  const ds = rows.map(x => x.r);
  const val = r => (diemdanhAll[r.id] || {})[key];
  const n = v => ds.filter(r => val(r) === v).length;
  // Tổng kết ca đang chọn: chia ô rõ ràng thay vì một dòng chữ dài
  $("#dd-sum").innerHTML = `<span class="dds-t">Đang hiển thị <b>${ds.length}</b>/${roster.length} học viên</span>` + (ds.length ? `<span class="dds co"><b class="num">${n("co")}</b>Có mặt</span><span class="dds vang"><b class="num">${n("vang")}</b>Vắng</span><span class="dds phep"><b class="num">${n("phep")}</b>Phép</span><span class="dds chua"><b class="num">${ds.length - n("co") - n("vang") - n("phep")}</b>Chưa điểm danh</span>` : "");
  const empty = roster.length ? "Không tìm thấy học viên phù hợp. Thử đổi tên tìm kiếm hoặc cơ sở." : "Chưa có học viên nào được duyệt.";
  $("#dd-list").innerHTML = rows.length ? rows.map(({ r, t }) => `<li><div><b>${esc(r.ten)}</b> ${(t2 => huyHieu(t2.r, t2.i, "xs", r.ten))(tinhRank(diemdanhAll[r.id], progressAll[r.id], feedbackAll[r.id], r.ten))}<span class="muted">${esc(r.chuongTrinh || r.lop || "")}${r.coso ? " · " + esc(r.coso) : ""}</span><span class="dd-history">${t.records28 ? `Đã đi ${t.co28} buổi trong 4 tuần` : "Chưa có điểm danh trong 4 tuần"}</span></div>
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
  try { capNhatNhac(); } catch (e) {}
  const tin = lvUnreadMsgs(), tb = lvUnreadTB(), viec = lvMyOpenTasks();
  const set = (id, n) => { const el = $(id); if (el) { el.textContent = n > 99 ? "99+" : n; el.hidden = !n; } };
  set("#lv-n-tin", tin); set("#lv-n-tb", tb); set("#lv-n-viec", viec);
  set("#acc-lv-n", tin + tb + viec); set("#acc-duyet-n", isAdmin ? reqCount : 0);
  set("#nav-req", tin + tb + viec + (isAdmin ? reqCount : 0));
  renderTiles();
}
/* ================= Tổng quan: việc hôm nay + menu dưới đáy (điện thoại) ================= */
// Buổi học gần nhất theo thời gian biểu của cơ sở em học (Online/chưa rõ thì xét mọi cơ sở)
function buoiToi(coso) {
  const ks = CO_SO.filter(k => !coso || k.includes(coso)), dsK = ks.length ? ks : CO_SO;
  const now = new Date(), vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000), phut = vn.getHours() * 60 + vn.getMinutes();
  const het = ca => { const m = String(ca.gio).split(/[–-]/).pop().match(/(\d+)h(\d*)/); return m ? +m[1] * 60 + +(m[2] || 0) : 1440; };
  const i = DAYS.indexOf(todayKey());
  for (let n = 0; n < 8; n++) {
    const d = DAYS[(i + n) % 7];
    for (const ca of CA_HOC) {
      if (n === 0 && het(ca) <= phut) continue;
      for (const k of dsK) { const mon = ((THOI_GIAN_BIEU[k] || {})[ca.ma] || {})[d]; if (mon) return { n, d, ca, mon, cs: k.replace("Cơ sở ", "") }; }
    }
  }
  return null;
}
const icoTab = {
  tq: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bt: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  gt: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  dd: '<path d="M4 12l5 5L20 6"/>',
  td: '<path d="M4 5h16v11H8l-4 4z"/>',
};
function renderDash(show) {
  const box = $("#dash"), tab = $("#tab-duoi"); if (!box || !tab) return;
  const vao = !!user && show;
  const doi = tab.hidden === vao;
  box.hidden = !vao; tab.hidden = !vao; document.body.classList.toggle("co-tab", vao);
  if (doi) requestAnimationFrame(() => dispatchEvent(new Event("resize"))); // nút Chì tự né menu dưới
  if (!vao) { box.innerHTML = ""; tab.innerHTML = ""; return; }
  const today = todayVN(), tin = lvUnreadMsgs() + lvUnreadTB();
  const nut = (href, ico, ten, so) => `<a href="${href}"><svg viewBox="0 0 24 24" aria-hidden="true">${icoTab[ico]}</svg><span>${ten}</span>${so ? `<b class="tab-so num">${so > 99 ? "99+" : so}</b>` : ""}</a>`;
  if (isTeacher) {
    // ---- Anh chị: việc cần xử lý hôm nay (số liệu thật từ bài nộp, nhận xét, việc được giao)
    const hv = roster.filter(r => r.vaiTro !== "giaovien");
    let canCham = 0; const chuaNop = new Set();
    homework.forEach(h => {
      const n = h.han ? daysUntil(h.han) : null;
      hv.forEach(r => { const nop = progressAll[r.id]?.baitap?.[h.id], fb = feedbackAll[r.id]?.[h.id];
        if ((nop && !fb) || daNopLai(fb, nop)) canCham++;
        if (!nop && n !== null && n >= -7 && n <= 2) chuaNop.add(r.id); });
    });
    const viec = isAdmin ? lvCV.filter(c => !c.xong).length : lvMyOpenTasks();
    const o = (href, cls, so, chu) => `<a class="dash-so ${cls}" href="${href}"><b class="num">${so}</b><span>${chu}</span></a>`;
    box.innerHTML = `<div class="dash-dau"><div><p class="eyebrow">${isAdmin ? "Quản lý lớp" : "Giáo viên"} · ${esc(TEN_NGAY[todayKey()])}</p><h1>Việc cần xử lý hôm nay</h1></div>
      <div class="dash-nut"><button class="btn primary small" type="button" id="dash-giao">+ Giao bài</button>${isAdmin ? `<button class="btn small" type="button" id="dash-viec">+ Giao việc</button>` : ""}</div></div>
      <div class="dash-sos">${o("#bai-tap", "vang", canCham, "bài cần chấm")}${o("#bai-tap", "do", chuaNop.size, "bạn chưa nộp (hạn gần)")}${o("#lam-viec", "xanh", viec, isAdmin ? "việc chưa xong" : "việc được giao")}${isAdmin ? o("#duyet", "tim", reqCount, "người chờ duyệt") : ""}</div>`;
    $("#dash-giao").onclick = () => { location.hash = "#bai-tap"; requestAnimationFrame(() => { const c = $("#hw-composer"); if (c) { c.open = true; c.scrollIntoView({ block: "start", behavior: "smooth" }); setTimeout(() => $("#bt-ten")?.focus(), 300); } }); };
    if ($("#dash-viec")) $("#dash-viec").onclick = () => { location.hash = "#lam-viec"; requestAnimationFrame(() => $('#lv-tabs [data-lv="viec"]')?.click()); };
    tab.innerHTML = nut("#tai-khoan", "tq", "Tổng quan") + nut("#bai-tap", "bt", "Bài tập", canCham) + nut("#diem-danh", "dd", "Điểm danh") + nut("#lam-viec", "td", "Trao đổi", tin + viec);
  } else {
    // ---- Học viên: hôm nay em cần làm gì
    const ten = (myHv && myHv.ten) || (user && user.displayName) || "";
    const can = homework.filter(h => (!h.han || h.han >= today) && (!myProgress.baitap[h.id] || canLamLai(myFeedback[h.id], myProgress.baitap[h.id])))
      .sort((a, b) => String(a.han || "9999").localeCompare(String(b.han || "9999")));
    const bai = can.slice(0, 3).map(h => { const n = h.han ? daysUntil(h.han) : null, [, m, d] = String(h.han || "").split("-"), ll = canLamLai(myFeedback[h.id], myProgress.baitap[h.id]);
      return `<li><div><b>${esc(h.ten)}</b><span class="dash-meta"><i class="chip">${esc(goc(h.khoa) || "Bài tập")}</i>${h.han ? `<span class="num">Hạn ${+d}/${+m}</span>` : ""}${ll ? `<i class="chip dash-ll">Cần làm lại</i>` : n !== null && n <= 2 ? `<i class="chip dash-gap">${n === 0 ? "Hạn hôm nay" : `Còn ${n} ngày`}</i>` : ""}</span></div>
        <button class="btn small ${n !== null && n <= 2 || ll ? "primary" : ""}" type="button" data-dbt="${esc(h.id)}">${ll ? "Nộp lại" : "Nộp bài"}</button></li>`; }).join("");
    // Nhận xét mới nhất
    const nx = Object.entries(myFeedback || {}).filter(([, f]) => f && f.nhanXet).sort((a, b) => (b[1].luc || 0) - (a[1].luc || 0))[0];
    const nxBai = nx && homework.find(h => h.id === nx[0]);
    // Giáo trình: tiến độ các khoá được cấp + bài tiếp theo
    const cap = khoaDuocCap(), ds = lessons.filter(l => cap.includes(goc(l.khoa)) && !laLoTrinh(l));
    const mon = [...new Set(ds.map(l => l.khoa))].map(k => { const b = ds.filter(l => l.khoa === k); return { k, ten: goc(k), tong: b.length, xong: b.filter(l => myProgress.bai[l.id]).length, tiep: b.find(l => !myProgress.bai[l.id]) }; });
    const tong = ds.length, xong = ds.filter(l => myProgress.bai[l.id]).length, pt = tong ? Math.round(xong / tong * 100) : 0;
    const dang = mon.find(m => m.tiep), tiep = dang && dang.tiep;
    const tuan = Object.values(myProgress.bai || {}).filter(v => v > 1e12 && v > Date.now() - 7 * 864e5).length;
    const b = buoiToi(myHv && myHv.coso);
    box.innerHTML = `<div class="dash-dau"><div><p class="eyebrow">Chào mừng trở lại</p><h1>${esc(ten ? ten.split(/\s+/).slice(-2).join(" ") : "em")}!</h1><p class="muted">Hôm nay em cần làm gì? Bài cần nộp, lịch học và nhận xét mới ở ngay dưới đây.</p></div></div>
      <div class="dash-luoi">
        <section class="dash-o dash-td"><h2>Tiến độ học tập</h2>
          <div class="dash-vong" style="--pt:${pt}" role="img" aria-label="Đã hoàn thành ${pt}% giáo trình"><b class="num">${pt}%</b></div>
          <p>Đã hoàn thành <b class="num">${xong}/${tong}</b> bài${tuan ? ` · tuần này <b class="num">${tuan}</b>` : ""}</p>
          ${tiep ? `<button class="btn primary small" type="button" data-dtiep="${esc(tiep.id)}">Tiếp tục học →</button>` : tong ? `<p class="muted">🎉 Em đã học xong các khoá được cấp.</p>` : ""}</section>
        <section class="dash-o dash-bai"><h2>Bài cần hoàn thành <span class="muted num">${can.length} bài</span></h2>
          ${bai ? `<ul class="dash-ds">${bai}</ul>` : `<p class="muted dash-trong">Em không còn bài nào cần nộp. 🎉</p>`}
          ${can.length > 3 ? `<a class="dash-them" href="#bai-tap">Xem tất cả ${can.length} bài →</a>` : ""}</section>
        <section class="dash-o dash-buoi"><h2>Buổi học tiếp theo</h2>
          ${b ? `<p class="dash-mon"><span class="slot ${SLOT[b.mon] || "mt2"}">${esc(b.mon)}</span></p>
            <ul class="dash-tt"><li>📅 ${b.n === 0 ? "Hôm nay" : b.n === 1 ? "Ngày mai" : esc(TEN_NGAY[b.d])}</li><li>📍 ${esc(b.cs)}</li><li class="num">🕒 ${esc(b.ca.gio)}</li></ul>
            ${DO_MANG[b.mon] ? `<p class="muted dash-mang">Mang theo: ${esc(DO_MANG[b.mon])}</p>` : ""}` : `<p class="muted">Chưa có lịch học.</p>`}
          <a class="dash-them" href="#lich-hoc">Xem lịch tuần →</a></section>
        <section class="dash-o dash-nx"><h2>Nhận xét mới</h2>
          ${nx ? `<p class="dash-nx-bai">${esc(nxBai ? nxBai.ten : "Bài tập")}${nx[1].diem ? ` · <b class="num">${esc(nx[1].diem)} điểm</b>` : ""}</p><blockquote>${esc(String(nx[1].nhanXet).slice(0, 160))}</blockquote>
            <a class="dash-them" href="#bai-tap" data-dcham>Xem bài đã chữa →</a>` : `<p class="muted">Chưa có nhận xét. Nộp bài để anh chị chữa cho em nhé.</p>`}</section>
        ${mon.length ? `<section class="dash-o dash-lt"><h2>Lộ trình của em</h2><div class="dash-mons">${mon.map(m => `<button type="button" class="dash-monb${m === dang ? " on" : ""}" data-dmon="${esc(m.ten)}"><b>${esc(m.ten)}</b><small class="num">${m.xong}/${m.tong}</small></button>`).join("")}</div></section>` : ""}
      </div>
      <div class="dash-nhanh" role="navigation" aria-label="Truy cập nhanh">${[["#giao-trinh", "📚", "Giáo trình"], ["#bai-tap", "📝", "Bài tập"], ["#lich-hoc", "📅", "Lịch học"], ["#thi-thu", "⏱️", "Thi thử"], ["#bai-ve", "🖼️", "Bài vẽ"], ["#xep-hang", "🏆", "Xếp hạng"]].map(([h, i, t]) => `<a href="${h}"><i aria-hidden="true">${i}</i>${t}</a>`).join("")}</div>`;
    $$("#dash [data-dbt]").forEach(x => x.onclick = () => { location.hash = "#bai-tap"; requestAnimationFrame(() => setTimeout(() => { const c = $(`#hw-list [data-nhac-id="bt-${CSS.escape(x.dataset.dbt)}"]`); if (c) { c.scrollIntoView({ block: "center", behavior: "smooth" }); c.classList.add("dash-sang"); setTimeout(() => c.classList.remove("dash-sang"), 2200); } }, 80)); });
    $$("#dash [data-dtiep]").forEach(x => x.onclick = () => { const l = lessons.find(y => y.id === x.dataset.dtiep); if (!l) return; khoaMuon = goc(l.khoa); lessonId = null; location.hash = "#giao-trinh"; requestAnimationFrame(() => { renderLessons(); moBai(l.id); }); });
    $$("#dash [data-dmon]").forEach(x => x.onclick = () => { khoaMuon = x.dataset.dmon; if (lessonId) dongBai(true); lessonId = null; gtLoc = "tat"; location.hash = "#giao-trinh"; requestAnimationFrame(() => { renderLessons(); $("#gt-wrap")?.scrollIntoView({ block: "start" }); }); });
    $$("#dash [data-dcham]").forEach(x => x.onclick = () => requestAnimationFrame(() => $('#hw-filter [data-h="cham"]')?.click()));
    tab.innerHTML = nut("#tai-khoan", "tq", "Tổng quan") + nut("#bai-tap", "bt", "Bài tập", can.length) + nut("#giao-trinh", "gt", "Giáo trình") + nut("#lam-viec", "td", "Trao đổi", tin);
  }
  const h = location.hash.slice(1); $$("#tab-duoi a").forEach(x => { if (x.getAttribute("href") === "#" + h) x.setAttribute("aria-current", "page"); });
}
function renderTiles() {
  const box = $("#acc-tiles"); if (!box) return;
  const show = canLearnNow();
  box.hidden = !show; { const xh = $("#xep-hang"); if (xh) xh.hidden = !show; }
  { const na = $("#nav-acct"), hv = !!user && show; let k = $("#nav-ka");
    if (hv) { const ten = (!isTeacher && myHv && myHv.ten) || (user && user.displayName) || (mail || "").split("@")[0];
      // học viên: khung theo hạng · anh chị: khung riêng (Quản lý vàng, Giáo viên xanh)
      const t = isTeacher ? (isAdmin ? { r: { ma: "QL", mau: "#ffc400", kim: "Quản lý", ten: "Quản lý lớp" }, i: 5 } : { r: { ma: "GV", mau: "#57a6ff", kim: "Giáo viên", ten: "Giáo viên" }, i: 3 })
        : tinhRank(myDiemdanh, myProgress, myFeedback, ten);
      if (!k) { k = document.createElement("span"); k.id = "nav-ka"; na.prepend(k); }
      k.innerHTML = khungAvatar(t.r, t.i, ten, myAvatar, "nav"); na.classList.add("has-ka"); na.title = isTeacher ? `Tài khoản · ${t.r.ten}` : `Tài khoản · Hạng ${t.r.ma} · ${t.r.ten}`;
    } else if (k) { k.remove(); na.classList.remove("has-ka"); na.removeAttribute("title"); } }
  // Ảnh đại diện trên thẻ tài khoản: bấm vào để đổi (mỗi tài khoản một ảnh riêng)
  { const wa = $("#who-ava"); if (wa) { wa.hidden = !user || needVerify;
    if (!wa.hidden) { const ten = (!isTeacher && myHv && myHv.ten) || (user && user.displayName) || (mail || "").split("@")[0];
      const t = isTeacher ? (isAdmin ? { r: { ma: "QL", mau: "#ffc400", kim: "Quản lý", ten: "Quản lý lớp" }, i: 5 } : { r: { ma: "GV", mau: "#57a6ff", kim: "Giáo viên", ten: "Giáo viên" }, i: 3 })
        : approved ? tinhRank(myDiemdanh, myProgress, myFeedback, ten) : { r: RANK[0], i: 0 };
      wa.innerHTML = khungAvatar(t.r, t.i, ten, myAvatar, "lg") + `<span class="ava-sua" aria-hidden="true">✎</span>`; } } }
  { const wr = $("#who-rank"); if (wr) { const hv = show && !isTeacher; wr.hidden = !hv;
    if (hv) { const av = $("#who-avatar"); if (av) av.hidden = true; const ten = (myHv && myHv.ten) || (user && user.displayName), t = tinhRank(myDiemdanh, myProgress, myFeedback, ten), tt = tinhThanhTuu(myDiemdanh, myProgress, myFeedback, ten, homework);
      wr.innerHTML = `${huyHieu(t.r, t.i, "xs", ten)}<span class="muted"><b class="num">${t.xp} XP</b> · ${tt.filter(a => a.cap).length}/${tt.length} thành tựu</span><a href="#xep-hang">Xem hạng & thành tựu ↓</a>`; } } }
  capNhatVaiTro();
  { const av = $("#av-doi"); if (av) av.hidden = !user; }
  baoTroLy(show); try { renderXHQL(); renderKho(); } catch (e) {}
  renderDash(show);
  if (!show) { box.innerHTML = ""; return; }
  const today = todayVN();
  const tin = lvUnreadMsgs(), tb = lvUnreadTB(), viec = lvMyOpenTasks();
  const daHoc = Object.values(myProgress.bai || {}).filter(Boolean).length;
  const moBai = homework.filter(h => !h.han || h.han >= today).length;
  const tiles = [
    { href: "#lam-viec", t: "Trao đổi", n: tin + tb + viec, d: tin + tb + viec ? [tin && `${tin} tin nhắn mới`, tb && `${tb} thông báo mới`, viec && `${viec} việc chưa xong`].filter(Boolean).join(" · ") : (isTeacher ? "Nhắn tin, thông báo, giao việc" : "Nhắn anh chị, xem thông báo của lớp") },
    isAdmin && { href: "#duyet", t: "Quản lý học viên", n: reqCount, d: `${roster.length} học viên · % đỗ · Top 5 tuần` + (reqCount ? ` · ${reqCount} chờ duyệt` : "") },
    isTeacher && { href: "#diem-danh", t: "Điểm danh", d: "Điểm danh buổi hôm nay" },
    { href: "#bai-tap", t: isTeacher ? "Giao & chấm bài tập" : "Bài tập", d: moBai ? `${moBai} bài đang mở` : "Chưa có bài đang mở" },
    { href: "#giao-trinh", t: isTeacher ? "Xem giáo trình" : "Giáo trình", d: isTeacher ? `${lessons.length} bài trong giáo trình` : `Đã học ${daHoc}/${lessons.length} bài` },
    isTeacher && { href: "#bai-ve", t: "Đăng bài vẽ học viên", d: "Chụp bài, chọn loại bài, đăng lên web" },
    isTeacher && { href: "#ban-tin", t: "Đăng bản tin", d: "Tin nổi bật tuần, hoạ cụ, lý thuyết" },
  ].filter(Boolean);
  box.innerHTML = (!isTeacher ? theRank(tinhRank(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName))) + theThanhTuu(tinhThanhTuu(myDiemdanh, myProgress, myFeedback, (myHv && myHv.ten) || (user && user.displayName), homework)) : "") + tiles.map(x => `<a class="acc-tile" href="${x.href}"><b>${x.t}${x.n ? ` <span class="nbadge num">${x.n}</span>` : ""}</b><span class="muted">${esc(x.d)}</span><i aria-hidden="true">→</i></a>`).join("");
}

/* ================= Đổi ảnh đại diện (tự cắt vuông, thu nhỏ còn ~20 KB) ================= */
function luuAvatar(url) {
  if (!user || !mail) return;
  myAvatar = url || "";
  try { url ? localStorage.setItem(AVA_KEY(mail), url) : localStorage.removeItem(AVA_KEY(mail)); } catch (e) {}
  renderTiles(); renderMyProg && renderMyProg();
  const st = $("#av-st");
  if (!db) { if (st) st.textContent = "Đã đổi trên máy này ✓"; return; }
  const viec = [setDoc(doc(db, "anhdaidien", mail), { anh: myAvatar, luc: Date.now() })];
  if (!isTeacher && approved) viec.push(luuTienDo({ anh: myAvatar || "" }));
  timed("Lưu ảnh đại diện", Promise.all(viec))
    .then(() => { if (st) st.textContent = url ? "Đã lưu ảnh mới ✓" : "Đã bỏ ảnh ✓"; setTimeout(() => { if (st) st.textContent = ""; }, 3000); })
    .catch(() => { if (st) st.textContent = "Đã đổi trên máy này. Chưa lưu lên lớp được, thử lại sau."; });
}
{ const f = $("#av-file");
  if (f) f.addEventListener("change", () => {
    const file = f.files && f.files[0]; f.value = ""; if (!file) return;
    if (!/^image\//.test(file.type)) { $("#av-st").textContent = "Chọn một tấm ảnh nhé."; return; }
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const n = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement("canvas"); cv.width = cv.height = 192;
      cv.getContext("2d").drawImage(img, (img.naturalWidth - n) / 2, (img.naturalHeight - n) / 2, n, n, 0, 0, 192, 192);
      URL.revokeObjectURL(u); luuAvatar(cv.toDataURL("image/jpeg", .85));
    };
    img.onerror = () => { URL.revokeObjectURL(u); $("#av-st").textContent = "Không mở được ảnh này, thử ảnh khác."; };
    img.src = u;
  });
  const x = $("#av-xoa"); if (x) x.onclick = () => luuAvatar("");
  const w = $("#who-ava"); if (w) w.onclick = () => f && f.click();
}

/* ================= Anh chị cộng XP / trao thành tựu ngay trên web ================= */
let xhDS = [], xhLoi = false;
function renderXHQL() {
  const box = $("#xh-ql"); if (!box) return;
  box.hidden = !(user && isAdmin); // chỉ quản lý cộng XP / trao thành tựu
  if (box.hidden) return;
  const ten = [...new Set([...roster.map(r => r.ten), ...nbAll().filter(b => !b.tg && b.hocVien).map(b => b.hocVien)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const dangGo = document.activeElement && box.contains(document.activeElement);
  if (dangGo && box.dataset.ve) { veDSXH(); return; }
  box.dataset.ve = 1;
  box.innerHTML = `<h3>⭐ Cộng XP · trao thành tựu</h3>
    <p class="muted">Dùng khi học viên có bài xuất sắc, chăm chỉ, đạt thủ khoa thi thử… Hạng và thành tựu cập nhật ngay cho cả lớp thấy.</p>
    ${xhLoi ? `<p class="xh-loi">Máy chủ chưa cho lưu mục này. Quản lý cần dán luật bảo mật mới (firestore.rules) một lần.</p>` : ""}
    <form id="f-xh" class="xh-f">
      <label>Học viên<input id="xh-ten" list="xh-ds-ten" required maxlength="80" placeholder="Gõ tên học viên"></label>
      <datalist id="xh-ds-ten">${ten.map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <div class="seg xh-loai" role="group" aria-label="Loại"><button type="button" data-l="xp" aria-pressed="true">+ XP</button><button type="button" data-l="thanhtuu" aria-pressed="false">🏆 Thành tựu</button></div>
      <label class="xh-xp">Số XP<select id="xh-xp">${[20, 50, 100, 200, 500].map(n => `<option value="${n}">+${n} XP</option>`).join("")}</select></label>
      <label class="xh-tt" hidden>Thành tựu<select id="xh-tt">${THANH_TUU.map(a => `<option value="${a.ma}">${esc(a.ten)}${a.trao ? " (anh chị trao)" : ""}</option>`).join("")}</select></label>
      <label class="xh-gc">Lý do<input id="xh-gc" maxlength="120" required placeholder="VD: Bài màu tuần 3 xuất sắc"></label>
      <button class="btn primary" type="submit">Lưu</button><span class="status" id="xh-st"></span>
    </form>
    <div id="xh-ds"></div>`;
  let loai = "xp";
  box.querySelectorAll(".xh-loai button").forEach(b => b.onclick = () => {
    loai = b.dataset.l; box.querySelectorAll(".xh-loai button").forEach(x => x.setAttribute("aria-pressed", x === b));
    box.querySelector(".xh-xp").hidden = loai !== "xp"; box.querySelector(".xh-tt").hidden = loai !== "thanhtuu";
  });
  $("#f-xh").onsubmit = async e => {
    e.preventDefault();
    const d = { hocVien: $("#xh-ten").value.trim(), loai, ghiChu: $("#xh-gc").value.trim(), luc: Date.now(), nguoi: tenToi() };
    if (loai === "xp") d.xp = Number($("#xh-xp").value); else d.ma = $("#xh-tt").value;
    if (!d.hocVien) return;
    $("#xh-st").textContent = "Đang lưu…";
    try { await timed("Lưu XP", addDoc(collection(db, "xephang"), d)); $("#xh-st").textContent = "Đã lưu ✓"; $("#xh-gc").value = ""; toast(loai === "xp" ? `Đã cộng ${d.xp} XP cho ${d.hocVien}` : `Đã trao thành tựu cho ${d.hocVien}`); }
    catch (err) { $("#xh-st").textContent = err && err.code === "permission-denied" ? "Chưa lưu được: cần dán luật bảo mật mới." : "Chưa lưu được, kiểm tra mạng."; }
  };
  veDSXH();
}
function veDSXH() {
  const el = $("#xh-ds"); if (!el) return;
  el.innerHTML = xhDS.length ? `<h4>Đã trao gần đây</h4><ul class="xh-ds">${xhDS.slice(0, 20).map(x => `<li><b>${esc(x.hocVien)}</b>
    <span>${x.loai === "xp" ? `+${Number(x.xp) || 0} XP` : "🏆 " + esc((THANH_TUU.find(a => a.ma === x.ma) || {}).ten || x.ma)}</span>
    <small>${esc(x.ghiChu || "")} · ${esc(x.nguoi || "")} · ${fmtDate(x.luc)}</small>${isAdmin ? `<button type="button" class="linkish" data-xxh="${esc(x.id)}">Xoá</button>` : ""}</li>`).join("")}</ul>` : "";
  el.querySelectorAll("[data-xxh]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "xephang", b.dataset.xxh))));
}

/* ================= KHO HOẠ CỤ (chỉ quản lý): nhập · bán · tồn · lãi lỗ tháng ================= */
let khoMon = {}, khoGD = [], khoLoi = "", khoTab = "ton", khoThang = "", khoDaTai = false;
const vnd = n => Math.round(Number(n) || 0).toLocaleString("vi-VN") + "đ";
const thangCua = iso => String(iso || "").slice(0, 7);
function khoStart() {
  unsubs.push(onSnapshot(collection(db, "kho"), snap => { khoMon = {}; snap.docs.forEach(d => khoMon[d.id] = { ma: d.id, ...d.data() }); khoDaTai = true; renderKho(); },
    e => { khoLoi = (e && e.code) || "loi"; renderKho(); }));
  unsubs.push(onSnapshot(collection(db, "khogd"), snap => { khoGD = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.luc || 0) - (a.luc || 0)); renderKho(); baoCaoThang(); },
    e => { khoLoi = (e && e.code) || "loi"; renderKho(); }));
}
const monKho = () => Object.values(khoMon).filter(m => m.ma !== "_caidat").sort((a, b) => String(a.loai).localeCompare(String(b.loai), "vi") || String(a.ten).localeCompare(String(b.ten), "vi"));
function khoSapHet() { return monKho().filter(m => (Number(m.ton) || 0) <= 3 && (m.daBan || 0) > 0).map(m => m.ten); }
/* ===== Đơn hoạ cụ: quản lý tạo đơn → học viên chuyển khoản rồi báo → quản lý xác nhận đã nhận tiền thì kho tự trừ ===== */
let donAll = [], donCuaToi = [], donNhap = [], donTam = {};
const TRANG_DON = { cho: "Chờ chuyển khoản", da_bao: "Đã báo chuyển khoản", da_thu: "Đã nhận tiền" };
const tongDon = items => items.reduce((a, it) => a + (Number(it.sl) || 0) * (Number(it.gia) || 0), 0);
const tenMon = items => (items || []).map(it => esc(it.ten) + " × " + it.sl).join(", ");
function donHTML() {
  const cho = donAll.filter(d => d.trangThai !== "da_thu");
  const thu = donAll.filter(d => d.trangThai === "da_thu").slice(0, 10);
  const dongMon = donNhap.length ? donNhap.map((it, i) => `<li><b>${esc(it.ten)} × ${it.sl}</b><span>${vnd(it.sl * it.gia)}</span><button type="button" class="linkish" data-dnb="${i}">Bỏ</button></li>`).join("") : `<li class="muted">Chưa chọn món nào.</li>`;
  const hocVien = roster.map(h => `<option value="${esc(h.id)}">${esc(h.ten || "")}</option>`).join("");
  return `
    <form id="f-don" class="kho-f" novalidate>
      <h4 class="kho-h4">Tạo đơn cho học viên</h4>
      <label>Gmail học viên<input id="don-mail" maxlength="100" list="don-ds" autocapitalize="off" spellcheck="false" value="${esc(donTam.mail || "")}" placeholder="Gmail của học viên"></label>
      <datalist id="don-ds">${hocVien}</datalist>
      <label>Tên học viên<input id="don-ten" maxlength="80" value="${esc(donTam.ten || "")}" placeholder="VD: Nguyễn Văn An"></label>
      <label>Món<select id="don-mon">${monKho().map(m => `<option value="${esc(m.ma)}">${esc(m.ten)} · tồn ${m.ton || 0}</option>`).join("")}</select></label>
      <label>Số lượng<input id="don-sl" type="number" min="1" max="99" value="1" inputmode="numeric"></label>
      <div><button class="btn small" type="button" id="don-them">+ Thêm món vào đơn</button></div>
      <ul class="kho-gd">${dongMon}</ul>
      <p><b>Tổng đơn: ${vnd(tongDon(donNhap))}</b></p>
      <button class="btn primary" type="submit">Lưu đơn chờ chuyển khoản</button> <span class="status" id="don-st" role="status"></span>
    </form>
    <h4 class="kho-h4">Đơn đang chờ tiền (${cho.length})</h4>
    <ul class="kho-gd">${cho.map(d => `<li class="${d.trangThai === "da_bao" ? "ban" : ""}">
        <span>${TRANG_DON[d.trangThai] || ""}</span>
        <b>${esc(d.ten || d.mail)} · ${tenMon(d.items)}</b>
        <span>${vnd(d.tong)} · nội dung CK <b class="num">${esc(d.ma)}</b></span>
        <button type="button" class="btn small" data-dxn="${esc(d.id)}">Xác nhận đã nhận tiền</button>
        <button type="button" class="linkish" data-dxoa="${esc(d.id)}">Huỷ đơn</button></li>`).join("") || `<li class="muted">Không có đơn nào đang chờ.</li>`}</ul>
    <h4 class="kho-h4">Đã nhận tiền gần đây</h4>
    <ul class="kho-gd">${thu.map(d => `<li><span>Đã thu</span><b>${esc(d.ten || d.mail)} · ${tenMon(d.items)}</b><span>${vnd(d.tong)}</span><small>${fmtDate(d.thuLuc)}</small></li>`).join("") || `<li class="muted">Chưa có đơn đã thu.</li>`}</ul>`;
}
function bindDon() {
  const f = $("#f-don"); if (!f) return;
  $("#don-mail").oninput = e => { donTam.mail = e.target.value; };
  $("#don-ten").oninput = e => { donTam.ten = e.target.value; };
  $("#don-them").onclick = () => {
    const m = khoMon[$("#don-mon").value], sl = Math.max(1, Math.min(99, Math.round(Number($("#don-sl").value) || 0)));
    if (!m) return;
    const co = donNhap.find(x => x.ma === m.ma);
    if (co) co.sl = Math.min(99, co.sl + sl); else donNhap.push({ ma: m.ma, ten: m.ten, sl, gia: m.gia || 0, von: m.von || 0 });
    renderKho();
  };
  $$("#kho-body [data-dnb]").forEach(b => b.onclick = () => { donNhap.splice(Number(b.dataset.dnb), 1); renderKho(); });
  $$("#kho-body [data-dxn]").forEach(b => b.onclick = () => xacNhanDon(b.dataset.dxn));
  $$("#kho-body [data-dxoa]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "dondh", b.dataset.dxoa)), "Bấm lần nữa để huỷ đơn"));
  f.onsubmit = e => { e.preventDefault(); taoDon(); };
}
async function taoDon() {
  const st = $("#don-st"), mailHv = $("#don-mail").value.trim().toLowerCase(), ten = $("#don-ten").value.trim();
  if (!mailHv.includes("@")) { st.textContent = "Nhập Gmail học viên."; return; }
  if (!donNhap.length) { st.textContent = "Thêm ít nhất một món."; return; }
  const ma = "HV" + Math.random().toString(36).slice(2, 6).toUpperCase();
  st.textContent = "Đang lưu…";
  try {
    await timed("Tạo đơn", addDoc(collection(db, "dondh"), { mail: mailHv, ten: ten || mailHv, items: donNhap, tong: tongDon(donNhap), ma, trangThai: "cho", tao: Date.now(), nguoi: mail }));
    donNhap = []; donTam = {}; toast("Đã tạo đơn. Nội dung chuyển khoản: " + ma); renderKho();
  } catch (e) { st.textContent = "Chưa lưu được: " + (e.code || "lỗi mạng"); }
}
async function xacNhanDon(id) {
  const d = donAll.find(x => x.id === id); if (!d) return;
  try {
    await timed("Xác nhận đơn", runTransaction(db, async tx => {
      const ref = doc(db, "dondh", id), snap = await tx.get(ref);
      if (!snap.exists() || snap.data().trangThai === "da_thu") throw new Error("da-thu");
      const don = snap.data(), items = don.items || [];
      const mons = await Promise.all(items.map(it => tx.get(doc(db, "kho", it.ma))));
      mons.forEach((ms, i) => { const ton = Number(ms.data()?.ton) || 0; if (ton < items[i].sl) throw new Error("het:" + items[i].ten); });
      mons.forEach((ms, i) => { const m = ms.data(); tx.update(ms.ref, { ton: (Number(m.ton) || 0) - items[i].sl, daBan: (Number(m.daBan) || 0) + items[i].sl }); });
      items.forEach(it => tx.set(doc(collection(db, "khogd")), { loai: "ban", ma: it.ma, ten: it.ten, sl: it.sl, gia: it.gia, von: it.von || 0, ai: don.ten || don.mail, ngay: todayVN(), luc: Date.now(), nguoi: mail, donId: id }));
      tx.update(ref, { trangThai: "da_thu", thuLuc: Date.now() });
    }));
    toast(`Đã nhận ${vnd(d.tong)} từ ${d.ten || d.mail}. Kho đã trừ.`);
  } catch (e) {
    const m = String(e.message || "");
    toast(m.startsWith("het:") ? `Kho không đủ ${m.slice(4)}. Nhập thêm rồi xác nhận lại.` : m === "da-thu" ? "Đơn này đã xử lý rồi." : "Chưa xác nhận được. Kiểm tra mạng rồi bấm lại.", "err");
  }
}
async function danhDauDaChuyen(id) {
  const b = writeBatch(db); b.update(doc(db, "dondh", id), { trangThai: "da_bao", baoLuc: Date.now() });
  try { await timed("Báo đã chuyển khoản", b.commit()); toast("Đã báo. Anh chị kiểm tra và xác nhận nhé."); }
  catch (e) { toast("Chưa báo được. Kiểm tra mạng rồi bấm lại.", "err"); }
}
function donCuaToiHTML() {
  const cho = donCuaToi.filter(d => d.trangThai !== "da_thu");
  if (!cho.length) return "";
  return `<div class="hv-don"><h4 class="kho-h4">Đơn hoạ cụ của em</h4>${cho.map(d => `<div class="hv-don-i">
    <div><b>${tenMon(d.items)}</b></div>
    <div>Tổng <b class="num">${vnd(d.tong)}</b> · Nội dung chuyển khoản: <b class="num">${esc(d.ma)}</b></div>
    ${d.trangThai === "da_bao" ? `<p class="muted">Em đã báo chuyển khoản. Anh chị xác nhận xong là đơn tự đóng.</p>` : `<button class="btn small" type="button" data-dadong="${esc(d.id)}">Em đã chuyển khoản</button>`}
  </div>`).join("")}</div>`;
}
function tongTuDau() {
  const ban = khoGD.filter(g => g.loai === "ban"), nhap = khoGD.filter(g => g.loai === "nhap");
  const thu = ban.reduce((a, g) => a + g.sl * g.gia, 0), giaVon = ban.reduce((a, g) => a + g.sl * (g.von || 0), 0);
  const chi = nhap.reduce((a, g) => a + g.sl * g.gia, 0);
  const conTrongKho = monKho().reduce((a, m) => a + (Number(m.ton) || 0) * (Number(m.von) || 0), 0);
  return { thu, giaVon, lai: thu - giaVon, chi, conTrongKho };
}
function laiLoThang(th) {
  const gd = khoGD.filter(g => thangCua(g.ngay) === th);
  const ban = gd.filter(g => g.loai === "ban"), nhap = gd.filter(g => g.loai === "nhap");
  const doanhThu = ban.reduce((a, g) => a + g.sl * g.gia, 0), giaVon = ban.reduce((a, g) => a + g.sl * (g.von || 0), 0);
  const chiNhap = nhap.reduce((a, g) => a + g.sl * g.gia, 0);
  const theoMon = {}; ban.forEach(g => { const m = theoMon[g.ten] ||= { sl: 0, tien: 0, lai: 0 }; m.sl += g.sl; m.tien += g.sl * g.gia; m.lai += g.sl * (g.gia - (g.von || 0)); });
  return { gd, doanhThu, giaVon, lai: doanhThu - giaVon, chiNhap, dongTien: doanhThu - chiNhap, soDon: ban.length, theoMon };
}
function renderKho() {
  const sec = $("#kho"); if (!sec) return;
  sec.hidden = !(user && isAdmin);
  if (sec.hidden) return;
  const body = $("#kho-body");
  if (khoLoi) { body.innerHTML = `<p class="xh-loi">Máy chủ chưa cho mở Kho (${esc(khoLoi)}). Anh chị dán luật bảo mật mới (firestore.rules) một lần là dùng được.</p>`; return; }
  if (!khoDaTai) { body.innerHTML = `<p class="muted">Đang tải kho…</p>`; return; }
  const ds = monKho();
  if (!ds.length) {
    body.innerHTML = `<div class="kho-trong"><b>Kho chưa có dữ liệu.</b><p class="muted">Bấm nút dưới để tạo kho từ sổ hoạ cụ tháng 07 (${HOA_CU.length} món, kèm số tồn ghi trong sổ). Sau đó anh chị kiểm kho thực tế và sửa lại số tồn.</p>
      <button class="btn primary" id="kho-tao" type="button">Tạo kho từ sổ hoạ cụ</button> <span class="status" id="kho-tao-st"></span></div>`;
    $("#kho-tao").onclick = async () => {
      $("#kho-tao-st").textContent = "Đang tạo…";
      const b = writeBatch(db);
      HOA_CU.forEach(h => b.set(doc(db, "kho", h.ma), { ten: h.ten, loai: h.loai, gia: h.gia, von: h.von, ton: Number(TON_DAU_KY[h.ma]) || 0, daBan: 0 }));
      try { await timed("Tạo kho", b.commit()); toast("Đã tạo kho."); } catch (e) { $("#kho-tao-st").textContent = "Chưa tạo được: " + (e.code || "lỗi mạng"); }
    };
    return;
  }
  const thangNay = todayVN().slice(0, 7);
  if (!khoThang) khoThang = thangNay;
  const cacThang = [...new Set([thangNay, ...khoGD.map(g => thangCua(g.ngay))])].filter(Boolean).sort().reverse();
  const tongVon = ds.reduce((a, m) => a + (m.ton || 0) * (m.von || 0), 0), tongBan = ds.reduce((a, m) => a + (m.ton || 0) * (m.gia || 0), 0);
  const ll = laiLoThang(khoThang);
  body.innerHTML = `<div class="kho-tabs" role="tablist">${[["ton", "📦 Tồn kho"], ["gd", "➕ Nhập · Bán"], ["don", "🧾 Đơn chờ tiền"], ["ll", "📈 Lãi lỗ tháng"]].map(([k, t]) => `<button type="button" data-kt="${k}" aria-selected="${khoTab === k}">${t}</button>`).join("")}</div>
    <div class="kho-p" ${khoTab === "ton" ? "" : "hidden"}>
      <div class="kho-so"><div><b>${ds.reduce((a, m) => a + (m.ton || 0), 0)}</b><span>món đang tồn</span></div><div><b>${vnd(tongVon)}</b><span>vốn nằm trong kho</span></div><div><b>${vnd(tongBan)}</b><span>nếu bán hết thu về</span></div><div><b>${khoSapHet().length}</b><span>món sắp hết (≤3)</span></div></div>
      <div class="kho-bang"><div class="kho-r kho-h"><span>Món</span><span>Vốn</span><span>Giá bán</span><span>Tồn</span><span></span></div>
      ${ds.map(m => `<div class="kho-r ${(m.ton || 0) <= 3 ? "it" : ""}"><span><b>${esc(m.ten)}</b><small>${esc(m.loai)}</small></span><span>${vnd(m.von)}</span><span>${vnd(m.gia)}</span><span class="num"><b>${m.ton || 0}</b></span>
        <span><button type="button" class="linkish" data-ks="${esc(m.ma)}">Sửa</button></span></div>`).join("")}</div>
      <p class="muted kho-note">Bấm "Sửa" để chỉnh giá hoặc số tồn sau khi kiểm kho. <button class="btn small" type="button" id="kho-ve0" title="Mọi món về tồn 0; giữ giá, lịch sử nhập bán và lãi lỗ">Đưa tồn về 0 để kiểm kho</button><button type="button" class="linkish" id="kho-csv-ton">Tải bảng tồn kho (CSV, mở bằng Google Trang tính)</button></p>
    </div>
    <div class="kho-p" ${khoTab === "gd" ? "" : "hidden"}>
      <form id="f-kho" class="kho-f">
        <div class="seg kho-loai" role="group"><button type="button" data-kl="ban" aria-pressed="true">Bán cho học viên</button><button type="button" data-kl="nhap" aria-pressed="false">Nhập hàng</button></div>
        <label>Món<select id="kho-mon">${ds.map(m => `<option value="${esc(m.ma)}">${esc(m.ten)} · tồn ${m.ton || 0}</option>`).join("")}</select></label>
        <label>Số lượng<input id="kho-sl" type="number" min="1" max="9999" value="1" required inputmode="numeric"></label>
        <label>Đơn giá (đ)<input id="kho-gia" type="number" min="0" step="500" required inputmode="numeric"></label>
        <label>Người mua / nơi nhập<input id="kho-ai" maxlength="80" list="xh-ds-ten" placeholder="VD: Bảo · Bình Phú"></label>
        <label>Ngày<input id="kho-ngay" type="date" required value="${todayVN()}"></label>
        <button class="btn primary" type="submit">Lưu giao dịch</button><span class="status" id="kho-st"></span>
      </form>
      <h4 class="kho-h4">Giao dịch gần đây</h4>
      <ul class="kho-gd">${khoGD.slice(0, 25).map(g => `<li class="${g.loai}"><span>${g.loai === "ban" ? "Bán" : "Nhập"}</span><b>${esc(g.ten)} × ${g.sl}</b><span>${vnd(g.sl * g.gia)}</span><small>${esc(g.ai || "")} · ${ngayVN(g.ngay)}</small><button type="button" class="linkish" data-kx="${esc(g.id)}">Xoá</button></li>`).join("") || `<li class="muted">Chưa có giao dịch.</li>`}</ul>
    </div>
    <div class="kho-p" ${khoTab === "ll" ? "" : "hidden"}>
      ${(() => { const t = tongTuDau(); return `<div class="kho-tong"><h4 class="kho-h4">Tổng từ đầu đến nay (chỉ quản lý thấy)</h4>
        <div class="kho-so"><div><b>${vnd(t.thu)}</b><span>tổng tiền đã bán (thu về)</span></div><div><b>${vnd(t.giaVon)}</b><span>giá vốn của hàng đã bán</span></div>
        <div class="${t.lai >= 0 ? "lai" : "lo"}"><b>${t.lai >= 0 ? "+" : ""}${vnd(t.lai)}</b><span>${t.lai >= 0 ? "LÃI" : "LỖ"} đã thực hiện</span></div>
        <div><b>${vnd(t.chi)}</b><span>tổng tiền đã nhập hàng</span></div><div><b>${vnd(t.conTrongKho)}</b><span>vốn còn nằm trong kho</span></div></div>
        <p class="muted kho-note">Tính từ các giao dịch đã ghi trong sổ kho. Hàng có sẵn trong kho lúc tạo kho chưa có giá nhập ghi lại thì không tính vào lãi.</p></div>`; })()}
      <label class="kho-th">Tháng<select id="kho-thang">${cacThang.map(t => `<option value="${t}" ${t === khoThang ? "selected" : ""}>${t.slice(5)}/${t.slice(0, 4)}</option>`).join("")}</select></label>
      <div class="kho-so"><div><b>${vnd(ll.doanhThu)}</b><span>doanh thu bán (${ll.soDon} lượt)</span></div><div><b>${vnd(ll.giaVon)}</b><span>giá vốn hàng đã bán</span></div>
        <div class="${ll.lai >= 0 ? "lai" : "lo"}"><b>${ll.lai >= 0 ? "+" : ""}${vnd(ll.lai)}</b><span>${ll.lai >= 0 ? "LÃI" : "LỖ"} trên hàng đã bán</span></div><div><b>${vnd(ll.chiNhap)}</b><span>tiền nhập hàng trong tháng</span></div></div>
      <p class="muted kho-note">Dòng tiền tháng (thu bán − chi nhập): <b>${vnd(ll.dongTien)}</b>. Nhập nhiều để dự trữ thì dòng tiền âm là bình thường, lãi thật xem ở ô "LÃI/LỖ".</p>
      ${Object.keys(ll.theoMon).length ? `<div class="kho-bang"><div class="kho-r kho-h"><span>Món bán chạy</span><span>Số lượng</span><span>Doanh thu</span><span>Lãi</span><span></span></div>${Object.entries(ll.theoMon).sort((a, b) => b[1].tien - a[1].tien).map(([t, m]) => `<div class="kho-r"><span><b>${esc(t)}</b></span><span>${m.sl}</span><span>${vnd(m.tien)}</span><span>${vnd(m.lai)}</span><span></span></div>`).join("")}</div>` : `<p class="muted">Tháng này chưa bán món nào.</p>`}
      <p><button type="button" class="btn small" id="kho-csv-thang">Tải giao dịch tháng (CSV)</button> <button type="button" class="btn small" id="kho-gui">📧 Gửi báo cáo tháng này vào Gmail</button></p>
    </div>`;
  body.insertAdjacentHTML("beforeend", `<div class="kho-p" ${khoTab === "don" ? "" : "hidden"}>${donHTML()}</div>`);
  bindDon();
  body.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => { khoTab = b.dataset.kt; renderKho(); });
  body.querySelectorAll("[data-ks]").forEach(b => b.onclick = () => suaMon(b.dataset.ks));
  body.querySelectorAll("[data-kx]").forEach(b => confirmButton(b, () => xoaGD(b.dataset.kx)));
  const sel = $("#kho-thang"); if (sel) sel.onchange = () => { khoThang = sel.value; renderKho(); };
  $("#kho-csv-ton").onclick = () => taiCSV("ton-kho-" + todayVN() + ".csv", [["Món", "Loại", "Giá vốn", "Giá bán", "Tồn", "Vốn tồn"], ...ds.map(m => [m.ten, m.loai, m.von, m.gia, m.ton || 0, (m.ton || 0) * (m.von || 0)])]);
  $("#kho-csv-thang").onclick = () => taiCSV("giao-dich-" + khoThang + ".csv", [["Ngày", "Loại", "Món", "SL", "Đơn giá", "Thành tiền", "Giá vốn/món", "Lãi", "Người"], ...ll.gd.map(g => [g.ngay, g.loai === "ban" ? "Bán" : "Nhập", g.ten, g.sl, g.gia, g.sl * g.gia, g.von || "", g.loai === "ban" ? g.sl * (g.gia - (g.von || 0)) : "", g.ai || ""])]);
  $("#kho-gui").onclick = () => { guiBaoCao(khoThang, true); };
  // Kiểm kho lại từ đầu: đưa tồn mọi món về 0 (giữ giá, lịch sử, lãi lỗ; có nhật ký để khôi phục)
  confirmButton($("#kho-ve0"), () => { const b = writeBatch(db); ds.forEach(m => b.set(doc(db, "kho", m.ma), { ton: 0 }, { merge: true })); return b.commit(); }, "Bấm lần nữa: mọi món về tồn 0");
  let loai = "ban";
  const giaMacDinh = () => { const m = khoMon[$("#kho-mon").value]; $("#kho-gia").value = m ? (loai === "ban" ? m.gia : m.von) : ""; };
  body.querySelectorAll("[data-kl]").forEach(b => b.onclick = () => { loai = b.dataset.kl; body.querySelectorAll("[data-kl]").forEach(x => x.setAttribute("aria-pressed", x === b)); giaMacDinh(); });
  $("#kho-mon").onchange = giaMacDinh; giaMacDinh();
  $("#f-kho").onsubmit = async e => {
    e.preventDefault();
    const m = khoMon[$("#kho-mon").value], sl = Math.max(1, Math.round(Number($("#kho-sl").value) || 0)), gia = Math.max(0, soVN($("#kho-gia").value) || 0);
    if (!m) return;
    const nut = e.submitter || $("#f-kho [type=submit]"); if (nut && nut.disabled) return; // chống bấm 2 lần ghi 2 giao dịch
    if (loai === "ban" && sl > (m.ton || 0) && !confirm(`Kho chỉ còn ${m.ton || 0} ${m.ten}. Vẫn lưu?`)) return;
    const ton = (m.ton || 0) + (loai === "nhap" ? sl : -sl);
    const von = loai === "nhap" && ton > 0 ? Math.round(((m.ton > 0 ? m.ton : 0) * (m.von || 0) + sl * gia) / ((m.ton > 0 ? m.ton : 0) + sl)) : (m.von || 0);
    const b = writeBatch(db);
    b.set(doc(db, "khogd", Date.now().toString(36) + Math.random().toString(36).slice(2, 7)), { loai, ma: m.ma, ten: m.ten, sl, gia, von: m.von || 0, ai: $("#kho-ai").value.trim(), ngay: $("#kho-ngay").value || todayVN(), luc: Date.now(), nguoi: mail });
    // Cộng/trừ ngay trên máy chủ (increment): 2 máy cùng lưu hay bấm nhanh cũng không lệch số tồn
    b.set(doc(db, "kho", m.ma), { ton: increment(loai === "nhap" ? sl : -sl), von, ...(loai === "ban" ? { daBan: increment(sl) } : {}) }, { merge: true });
    $("#kho-st").textContent = "Đang lưu…"; if (nut) nut.disabled = true;
    try { await timed("Lưu kho", b.commit()); $("#kho-st").textContent = ""; toast(`Đã ${loai === "ban" ? "bán" : "nhập"} ${sl} ${m.ten}. Tồn còn khoảng ${ton}.`); }
    catch (err) { $("#kho-st").textContent = "Chưa lưu được: " + (err.code || "lỗi mạng") + ". Bấm Lưu lại."; }
    finally { if (nut) nut.disabled = false; }
  };
}
// Số kiểu Việt Nam: "120.000" / "1,5" / "12" → số; sai thì NaN (không lưu thành 0 âm thầm)
const soVN = x => { let t = String(x ?? "").trim().replace(/\s|đ|₫/gi, ""); if (/^\d{1,3}([.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, ""); else t = t.replace(",", "."); return t === "" ? NaN : Number(t); };
async function suaMon(ma) {
  const m = khoMon[ma]; if (!m) return;
  const ton = prompt(`Số tồn thực tế của "${m.ten}":`, m.ton || 0); if (ton === null) return;
  const gia = prompt(`Giá bán "${m.ten}" (đ):`, m.gia || 0); if (gia === null) return;
  const von = prompt(`Giá nhập (vốn) "${m.ten}" (đ):`, m.von || 0); if (von === null) return;
  const t = soVN(ton), g = soVN(gia), v = soVN(von);
  if ([t, g, v].some(x => !(x >= 0))) return toast("Số chưa đúng. Chỉ gõ số, VD 12 hoặc 120.000.", "err");
  try { await timed("Sửa kho", setDoc(doc(db, "kho", ma), { ton: Math.round(t), gia: g, von: v }, { merge: true })); toast("Đã cập nhật " + m.ten); }
  catch (e) { toast("Chưa lưu được.", "err"); }
}
async function xoaGD(id) {
  const g = khoGD.find(x => x.id === id), m = g && khoMon[g.ma]; if (!g) return;
  const b = writeBatch(db);
  b.delete(doc(db, "khogd", id));
  if (m) b.set(doc(db, "kho", m.ma), { ton: (m.ton || 0) + (g.loai === "ban" ? g.sl : -g.sl), ...(g.loai === "ban" ? { daBan: Math.max(0, (m.daBan || 0) - g.sl) } : {}) }, { merge: true });
  await timed("Xoá giao dịch", b.commit());
}
function taiCSV(ten, rows) {
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = ten; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Đầu tháng: tự gửi báo cáo lãi lỗ tháng trước vào Gmail anh chị (một lần, ghi nhớ trên máy chủ)
async function baoCaoThang() {
  if (!isAdmin || !EMAIL_NHAN_THONG_BAO || !khoDaTai) return;
  const d = new Date(todayVN() + "T12:00:00"); d.setMonth(d.getMonth() - 1);
  const th = d.toISOString().slice(0, 7), cd = khoMon._caidat || {};
  if (cd.daGui === th || baoCaoThang.dang) return;
  if (!khoGD.some(g => thangCua(g.ngay) <= th)) return;      // kho mới mở, chưa có tháng trước
  baoCaoThang.dang = true;
  try { await guiBaoCao(th, false); await setDoc(doc(db, "kho", "_caidat"), { daGui: th, luc: Date.now() }, { merge: true }); } catch (e) {}
  baoCaoThang.dang = false;
}
async function guiBaoCao(th, tay) {
  const ll = laiLoThang(th), ten = `${th.slice(5)}/${th.slice(0, 4)}`;
  const top = Object.entries(ll.theoMon).sort((a, b) => b[1].tien - a[1].tien).slice(0, 8).map(([t, m]) => `${t}: ${m.sl} món · ${vnd(m.tien)} · lãi ${vnd(m.lai)}`).join("\n") || "Không bán món nào";
  const het = khoSapHet().join(", ") || "Không có";
  try {
    const r = await fetch("https://formsubmit.co/ajax/" + EMAIL_NHAN_THONG_BAO, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ _subject: `Báo cáo kho hoạ cụ tháng ${ten}: ${ll.lai >= 0 ? "LÃI" : "LỖ"} ${vnd(ll.lai)}`, _template: "table", _captcha: "false",
        "Tháng": ten, "Doanh thu bán": vnd(ll.doanhThu), "Số lượt bán": ll.soDon, "Giá vốn hàng bán": vnd(ll.giaVon), "LÃI / LỖ": vnd(ll.lai),
        "Tiền nhập hàng": vnd(ll.chiNhap), "Dòng tiền (thu − chi)": vnd(ll.dongTien), "Món bán chạy": top, "Sắp hết hàng": het }) });
    if (tay) toast(r.ok ? "Đã gửi báo cáo vào Gmail." : "Chưa gửi được báo cáo.", r.ok ? "" : "err");
  } catch (e) { if (tay) toast("Chưa gửi được báo cáo.", "err"); throw e; }
}

/* ================= Nối với trợ lý: ai đang đăng nhập + danh sách nhắc việc ================= */
function baoTroLy(show) {
  troLyPromise.then(() => {
    const t = window.__troLy; if (!t) return;
    if (!show || !user) { t.dangNhap(null); return; }
    const hv = myHv || {};
    t.dangNhap({ ten: (!isTeacher && hv.ten) || user.displayName || "", mail, vaiTro: isAdmin ? "ql" : isTeacher ? "gv" : "hv",
      khoi: String(hv.chuongTrinh || hv.khoi || hv.lop || "").match(/Khối [HV]|Cơ bản/i)?.[0] || "", coso: hv.coso || "" });
    capNhatNhac();
  });
}
function capNhatHocTapTroLy() {
  const bot = window.__troLy;
  if (!bot || !user || isTeacher || !approved) { bot?.hocTap(null); return; }
  const t = thongKe(myDiemdanh, myHv, myFeedback), today = todayVN();
  const keys = t.keys.filter(k => (Date.parse(today) - Date.parse(k.slice(0, 10))) / 864e5 < 28);
  const diem = Object.values(myFeedback).filter(x => x && soDiem(x.diem) !== null && soDiem(x.diem) >= 0 && soDiem(x.diem) <= 10).sort((a, b) => (b.luc || 0) - (a.luc || 0)).slice(0, 6);
  bot.hocTap({ mail, sanSang: troLyDaTai.diemDanh && troLyDaTai.diem && troLyDaTai.bai,
    records28: keys.length, co28: keys.filter(k => myDiemdanh[k] === 'co').length,
    vang28: keys.filter(k => myDiemdanh[k] === 'vang').length, phep28: keys.filter(k => myDiemdanh[k] === 'phep').length,
    tongBai: homework.length, daNop: homework.filter(h => myProgress.baitap[h.id]).length,
    quaHan: homework.filter(h => h.han && daysUntil(h.han) < 0 && !myProgress.baitap[h.id]).length,
    lamLai: homework.filter(h => canLamLai(myFeedback[h.id], myProgress.baitap[h.id])).length,
    avg: diem.length ? diem.reduce((n, x) => n + soDiem(x.diem), 0) / diem.length : null,
    soDiem: diem.length, diemMucTieu: MUC_TIEU.diemDat, daysLeft: t.daysLeft, ngayThi: t.ngayThi, suggested: t.suggested,
    nhanXetGanNhat: diem.slice(0, 3).map(x => ({ diem: soDiem(x.diem), nhanXet: String(x.nhanXet || '').slice(0, 350) })) });
}
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
function capNhatNhac() {
  const t = window.__troLy; if (!t || !user) return;
  capNhatHocTapTroLy();
  const ds = [], hom = todayVN(), thu = THU[new Date(hom + "T12:00:00").getDay()];
  try {
    if (!isTeacher) {
      const cs = String((myHv && myHv.coso) || "");
      Object.entries(THOI_GIAN_BIEU).filter(([ten]) => !cs || bo2(ten).includes(bo2(cs))).forEach(([ten, ca]) => CA_HOC.forEach(c => {
        const mon = (ca[c.ma] || {})[thu];
        if (mon) ds.push({ id: "hoc-" + hom + c.ma + ten, icon: "🎨", muc: "", tieuDe: `Hôm nay có buổi ${mon} · ${c.ten} ${c.gio}`, nd: `${ten}. Đi học đều +10 XP mỗi buổi, đừng để rank nằm im.`, link: "#giao-trinh", dich: "#my-prog" });
      }));
      homework.forEach(h => {
        const fb = myFeedback[h.id], nop = myProgress.baitap[h.id];
        if (canLamLai(fb, nop)) ds.push({ id: "ll-" + h.id + (fb.luc || ""), icon: "⚠️", muc: "gap", tieuDe: `Làm lại: ${h.ten}`, nd: `Chưa đạt ${chuaDat(fb).join(", ") || "tiêu chí"}${fb.hanLamLai ? ` · hạn ${ngayVN(fb.hanLamLai)}` : ""}. Làm lại rồi bấm Nộp lại.`, link: "#bai-tap", hw: "open", dich: `[data-nhac-id="${CSS.escape("bt-" + h.id)}"]` });
        else if (!nop && h.han) { const n = daysUntil(h.han), dich = `[data-nhac-id="${CSS.escape("bt-" + h.id)}"]`;
          if (n >= 0 && n <= 2) ds.push({ id: "han-" + h.id, icon: "⏰", muc: n === 0 ? "gap" : "", tieuDe: `${n === 0 ? "Hôm nay" : n === 1 ? "Ngày mai" : "Còn 2 ngày"} hết hạn: ${h.ten}`, nd: "Chưa đánh dấu nộp bài.", link: "#bai-tap", hw: "open", dich });
          else if (n < 0 && n >= -7) ds.push({ id: "tre-" + h.id, icon: "🐢", muc: "gap", tieuDe: `Quá hạn: ${h.ten}`, nd: "Nộp muộn còn hơn không nộp. Nộp xong nhắn anh chị một câu nhé.", link: "#bai-tap", hw: "past", dich }); }
      });
    } else {
      const choCham = homework.reduce((a, h) => a + roster.filter(r => { const fb = feedbackAll[r.id]?.[h.id], nop = progressAll[r.id]?.baitap?.[h.id]; return (nop && !fb) || daNopLai(fb, nop); }).length, 0);
      if (choCham) ds.push({ id: "cham-" + choCham, icon: "📝", muc: "gap", tieuDe: `${choCham} bài đang chờ chấm`, nd: "Có cả bài học viên đã nộp lại.", link: "#bai-tap", dich: "#hw-list" });
      if (isAdmin && reqCount) ds.push({ id: "duyet-" + reqCount, icon: "🙋", muc: "gap", tieuDe: `${reqCount} yêu cầu chờ duyệt`, link: "#duyet", dich: "#ql-duyet-h" });
      if (typeof khoSapHet === "function") { const het = khoSapHet(); if (het.length) ds.push({ id: "kho-" + het.join(), icon: "📦", muc: "", tieuDe: `Kho sắp hết ${het.length} món`, nd: het.slice(0, 4).join(", "), link: "#kho", dich: "#kho" }); }
    }
    // Khung giờ cố định do quản lý đặt: từ giờ đã hẹn đến hết ngày thì vẫn hiện trong Nhắc việc
    lichDenGio().forEach(x => {
      ds.push({ id: "lich-" + x.id + "-" + x.lanHen, icon: "⏰", muc: "", tieuDe: x.ten || "Nhắc việc", nd: x.nd || "", link: "#lam-viec", tab: "tb", dich: "#lv-tb" });
      const dau = "lichbao-" + x.id + "-" + x.lanHen;
      if (!lichDaBao.has(dau)) { lichDaBao.add(dau); toast(`⏰ ${x.ten || "Nhắc việc"}${x.nd ? ": " + x.nd : ""}`); }
    });
    // Mỗi ngày một nhắc: còn bao nhiêu ngày đến kỳ thi (theo khối của học viên)
    if (!isTeacher && myHv) {
      const mocTT = mocThiCuaToi();
      const khoiHv = khoiOf(myHv), ngayThi = mocTT ? mocTT.ngay : (MUC_TIEU.ngayThi[khoiHv] || MUC_TIEU.ngayThi["Khối H"]), conNgay = mocTT ? mocTT.n : daysUntil(ngayThi);
      if (conNgay > 0) {
        const ndNhac = mocTT ? `Trường ${mocTT.truong} (${mocTT.dot}) dự kiến thi ${mocTT.hienThi}/${mocTT.ngay.slice(0, 4)}. Đây không phải lịch thi chính thức.` : `Mốc ôn luyện dự kiến ${ngayVN(ngayThi)}. Đây không phải lịch thi chính thức.`;
        ds.push({ id: "ngaythi-" + hom, icon: "🗓", muc: "", tieuDe: `Còn ${conNgay} ngày đến kỳ thi`, nd: ndNhac, link: "#giao-trinh", dich: "#my-prog" });
        // toast một lần mỗi 24 giờ (nhớ trên máy này)
        let lanBao = 0; try { lanBao = Number(localStorage.getItem("lvtt-ngaythi-bao")) || 0; } catch (e) {}
        if (Date.now() - lanBao >= 86400000) { toast(`🗓 Còn ${conNgay} ngày đến kỳ thi`); try { localStorage.setItem("lvtt-ngaythi-bao", String(Date.now())); } catch (e) {} }
      }
    }
    const tin = lvUnreadMsgs(), tb = lvUnreadTB();
    if (tin) ds.push({ id: "tin-" + tin, icon: "💬", muc: "", tieuDe: `${tin} tin nhắn mới`, link: "#lam-viec", tab: "tin", dich: "#lv-tin" });
    // Mỗi thông báo chưa đọc là một nhắc việc riêng: bấm vào sẽ nhảy đúng tới thông báo đó
    if (tb) {
      const chuaXem = lvTB.filter(x => x.luc > store.get(tbSeenKey(), 0) && x.tacGia !== mail).sort((a, b) => b.luc - a.luc);
      chuaXem.slice(0, 3).forEach(x => ds.push({ id: "tb-" + x.id, icon: "📣", muc: "", tieuDe: "Thông báo: " + (x.tieuDe || "mới của lớp"), nd: String(x.nd || "").slice(0, 100), link: "#lam-viec", tab: "tb", dich: `[data-nhac-id="${CSS.escape("tb-" + x.id)}"]` }));
      if (tb > 3) ds.push({ id: "tb-more-" + tb, icon: "📣", muc: "", tieuDe: `Còn ${tb - 3} thông báo mới khác`, link: "#lam-viec", tab: "tb", dich: "#lv-tb" });
    }
  } catch (e) { console.warn(e); }
  t.nhacViec(ds);
}
const bo2 = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
/* Gửi tin cho anh chị trong kênh trao đổi riêng của học viên (dùng cho "Soạn tin mua hoạ cụ") */
window.__guiTinThay = async nd => {
  if (!db || !mail || isTeacher) throw new Error("chua-dang-nhap");
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7), luc = Date.now();
  const b = writeBatch(db);
  b.set(doc(db, "traodoi", mail), { vaiTro: "hocvien", ten: tenToi(), cuoi: nd.slice(0, 80), cuoiTu: mail, capNhat: luc, xemHV: luc }, { merge: true });
  b.set(doc(db, `traodoi/${mail}/tin`, id), { tu: mail, ten: tenToi(), vt: "hv", nd: nd.slice(0, 1000), luc });
  await timed("Gửi tin", b.commit());
};

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
  listenLV(collection(db, "lichnhac"), snap => { lichNhac = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLichNhac(); capNhatNhac(); });
  if (isTeacher) listenLV(collection(db, "thongbao"), snap => { lvTB = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  else listenLV(query(collection(db, "thongbao"), where("gui", "==", "tatca")), snap => { lvTB = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (isTeacher) listenLV(collection(db, "congviec"), snap => { lvCV = snap.docs.filter(d => d.id[0] !== "_").map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (isAdmin) listenLV(collection(db, "traodoi"), snap => { lvKenh = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  else if (isTeacher) listenLV(query(collection(db, "traodoi"), where("vaiTro", "==", "hocvien")), snap => { lvKenh = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLV(); });
  if (!isAdmin) listenLV(doc(db, "traodoi", mail), d => { lvMine = d.exists() ? { id: d.id, ...d.data() } : null; renderLV(); });
  if (!isTeacher) lvOpen = mail; // học viên: chỉ có 1 cuộc trò chuyện với anh chị
  if (isAdmin) khoStart();
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
window.__lvTab = setLvTab;   // cho khung Nhắc việc mở đúng tab khi bấm nhắc
$$("#chat-filter [data-cf]").forEach(b => b.onclick = () => { chatFilter = b.dataset.cf; $$("#chat-filter [data-cf]").forEach(x => x.setAttribute("aria-selected", x === b)); renderChatList(); });
$$("#cv-filter [data-cv]").forEach(b => b.onclick = () => { cvView = b.dataset.cv; $$("#cv-filter [data-cv]").forEach(x => x.setAttribute("aria-selected", x === b)); renderViec(); });

function renderLV() {
  if (!$("#lv-body")) return;
  $("#lv-intro").textContent = isAdmin ? "Nhắn tin với học viên và giáo viên, đăng thông báo, giao việc cho giáo viên."
    : isTeacher ? "Nhắn tin với học viên và quản lý, xem thông báo và việc được giao."
    : "Nhắn tin riêng với anh chị và xem thông báo của lớp.";
  $("#tb-gui").disabled = !isAdmin; if (!isAdmin) $("#tb-gui").value = "tatca";
  let warn = $("#lv-warn");
  if (lvErr) {
    if (!warn) { warn = document.createElement("p"); warn.id = "lv-warn"; warn.className = "sv-status bad"; $("#lv-body").prepend(warn); }
    warn.innerHTML = lvErr === "permission-denied"
      ? (isAdmin ? `<b>⚠ Khu Trao đổi cần luật bảo mật mới.</b> Anh chị vào trang <a href="#duyet">Duyệt</a>, bấm "Sao chép luật mới" rồi dán vào Firebase như lần trước.`
                 : "Khu Trao đổi đang được anh chị cập nhật, em quay lại sau nhé.")
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
  if (!isTeacher) return "Anh chị lớp Thạch Thất";
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
  const nguoi = (vtLoc === "giaovien" ? teachers : roster.filter(x => !teachers.some(t => t.id === x.id))).filter(x => !co.has(x.id) && x.id !== mail); // học viên kiêm giáo viên nhắn ở mục Giáo viên
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
  $("#chat-sub").textContent = !isTeacher ? "Tin nhắn riêng, chỉ anh chị của lớp đọc được."
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
  }).join("") : `<p class="muted m-empty">${!isTeacher ? "Em có câu hỏi về bài vẽ, lịch học hay xin nghỉ? Nhắn ở đây, anh chị sẽ trả lời sớm." : "Chưa có tin nhắn. Gõ tin đầu tiên ở bên dưới."}</p>`;
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
  $("#tb-list").innerHTML = list.length ? list.map(t => `<article class="tb${t.gui === "giaovien" ? " noibo" : ""}" data-nhac-id="${esc("tb-" + t.id)}">
      <div class="tb-head">${t.gui === "giaovien" ? `<span class="chip line">Nội bộ giáo viên</span>` : ""}${t.tuDong ? `<span class="chip line">Tự động</span>` : ""}<b>${esc(t.tieuDe || "Thông báo")}</b>
        <span class="muted num">${esc(t.ten || "")} · ${esc(fmtDate(t.luc))}</span></div>
      <p>${esc(t.nd).replace(/\n/g, "<br>")}</p>
      ${isAdmin || t.tacGia === mail ? `<button type="button" class="btn small" data-xtb="${esc(t.id)}">Xoá</button>` : ""}</article>`).join("")
    : `<p class="muted empty">Chưa có thông báo nào.</p>`;
  $$("#tb-list [data-xtb]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "thongbao", b.dataset.xtb))));
}
// Mẫu thông báo có sẵn: chọn mẫu sẽ điền tiêu đề và nội dung, người viết sửa phần trong [ ]
const MAU_TB = {
  top: ["🏆 Top bài vẽ tuần [số tuần]", "Chúc mừng các em [tên 1], [tên 2], [tên 3], [tên 4], [tên 5].\nXem bài và nhận xét của anh chị trong mục Bài nổi bật."],
  xuatsac: ["⭐ Bài tập [tên bài] được chấm Xuất sắc", "Bài của em [tên học viên] đã được đăng lên Bài vẽ học viên.\nCác em xem để học cách bố cục và xử lý sắc độ."],
  tintuc: ["📢 [Tiêu đề tin]", "[Một hai câu tóm tắt tin].\nBấm Xem chi tiết trong mục Tin nổi bật để đọc đầy đủ."],
  lichhoc: ["📅 Thay đổi lịch học tuần [số tuần]", "Lớp [tên lớp] chuyển từ [giờ cũ] sang [giờ mới] vào [ngày].\nCác em sắp xếp thời gian giúp anh chị nhé."],
  baitap: ["✏️ Bài tập mới: [tên bài]", "Hạn nộp: [ngày giờ].\nCác em chụp bài (tối đa 3 ảnh) và nộp trong mục Bài tập."],
  online: ["🎨 Mở đăng ký lớp online", "Lớp luyện thi online của Dreamers sắp khai giảng [tháng].\nĐăng ký nhận lịch sớm ngay tại trang chủ."]
};
$("#tb-mau").addEventListener("change", e => {
  const m = MAU_TB[e.target.value]; if (!m) return;
  $("#tb-tieude").value = m[0]; $("#tb-nd").value = m[1]; $("#tb-nd").focus();
});
// Thông báo tự động: ghi thẳng vào mục thông báo chung, học viên thấy ở khung Nhắc việc và mục Thông báo
function thongBaoTuDong(tieuDe, nd) {
  if (!(user && db && isAdmin)) return Promise.resolve();
  return addDoc(collection(db, "thongbao"), { tieuDe: String(tieuDe).slice(0, 120), nd: String(nd).slice(0, 2000), gui: "tatca", tacGia: mail, ten: tenToi(), luc: Date.now(), tuDong: true })
    .catch(() => {});
}
$("#f-tb").addEventListener("submit", async e => {
  e.preventDefault();
  const nd = $("#tb-nd").value.trim(); if (!nd) return;
  const data = { tieuDe: $("#tb-tieude").value.trim().slice(0, 120), nd, gui: isAdmin ? $("#tb-gui").value : "tatca", tacGia: mail, ten: tenToi(), luc: Date.now() };
  const st = $("#tb-status"); st.textContent = "Đang đăng…";
  try { await addDoc(collection(db, "thongbao"), data); $("#f-tb").reset(); st.textContent = ""; toast("Đã đăng thông báo."); }
  catch (err) { st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho phép (cần dán luật bảo mật mới)." : "Chưa đăng được, kiểm tra mạng."; }
});

/* ----- Khung giờ nhắc cố định (ăn sáng, ăn trưa, ăn tối, nộp bài) ----- */
const LICH_MAU = {
  sang: ["Nhắc ăn sáng", "06:30", "Chào buổi sáng! Ăn sáng đủ no rồi mới vẽ tốt. Hôm nay em làm bài nào trong mục Bài tập?"],
  trua: ["Nhắc ăn trưa", "11:30", "Đến giờ ăn trưa. Nghỉ 30 phút rồi luyện thêm một bài nhỏ nhé."],
  toi: ["Nhắc ăn tối và làm bài", "18:00", "Ăn tối xong, dành 60 phút vẽ bài tập đến hạn. Nộp bài trong mục Bài tập."],
  nop: ["Nhắc nộp bài", "21:00", "Kiểm tra bài tập trong mục Bài tập. Chụp ảnh rõ, tối đa 3 ảnh, nộp trước hạn."]
};
const phutTuGio = s => { const [h, m] = String(s || "").split(":").map(Number); return h * 60 + m; };
// Thứ 2 = 0 … chủ nhật = 6
// Nhắc đã tới giờ và còn hiện trong vòng 24 giờ kể từ giờ hẹn (có thể gồm cả lần hẹn hôm qua)
function lichDenGio() {
  if (!user || !lichNhac.length) return [];
  const now = new Date(), phutHomNay = now.getHours() * 60 + now.getMinutes(), out = [];
  lichNhac.forEach(x => {
    if (x.bat === false) return;
    for (let d = 0; d <= 1; d++) {
      const ngay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      if (!(x.ngay || []).includes((ngay.getDay() + 6) % 7)) continue;
      const troi = d * 1440 + phutHomNay - phutTuGio(x.gio);
      if (troi >= 0 && troi < 1440) out.push({ ...x, lanHen: ngay.toLocaleDateString("sv-SE") });
    }
  });
  return out;
}
function renderLichNhac() {
  const box = $("#lich-ds"); if (!box) return;
  const ds = lichNhac.slice().sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
  box.innerHTML = ds.length ? `<ul class="lich-ds">${ds.map(x => `<li><b class="num">${esc(x.gio)}</b> ${esc(x.ten || "")}
      <span class="muted">${(x.ngay || []).length === 7 ? "mỗi ngày" : (x.ngay || []).map(i => ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]).join(", ")}${x.bat === false ? " · đang tắt" : ""}</span>
      <button type="button" class="btn small" data-blich="${esc(x.id)}">${x.bat === false ? "Bật" : "Tắt"}</button>
      <button type="button" class="btn small" data-xlich="${esc(x.id)}">Xoá</button></li>`).join("")}</ul>`
    : `<p class="muted">Chưa có khung giờ nhắc nào.</p>`;
  $$("#lich-ds [data-blich]").forEach(b => b.onclick = () => { const x = lichNhac.find(y => y.id === b.dataset.blich); if (!x) return;
    timed("Bật/tắt nhắc", setDoc(doc(db, "lichnhac", x.id), { bat: x.bat === false }, { merge: true })).catch(() => toast("Chưa lưu được, thử lại.", "err")); });
  $$("#lich-ds [data-xlich]").forEach(b => confirmButton(b, () => deleteDoc(doc(db, "lichnhac", b.dataset.xlich)), "Xoá?"));
}
$("#lich-mau").addEventListener("change", e => {
  const m = LICH_MAU[e.target.value]; if (!m) return;
  $("#lich-ten").value = m[0]; $("#lich-gio").value = m[1]; $("#lich-nd").value = m[2];
});
$("#f-lich").addEventListener("submit", async e => {
  e.preventDefault();
  const ten = $("#lich-ten").value.trim(), gio = $("#lich-gio").value, nd = $("#lich-nd").value.trim();
  const ngay = [...document.querySelectorAll('[name="lich-ngay"]:checked')].map(c => Number(c.value));
  const st = $("#lich-st"); st.classList.remove("err");
  if (!ten || !gio) { st.textContent = "Nhập tên nhắc và giờ."; st.classList.add("err"); return; }
  if (!ngay.length) { st.textContent = "Chọn ít nhất một ngày nhắc."; st.classList.add("err"); return; }
  st.textContent = "Đang lưu…";
  try { await timed("Thêm khung giờ", addDoc(collection(db, "lichnhac"), { ten, gio, nd, ngay, bat: true, tacGia: mail, luc: Date.now() }));
    $("#lich-mau").value = ""; $("#lich-ten").value = ""; $("#lich-nd").value = ""; st.textContent = "Đã thêm khung giờ."; }
  catch (err) { st.classList.add("err"); st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho phép: quản lý cần dán luật bảo mật mới (firestore.rules)." : "Chưa lưu được, kiểm tra mạng."; }
});
// Kiểm tra giờ mỗi phút để nhắc đúng lúc đã hẹn khi học viên đang mở web
setInterval(() => { try { if (user) capNhatNhac(); } catch (e) {} }, 60000);

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
      <span class="cv-meta muted">${c.cho === "tatca" ? "Tất cả giáo viên" : esc((teachers.find(t => t.id === c.cho) || {}).ten || (c.cho === mail ? "Anh/chị" : c.cho))}
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
function stopListeners() { unsubs.forEach(u => u()); unsubs = []; if (vanHanhM) vanHanhM.dung(); }
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
    hv: myHv ? { ten: myHv.ten || "", chuongTrinh: myHv.chuongTrinh || "", lop: myHv.lop || "", coso: myHv.coso || "", khoaHoc: Array.isArray(myHv.khoaHoc) ? myHv.khoaHoc : null } : null,
    pending: pending ? { guiLuc: pending.guiLuc || Date.now() } : null } : null);
}
function showCachedSession() {
  if (!configured) return;
  const c = cachedSession;
  if (!c || !c.mail) { renderLocks("out"); renderAccount(false); return; }
  user = { displayName: c.ten, photoURL: c.anh, email: c.mail }; mail = c.mail; napAvatarMay(c.mail);
  isAdmin = !!c.isAdmin; isTeacher = !!c.isTeacher; approved = !!c.approved; myHv = c.hv || null;
  const coDL = (isTeacher || approved) && loadData(c.mail); // nạp dữ liệu trên máy trước để các ô số liệu không hiện "0"
  renderLocks(isTeacher || approved ? "ok" : "pending");
  renderAccount(c.pending || false);
  if (coDL) { renderLessons(); renderHomework(); return; }
  $("#lesson").innerHTML = `<p class="muted">Đang tải giáo trình…</p>`;
  $("#hw-list").innerHTML = `<div class="empty">Đang tải bài tập…</div>`;
}

async function onUser(u) {
  mark(u ? "Khôi phục đăng nhập (" + (u.email || "") + ")" : "Khôi phục đăng nhập (chưa đăng nhập)");
  stopListeners();
  const prevMail = mail;
  user = u; mail = u ? String(u.email || "").toLowerCase() : "";
  isAdmin = false; isTeacher = false; approved = false; needVerify = false;
  napAvatarMay(mail);
  roster = []; requests = []; teachers = []; progressAll = {}; feedbackAll = {};
  diemdanhAll = {}; myDiemdanh = {}; myHv = null; hvTuMayChu = false; troLyDaTai = { diemDanh: false, diem: false, bai: false }; lvReset(); khoMon = {}; khoGD = []; donAll = []; donCuaToi = []; donNhap = []; donTam = {}; khoLoi = ""; khoDaTai = false;
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
  // Máy chủ không trả lời trong 8 giây thì coi như chưa hỏi được (để dùng quyền đã lưu và tự thử lại), không để treo mãi
  const hanTuoi = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), 8000))]);
  let tuChoiQuyen = false, tuLoi = ""; // tuChoiQuyen: máy chủ từ chối đọc; tuLoi: mã lỗi để báo anh chị
  const exists = async (col) => { try { return (await hanTuoi(getDoc(doc(db, col, mail)))).exists(); } catch (e) { if (e && e.code === "permission-denied") tuChoiQuyen = true; return false; } };
  // Hỏi cả 4 thông tin cùng lúc thay vì lần lượt, để trang hiện nhanh hơn.
  const getData = async (col) => {
    try { const d = await hanTuoi(getDoc(doc(db, col, mail))); return d.exists() ? (d.data() || {}) : null; }
    catch (e) {
      tuLoi = (e && (e.code || e.name)) || "khong-ro";
      if (e && e.code === "permission-denied") tuChoiQuyen = true; else if (e) serverIssue(e);
      return undefined; // undefined = chưa hỏi được, khác null = không có
    }
  };
  // Đã xác nhận email nhưng token trên máy còn cũ (chưa có claim email_verified): làm mới token trước khi đọc dữ liệu.
  if (!u.__thuLai && u.emailVerified) { try { await hanTuoi(u.getIdToken(true)); } catch (e) {} }
  const tr = performance.now();
  // Ảnh đại diện riêng của tài khoản này (giáo viên, quản lý, học viên đều có)
  let avaTuMay = false;
  getData("anhdaidien").then(a => { if (user !== u || !a) return; avaTuMay = true; myAvatar = a.anh || ""; try { myAvatar ? localStorage.setItem(AVA_KEY(mail), myAvatar) : localStorage.removeItem(AVA_KEY(mail)); } catch (e) {} renderTiles(); });
  const [isAdm, gvDoc, hvDoc, ycDoc, tdDoc] = isAdminMail ? [true, null, null, null, null] : await Promise.all([
    exists("admins"), getData("giaovien"), getData("hocvien"), getData("yeucau"), getData("tiendo")
  ]);
  if (mail !== (u.email || "").toLowerCase() || user !== u) return; // người dùng đã đổi trong lúc chờ
  mark("Kiểm tra vai trò", tr);
  isAdmin = !!isAdm;
  isTeacher = isAdmin || !!gvDoc;
  approved = !isTeacher && !!hvDoc;
  myHv = hvDoc || null; hvTuMayChu = true;
  // Máy chủ không trả lời (mất mạng, lỗi tải): KHÔNG hạ quyền. Dùng quyền đã lưu trên máy và tự thử lại.
  const hong = !isAdminMail && !isTeacher && !approved && (gvDoc === undefined || hvDoc === undefined);
  if (hong) {
    const cu = store.get(SESSION_KEY, null);
    u.__thuLai = (u.__thuLai || 0) + 1;
    if (u.__thuLai <= 20) setTimeout(() => { if (user === u) onUser(u); }, Math.min(5000 * u.__thuLai, 30000));
    if (cu && cu.mail === mail && (cu.isTeacher || cu.approved)) {
      isAdmin = !!cu.isAdmin; isTeacher = !!cu.isTeacher; approved = !!cu.approved; myHv = cu.hv || null;
      if (u.__thuLai === 1) toast("Máy chủ chưa trả lời. Em vẫn vào học được bằng quyền đã lưu trên máy, web sẽ tự thử lại.", "err");
    } else if (tuChoiQuyen) {
      // Bị từ chối quyền đọc: không để "đang kiểm tra" mãi. Hiện rõ hướng xử lý, vẫn tự thử lại ngầm.
      renderLocks("pending"); renderAccount(false);
      if (u.__thuLai === 1) toast("Máy chủ từ chối đọc tài khoản. Em thử tải lại trang (hoặc đăng xuất rồi đăng nhập lại); nếu vẫn vậy, báo anh chị kiểm tra.", "err");
      return;
    } else if (u.__thuLai >= 2) {
      // Đã thử lại mà vẫn chưa đọc được: hiện rõ mã lỗi và nút tải lại, không để "đang kiểm tra" mãi.
      $$("[data-lock]").forEach(el => { el.hidden = false; el.innerHTML = `<h3>Chưa đọc được hồ sơ tài khoản</h3><p class="muted">Máy chủ chưa trả lời (mã: ${esc(tuLoi)}). Web vẫn tự thử lại. Thử tải lại trang; nếu vẫn vậy, chụp màn hình này gửi anh chị.</p><div class="ctas"><button class="btn primary" type="button" onclick="location.reload()">Tải lại ngay</button></div>`; });
      return;
    } else {
      renderLocks("checking");
      if (u.__thuLai === 1) toast("Chưa kiểm tra được tài khoản (mạng hoặc máy chủ chậm). Web đang tự thử lại…", "err");
      return;
    }
  } else u.__thuLai = 0;
  let pending = !isTeacher && !approved && ycDoc ? ycDoc : false;
  // Phiếu lần trước bị máy chủ từ chối: tự gửi lại khi học viên mở web.
  const unsent = !isTeacher && !approved && !ycDoc ? store.get(UNSENT + mail, null) : null;
  if (unsent) {
    try {
      await setDoc(doc(db, "yeucau", mail), { ...unsent, guiLuc: Date.now() });
      store.set(UNSENT + mail, null); dropDraft("nhap-tk-" + mail);
      pending = unsent; guiEmailThongBao(unsent, "Phiếu này trước đó chưa lưu được, nay đã tự gửi lại thành công.");
      toast("Phiếu của em đã gửi được cho anh chị.");
    } catch (e) { /* vẫn lỗi: để lần sau thử tiếp */ }
    if (mail !== (u.email || "").toLowerCase() || user !== u) return;
  }
  const canLearn = isTeacher || approved;
  saveSession(pending);
  renderLocks(canLearn ? "ok" : "pending");
  renderAccount(pending);
  // Theo dõi quyền theo thời gian thực: anh chị vừa duyệt là màn hình học viên tự mở khoá,
  // bị thu hồi thì tự khoá — không phải bấm tải lại.
  const watchRole = (col, has) => unsubs.push(onSnapshot(doc(db, col, mail), d => {
    if (user !== u || d.exists() === has) return;
    if (!has) toast(col === "giaovien" ? "Quản lý đã duyệt anh/chị làm giáo viên!" : "Anh chị đã duyệt! Em vào học được rồi.");
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
    if (tdDoc) { myProgress = { bai: tdDoc.bai || {}, baitap: tdDoc.baitap || {}, xem: tdDoc.xem || {} }; if (tdDoc.anh && !avaTuMay) { myAvatar = tdDoc.anh; try { localStorage.setItem(AVA_KEY(mail), myAvatar); } catch (e) {} } }
    // Tiến độ đồng bộ trực tiếp: học trên điện thoại thì máy tính cũng thấy ngay, không ghi đè lẫn nhau
    listen(doc(db, "tiendo", mail), d => { if (!d.exists()) return; const x = d.data();
      myProgress = { bai: x.bai || {}, baitap: x.baitap || {}, xem: x.xem || {} }; saveData(); renderLessons(); renderHomework(); renderTiles(); });
    listen(doc(db, "nhanxet", mail), d => { troLyDaTai.diem = true; myFeedback = d.exists() ? d.data() : {}; renderHomework(); renderMyProg(); saveData(); });
    listen(doc(db, "anhbaitap", mail), d => { myAnhBT = d.exists() ? d.data() : {}; renderHomework(); });
    // Điểm danh của chính em (lỗi quyền thì im lặng, panel vẫn hiện hướng dẫn)
    unsubs.push(onSnapshot(doc(db, "diemdanh", mail), d => { troLyDaTai.diemDanh = true; myDiemdanh = d.exists() ? d.data() : {}; renderMyProg(); }, () => renderMyProg()));
    renderMyProg();
  }
  listen(query(collection(db, "giaotrinh"), orderBy("thutu")), snap => {
    lessons = snap.docs.filter(d => !d.id.startsWith("_")).map(d => ({ id: d.id, ...d.data() })); renderLessons(); if (isAdmin) { renderRoster(); dongBoBaiHoc(); } saveData(); renderTiles();
  });
  listen(query(collection(db, "baitap"), orderBy("han")), snap => {
    troLyDaTai.bai = true; homework = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework(); saveData(); renderTiles(); if (isAdmin) renderQL();
  });
  if (isTeacher) {
    listen(query(collection(db, "hocvien"), orderBy("duyetLuc", "desc")), snap => {
      roster = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHomework(); if (isAdmin) renderRoster(); renderAttend(); renderLV();
    });
    listen(collection(db, "diemdanh"), snap => {
      diemdanhAll = {}; snap.docs.forEach(d => diemdanhAll[d.id] = d.data()); renderAttend();
    });
    listen(collection(db, "tiendo"), snap => {
      progressAll = {}; snap.docs.forEach(d => progressAll[d.id] = d.data()); renderHomework(); if (isAdmin) { renderRoster(); renderQL(); }
    });
    listen(collection(db, "nhanxet"), snap => {
      feedbackAll = {}; snap.docs.forEach(d => feedbackAll[d.id] = d.data()); renderHomework(); renderAttend();
    });
    listen(collection(db, "anhbaitap"), snap => { anhBaiTapAll = {}; snap.docs.forEach(d => anhBaiTapAll[d.id] = d.data()); renderHomework(); });
  }
  lvStart();
  if (!$("#v-lam-viec").hidden) lvOnShow();
  taiVanHanh().then(m => { if (!m || !user || mail !== (u.email || "").toLowerCase()) return;
    m.batDau({ db, fs: { collection, doc, getDoc, setDoc, deleteDoc, writeBatch, query, orderBy, where, limit, onSnapshot, deleteField }, themHuy: f => unsubs.push(f),
      mail, ten: (!isTeacher && myHv && myHv.ten) || (user && user.displayName) || mail.split("@")[0], isAdmin, isTeacher,
      toast, moHop, nenAnh, homNay: todayVN, giaoVien: () => teachers, hocVien: () => roster });
  });
  if (!isAdmin && !isTeacher) listen(query(collection(db, "dondh"), where("mail", "==", mail)), snap => { donCuaToi = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHvInfo(); });
  if (isAdmin) {
    listen(query(collection(db, "yeucau"), orderBy("guiLuc", "desc")), snap => {
      requests = snap.docs.filter(d => d.id !== mail).map(d => ({ id: d.id, ...d.data() })); renderRequests();
      if (!svChecked) { svChecked = true; checkRules(); }
    });
    listen(collection(db, "dondh"), snap => { donAll = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.tao || 0) - (a.tao || 0)); renderKho(); });
    listen(collection(db, "doiten"), snap => {
      doiTen = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.luc || 0) - (b.luc || 0)); renderDoiTen();
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
    // XP thưởng & thành tựu anh chị trao trên web: ai cũng xem được (hiện ở Top rank)
    onSnapshot(collection(db, "xephang"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      XP_DONG = all.filter(x => x.loai === "xp").map(x => ({ ...x, xp: Number(x.xp) || 0 }));
      TT_DONG = all.filter(x => x.loai === "thanhtuu");
      xhDS = all.sort((a, b) => (b.luc || 0) - (a.luc || 0));
      veTopRank(); dispatchEvent(new Event("xephang-doi"));
      try { renderTiles(); renderMyProg(); renderXHQL(); } catch (e) {}
    }, () => { xhLoi = true; try { renderXHQL(); } catch (e) {} });
    // Bài vẽ anh chị đăng + Top 5 quản lý chọn: ai cũng xem được trên trang chủ
    onSnapshot(collection(db, "baive"), snap => {
      BAIVE_DONG = snap.docs.map(d => ({ id: d.id, ...d.data() })).map(b => ({ ...b, hang: Number(b.hang) || 0 })); baiVeLoi = false;
      // Gom các lần dữ liệu thay đổi liên tiếp (ví dụ khi đang chuyển bài) thành một lần vẽ lại, tránh ảnh chớp
      clearTimeout(baiHen); baiHen = setTimeout(() => { renderGallery(); veTopRank(); dispatchEvent(new Event("baive-doi")); }, 250);
      try { renderTop5(); renderTiles(); } catch (e) {}    }, () => { baiVeLoi = true; try { renderTop5(); } catch (e) {} });
    // Bản tin nổi bật
    onSnapshot(collection(db, "bantin"), snap => { BANTIN_DONG = snap.docs.map(d => ({ id: d.id, ...d.data() })); banTinLoi = false; renderBanTin(); },
      () => { banTinLoi = true; });
  } catch (e) {
    // Đã có quyền lưu trên máy: không chặn bài học, chỉ báo nhẹ. Chưa có quyền thì hiện khung báo mạng yếu.
    const coQuyen = cachedSession && cachedSession.mail && (cachedSession.isTeacher || cachedSession.approved);
    if (coQuyen) toast("Mạng yếu: em vẫn học được bài đã lưu trên máy. Có mạng lại, web tự cập nhật.", "err");
    else $$("[data-lock]").forEach(el => { el.hidden = false; el.innerHTML = `<h3>Chưa kết nối được máy chủ</h3><p class="muted">Mạng đang yếu. Có mạng lại, trang sẽ tự tải lại.</p><div class="ctas"><button class="btn primary" type="button" onclick="location.reload()">Tải lại ngay</button></div>`; });
    $("#login-status").textContent = "Mạng đang yếu nên chưa mở được đăng nhập. Có mạng lại, trang sẽ tự tải lại.";
    addEventListener("online", () => location.reload(), { once: true });
    return;
  }
  onAuthStateChanged(auth, onUser);
  $("#btn-switch").onclick = async () => {
    const prev = mail;
    await signOut(auth);
    // Máy dùng chung: xoá bản nháp, phiếu chưa gửi, ghi chú bàn giao, giỏ hàng, ảnh đại diện của người vừa đăng xuất
    try { Object.keys(localStorage).filter(k => /^(nhap-|phieu-chua-gui-|vh-bg-nhap-|lvtt-gio|lvtt-avatar:|lvkv-dulieu-|lvkv-moc-thi)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
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
    "auth/operation-not-allowed": "Đăng nhập bằng mật khẩu chưa được bật. Anh chị vào Firebase → Authentication → Sign-in method → Email/Password → Enable → Save.",
    "auth/configuration-not-found": "Firebase Authentication chưa được bật. Anh chị vào Firebase → Authentication → Get started → bật Email/Password.",
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
  i.type = show ? "text" : "password"; matNut($("#pw-show"), show);
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
  $("#pw-chao-h").textContent = isNew ? "Tạo tài khoản mới" : "Chào mừng trở lại!";
  $("#pw-chao-p").textContent = isNew ? "Tham gia cộng đồng học vẽ cùng Thạch Thất." : "Đăng nhập để tiếp tục hành trình học vẽ cùng nhau.";
}
const matNut = (b, hien) => { b.setAttribute("aria-pressed", hien); b.setAttribute("aria-label", hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"); };
$$(".pw-doi").forEach(b => b.onclick = () => { $("#tab-" + b.dataset.tab).click(); $("#pw-box").scrollIntoView({ block: "start", behavior: "smooth" }); });
$("#tab-new").onclick = () => showTab("new");
$("#tab-in").onclick = () => { showTab("in"); if (!$("#pw-mail").value && $("#nw-mail").value) $("#pw-mail").value = $("#nw-mail").value.trim(); };
// Máy này từng đăng nhập: mở sẵn mục Đăng nhập và điền sẵn Gmail.
const lastMail = store.get(LAST_MAIL, "");
if (lastMail) { $("#pw-mail").value = lastMail; showTab("in"); } else showTab("new");

let setpassMail = "";
function nwSay(t, err) { const st = $("#nw-status"); st.textContent = t; st.classList.toggle("err", !!err); }
$("#nw-show").onclick = () => {
  const show = $("#nw-pass").type === "password";
  ["#nw-pass", "#nw-pass2"].forEach(id => $(id).type = show ? "text" : "password");
  matNut($("#nw-show"), show);
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
        setpassMail = m; $("#nw-setpass").hidden = false; $("#pw-mail").value = m;
      } else nwSay(pwError(e), true);
    }
  }, nwSay);
});
$("#nw-setpass").onclick = () => {
  const m = setpassMail || $("#nw-mail").value.trim().toLowerCase();
  if (!okMail(m)) { nwSay("Em gõ lại Gmail rồi bấm Tạo tài khoản một lần nữa nhé.", true); $("#nw-mail").focus(); return; }
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
let verifyTimer = null, verifyTu = 0;
async function checkVerified(manual) {
  const u = auth && auth.currentUser; if (!u || !needVerify) return;
  const st = $("#verify-status");
  try { await u.reload(); } catch (e) { if (manual) { st.textContent = "Mạng yếu, thử lại nhé."; st.classList.add("err"); } return; }
  if (auth.currentUser && auth.currentUser.emailVerified) {
    clearTimeout(verifyTimer);
    try { await auth.currentUser.getIdToken(true); } catch (e) {}
    st.textContent = ""; toast("Đã xác nhận Gmail! Làm tiếp bước 2 nhé.");
    onUser(auth.currentUser);
  } else if (manual) {
    st.textContent = "Chưa thấy xác nhận. Em mở thư trong Gmail và bấm vào link nhé (xem cả mục Thư rác)."; st.classList.add("err");
  }
}
// Nhịp thưa dần: 5 giây trong phút đầu, rồi 30 giây, dừng hẳn sau 10 phút.
// Quay lại tab là kiểm tra ngay và chạy lại, nên không bỏ sót mà cũng không gọi máy chủ cả buổi.
function watchVerify() {
  clearTimeout(verifyTimer); verifyTu = Date.now();
  const nhip = () => {
    if (!needVerify) { clearTimeout(verifyTimer); return; }
    const troi = Date.now() - verifyTu;
    if (troi > 6e5) return;
    if (document.visibilityState === "visible") checkVerified(false);
    verifyTimer = setTimeout(nhip, troi < 6e4 ? 5000 : 30000);
  };
  verifyTimer = setTimeout(nhip, 5000);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && needVerify) { checkVerified(false); watchVerify(); }
});
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
/* Đăng ký tài khoản: lưu vào Firebase + gửi email báo cho anh chị */
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
  if (!v("#rg-ten")) return bad("Em chưa điền họ và tên.", "#rg-ten");
  if (!gv && !/^(19|20)\d{2}$/.test(v("#rg-nam"))) return bad("Em chọn năm sinh nhé.", "#rg-nam");
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
    toast("Đã gửi cho anh chị. Anh chị duyệt xong, trang tự mở khoá.");
    // Bấm gửi nhiều lần (hoặc sửa mà không đổi gì) thì không gửi email trùng cho anh chị.
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
      st.textContent = "Máy chủ của lớp đang chưa nhận phiếu (lỗi cài đặt phía anh chị, không phải lỗi của em). Anh chị đã được báo qua email. Lần sau em mở lại trang này, phiếu sẽ tự gửi lại.";
      guiEmailThongBao(data, "PHIẾU CHƯA LƯU ĐƯỢC LÊN WEB (mã lỗi: " + code + "). Anh chị mở trang Duyệt học viên để xem cách sửa.");
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
    : "Bố mẹ em đã đồng ý cho em gửi thông tin này. Chỉ anh chị của lớp xem được.";
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
  if (!approved && !isTeacher) toast("Anh chị chưa duyệt. Khi anh chị duyệt, trang này tự mở khoá, em không cần bấm lại.");
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

submitTo($("#f-gv"), $("#gv-status"), "Đang trao quyền…", "Đã trao quyền giáo viên. Người này đăng nhập Gmail đó là có quyền giáo viên.", () => {
  const g = $("#gv-mail").value.trim().toLowerCase();
  return setDoc(doc(db, "giaovien", g), { ten: $("#gv-ten").value.trim(), gmail: g, sdt: "", coso: $("#gv-cs").value, ghiChu: "", duyetLuc: Date.now() }, { merge: true });
});

/* ---------- Nạp giáo trình có sẵn ---------- */
$("#btn-seed").onclick = async () => {
  const st = $("#seed-status"); st.textContent = "Đang nạp…";
  // Chỉ tải giáo trình mẫu khi anh chị bấm nạp (đỡ nặng trang cho mọi người khác)
  const { GIAO_TRINH_MAU } = await import("../../data/giao-trinh-mau.js?v=20261010bf");
  const { BAN, BAI_HOC } = await import("../../data/bai-hoc.js?v=20261010bf");
  const batch = writeBatch(db);
  GIAO_TRINH_MAU.forEach(([id, khoa, ten, loai, thutu, buoc, ghichu]) => batch.set(doc(db, "giaotrinh", id), { khoa, ten, loai, thutu, buoc, ghichu }));
  BAI_HOC.forEach(({ id, ...d }) => batch.set(doc(db, "giaotrinh", id), { ...d, buoc: [], ghichu: "" }));
  batch.set(doc(db, "giaotrinh", "_meta"), { ban: BAN, daxoa: [] });
  try { await timed("Nạp giáo trình", batch.commit()); st.textContent = `Đã nạp ${GIAO_TRINH_MAU.length + BAI_HOC.length} bài vào giáo trình.`; }
  catch (e) { st.textContent = "Chưa nạp được. Kiểm tra đã dán luật bảo mật (firestore.rules) chưa."; }
};

/* =====================================================================
   ĐĂNG BÀI VẼ HỌC VIÊN · TOP 5 NỔI BẬT · BẢN TIN · TRANG QUẢN LÝ
   - Giáo viên + quản lý: đăng ảnh bài vẽ (chọn loại bài), đăng bản tin.
   - Chỉ quản lý: chọn Top 1–5 bài nổi bật tuần, ghim bản tin, xem % đỗ.
   Ảnh được thu nhỏ ngay trên máy rồi lưu vào Firestore (không cần cấu hình kho tệp).
   ===================================================================== */
function capNhatVaiTro() {
  const k = [!!user, isTeacher, isAdmin, mail].join("|");
  if (k === capNhatVaiTro.k) return; capNhatVaiTro.k = k;
  setTimeout(() => { renderGallery(); renderBanTin(); dispatchEvent(new Event("vaitro-doi")); }, 0); // chờ cả file tải xong
}
// Thu nhỏ ảnh để vừa giới hạn 1 MB của Firestore
function nenAnh(file, max = 1400, gioiHan = 850000) {
  return new Promise((ok, loi) => {
    if (!file || !/^image\//.test(file.type || "image/")) return loi(new Error("Chọn một tấm ảnh nhé."));
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(u);
      const w = img.naturalWidth, h = img.naturalHeight; let k = Math.min(1, max / Math.max(w, h)), q = .86, out = "";
      const cv = document.createElement("canvas");
      for (let lan = 0; lan < 10; lan++) {
        cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
        out = cv.toDataURL("image/jpeg", q);
        if (out.length <= gioiHan) return ok(out);
        if (q > .62) q -= .08; else k *= .82;
      }
      ok(out);
    };
    img.onerror = () => { URL.revokeObjectURL(u); loi(new Error("Không mở được ảnh này, thử ảnh khác.")); };
    img.src = u;
  });
}
// Hộp thoại dùng chung (bottom sheet trên điện thoại)
function moHop(html, nhan = "Hộp thoại") {
  const ov = document.createElement("div"); ov.className = "hop-ov";
  ov.innerHTML = `<div class="hop" role="dialog" aria-modal="true" aria-label="${esc(nhan)}"><button type="button" class="hop-x" data-dong aria-label="Đóng">✕</button>${html}</div>`;
  document.body.append(ov); document.body.classList.add("hop-mo");
  let tha = voiQuayLai(() => { tha = null; dong(); });
  const dong = diLink => { ov.remove(); if (!$(".hop-ov")) document.body.classList.remove("hop-mo"); if (tha) { const f = tha; tha = null; f(diLink === true); } };
  ov.addEventListener("click", e => { if (e.target === ov || e.target.closest("[data-dong]")) dong(); else if (e.target.closest("a[href^='#']")) dong(true); });
  const esc2 = e => { if (e.key === "Escape") { dong(); removeEventListener("keydown", esc2); } }; addEventListener("keydown", esc2);
  return { el: ov.querySelector(".hop"), dong };
}
const linkHopLe = v => !v || /^https?:\/\/\S+$/i.test(v);
const tuanNay = b => b.hang >= 1 && b.hang <= 5 && b.ngayTop && (Date.parse(todayVN()) - Date.parse(b.ngayTop)) / 864e5 < 7;

/* ---------- Đăng bài vẽ học viên ---------- */
// Menu ⋮ của quản lý trên thẻ bài nổi bật: sửa thông tin/link hoặc xoá bài (xoá phải bấm 2 lần)
let menuBai = null;
function moMenuBai(anchor, bai, loai = "baive") {
  if (menuBai) { const cu = menuBai; cu.remove(); menuBai = null; if (cu.dataset.cho === bai?.id) return; }
  if (!bai || !isAdmin) return;
  const m = document.createElement("div"); m.className = "nb-menu"; m.dataset.cho = bai.id;
  m.innerHTML = `<button type="button" data-sua>✏️ Sửa thông tin & link</button><button type="button" data-xoa>🗑 Xoá bài này</button>`;
  document.body.append(m); menuBai = m;
  const r = anchor.getBoundingClientRect();
  m.style.top = Math.min(r.bottom + 6, innerHeight - 140) + "px";
  m.style.left = Math.max(8, Math.min(r.right - 200, innerWidth - 208)) + "px";
  const fin = () => { m.remove(); if (menuBai === m) menuBai = null; removeEventListener("pointerdown", ngoai, true); };
  const ngoai = e => { if (!m.contains(e.target) && e.target !== anchor) fin(); };
  setTimeout(() => addEventListener("pointerdown", ngoai, true), 0);
  m.querySelector("[data-sua]").onclick = () => { fin(); if (loai === "tin") moDangTin(bai); else moDangBai(bai); };
  const xoa = m.querySelector("[data-xoa]");
  const tenXoa = loai === "tin" ? "bantin" : "baive";
  confirmButton(xoa, () => deleteDoc(doc(db, tenXoa, bai.id)).then(() => { fin(); toast(loai === "tin" ? "Đã xoá bản tin." : "Đã xoá bài vẽ."); }), "Bấm lần nữa để xoá");
}
// sua: bài đang có (quản lý bấm "Sửa"); không có thì là đăng bài mới
function moDangBai(sua) {
  if (!(user && isTeacher && db)) { toast("Đăng nhập tài khoản giáo viên hoặc quản lý để đăng bài.", "err"); location.hash = "#tai-khoan"; return; }
  if (sua && !isAdmin) return;
  const tenHV = [...new Set([...roster.map(r => r.ten), ...galTatCa().map(b => b.hocVien)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const s = sua || {};
  const { el, dong } = moHop(`<h3>${sua ? "Sửa thông tin bài vẽ" : "Đăng bài vẽ học viên"}</h3>
    <form id="f-bv" class="hop-f" novalidate>
      <label class="anh-chon" for="bv-anh"><img id="bv-xem" alt="" ${sua ? `src="${esc(s.anh)}"` : "hidden"}><span id="bv-chu" ${sua ? "hidden" : ""}><b>📷 Chọn ảnh bài vẽ</b><small>Chụp thẳng, đủ sáng, không lệch khung</small></span><input id="bv-anh" type="file" accept="image/*"></label>
      ${sua ? `<p class="muted hop-ghi">Muốn đổi ảnh thì bấm vào ảnh và chọn ảnh mới.</p>` : ""}
      <label>Họ và tên *<input id="bv-ten" list="bv-ds" maxlength="80" autocomplete="off" placeholder="VD: Nguyễn Văn An" value="${esc(s.hocVien || "")}"></label>
      <datalist id="bv-ds">${tenHV.map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <fieldset class="chon-loai"><legend>Đây là bài gì? *</legend>${LOAI_BAI.map(l => `<label><input type="radio" name="bv-loai" value="${esc(l.ten)}"${s.loai === l.ten ? " checked" : ""}><span>${esc(l.ten)}</span></label>`).join("")}</fieldset>
      <label>Người vẽ là<select id="bv-vaitro">${["Học viên", "Trợ giảng", "Giáo viên", "Quản lý"].map(v => `<option${(s.chucVu || "Học viên") === v ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Biệt danh (không bắt buộc)<input id="bv-bidanh" maxlength="30" autocomplete="off" placeholder="VD: Anh Gấu, Chị Mây" value="${esc(biDanhCua(s))}"></label>
      <label>Ghi chú<input id="bv-gc" maxlength="120" placeholder="VD: Bố cục màu tuần 3 · 8,5 điểm" value="${esc(s.ghiChu || "")}"></label>
      <label>Mô tả ngắn bức tranh (không bắt buộc)<textarea id="bv-mota" maxlength="300" rows="3" placeholder="VD: Tĩnh vật bình hoa huệ và chai thủy tinh, bố cục chéo, sáng tối mạnh ở thân bình">${esc(s.moTa || "")}</textarea></label>
      <label>Giáo viên hướng dẫn<input id="bv-gvhd" list="bv-gv" maxlength="80" autocomplete="off" placeholder="VD: Nguyễn Văn Hùng" value="${esc(s.gvhd || "")}"></label>
      <label>Trợ giảng<input id="bv-tg" list="bv-gv" maxlength="80" autocomplete="off" placeholder="VD: Đỗ Hữu Trường" value="${esc(s.tgiang || "")}"></label>
      <datalist id="bv-gv">${GIAO_VIEN.map(g => `<option value="${esc(g.ten)}">`).join("")}</datalist>
      <label>Link kèm theo (không bắt buộc)<input id="bv-link" type="url" inputmode="url" maxlength="300" placeholder="https://… (video, bài đăng Facebook)" value="${esc(s.link || "")}"></label>
      ${isAdmin ? `<label class="check"><input type="checkbox" id="bv-mau"${s.mau ? " checked" : ""}> Bài mẫu giáo viên (hiện trong Bài nổi bật)</label>` : ""}
      ${sua ? "" : isAdmin ? `<label>Đưa lên Bài vẽ nổi bật<select id="bv-top"><option value="0">Không — chỉ vào mục Bài vẽ học viên</option>${[1, 2, 3, 4, 5].map(k => `<option value="${k}">Top ${k} tuần này</option>`).join("")}</select></label>`
        : `<p class="muted hop-ghi">Bài vào mục <b>Bài vẽ học viên</b>. Quản lý sẽ chọn Top 5 bài nổi bật mỗi tuần.</p>`}
      <div class="hop-nut"><button class="btn primary" type="submit" id="bv-gui">${sua ? "Lưu thay đổi" : "Đăng bài"}</button><button class="btn" type="button" data-dong>Huỷ</button></div>
      <p class="status" id="bv-st" role="status"></p>
    </form>`, sua ? "Sửa bài vẽ" : "Đăng bài vẽ học viên");
  let anh = sua ? sua.anh : "";
  const f = el.querySelector("#bv-anh"), st = el.querySelector("#bv-st");
  f.onchange = async () => {
    const file = f.files && f.files[0]; if (!file) return;
    st.textContent = "Đang thu nhỏ ảnh…"; st.classList.remove("err");
    try { anh = await nenAnh(file); const im = el.querySelector("#bv-xem"); im.src = anh; im.hidden = false; el.querySelector("#bv-chu").hidden = true; st.textContent = ""; }
    catch (e) { anh = ""; st.textContent = e.message; st.classList.add("err"); }
  };
  el.querySelector("#f-bv").onsubmit = async e => {
    e.preventDefault(); st.classList.remove("err");
    const hocVien = el.querySelector("#bv-ten").value.trim(), loai = (el.querySelector('[name="bv-loai"]:checked') || {}).value || "";
    const link = el.querySelector("#bv-link").value.trim(), top = Number((el.querySelector("#bv-top") || {}).value || 0);
    const loi = !anh ? "Chưa chọn ảnh bài vẽ." : !hocVien ? "Nhập họ và tên." : !loai ? "Chọn đây là bài gì (Màu, Tượng…)." : !linkHopLe(link) ? "Link phải bắt đầu bằng https://" : "";
    if (loi) { st.textContent = loi; st.classList.add("err"); return; }
    const nut = el.querySelector("#bv-gui"); nut.disabled = true; st.textContent = "Đang đăng…";
    const gvhd = el.querySelector("#bv-gvhd").value.trim(), tgiang = el.querySelector("#bv-tg").value.trim();
    const moTa = el.querySelector("#bv-mota").value.trim(), ghiChu = el.querySelector("#bv-gc").value.trim();
    const biDanh = el.querySelector("#bv-bidanh").value.trim(), chucVu = el.querySelector("#bv-vaitro").value || "Học viên";
    const mauEl = el.querySelector("#bv-mau");
    if (sua) {
      // Quản lý sửa thông tin: giữ nguyên người đăng, ngày đăng và hạng Top của bài
      const patch = { anh, hocVien, loai, ghiChu, link, moTa, chucVu, biDanh, gvhd, tgiang, mau: !!(mauEl && mauEl.checked) };
      try {
        await timed("Sửa bài vẽ", setDoc(doc(db, "baive", sua.id), patch, { merge: true }));
        toast("Đã lưu thông tin bài vẽ."); dong();
      } catch (err) {
        nut.disabled = false; st.classList.add("err");
        st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho sửa: quản lý cần dán luật bảo mật mới (firestore.rules) một lần." : "Chưa lưu được, kiểm tra mạng rồi thử lại.";
      }
      return;
    }
    const ref = doc(collection(db, "baive"));
    const data = { anh, hocVien, loai, ghiChu, link, ngay: todayVN(), hang: 0, ngayTop: "", nguoi: mail, tenNguoi: tenToi(), luc: Date.now() };
    if (gvhd) data.gvhd = gvhd; if (tgiang) data.tgiang = tgiang; // ghi khi có điền
    if (moTa) data.moTa = moTa;
    data.chucVu = chucVu;
    if (biDanh) data.biDanh = biDanh;
    if (isAdmin && mauEl && mauEl.checked) data.mau = true;
    try {
      await timed("Đăng bài vẽ", setDoc(ref, data));
      if (isAdmin && top) await datTop(ref.id, top);
      else if (isAdmin) thongBaoTuDong("🖼 Bài vẽ mới trên web", `${hocVien} · ${loai} vừa được đăng lên Bài vẽ học viên. Xem trong mục Bài vẽ học viên.`);
      toast(top ? `Đã đăng và đưa lên Top ${top} tuần.` : "Đã đăng bài vẽ lên web."); dong();
    } catch (err) {
      nut.disabled = false; st.classList.add("err");
      st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho đăng: quản lý cần dán luật bảo mật mới (firestore.rules) một lần." : "Chưa đăng được, kiểm tra mạng rồi thử lại.";
    }
  };
}
// Chuyển 18 bài/bản tin viết sẵn trong file dữ liệu thành bài đăng web (Firestore) để quản lý sửa, xoá được.
// Chạy trên máy quản lý khi mở web; mỗi mục có mã cố định nên không tạo trùng; chạy xong một lần thì thôi.
let dangChuyenWeb = false;
async function chuyenBaiTinhSangWeb() {
  if (!isAdmin || !db || !mail || dangChuyenWeb || localStorage.getItem("lvkv-chuyen-web-v1")) return;
  dangChuyenWeb = true;
  const layFile = async u => { const bl = await (await fetch(new URL(u, location.href))).blob(); return new File([bl], "anh.jpg", { type: bl.type || "image/jpeg" }); };
  const ds = [
    ...BAI_VE.map((b, i) => ({ kind: "baive", id: "seed-ve-" + i, b })).filter(x => x.b.anh),
    ...BAI_NOI_BAT.map((b, i) => ({ kind: "baive", id: "seed-nb-" + i, b })).filter(x => !x.b.trung),
    ...BAN_TIN.map((t, i) => ({ kind: "bantin", id: "seed-tin-" + i, t })),
  ];
  let xong = 0, loi = 0; const loiTen = [];
  for (const x of ds) {
    try {
      const ref = doc(db, x.kind, x.id);
      if ((await getDoc(ref)).exists()) { xong++; continue; }
      if (x.kind === "baive") {
        const b = x.b, anh = await nenAnh(await layFile(b.anh));
        const data = { anh, hocVien: b.hocVien || "", loai: b.loai, ghiChu: b.ghiChu || "", link: "", ngay: b.ngay || "", hang: 0, ngayTop: "",
          nguoi: mail, tenNguoi: tenToi(), luc: Date.parse((b.ngay || "2026-10-09") + "T08:00:00+07:00") || Date.now() };
        if (b.hang) { data.hang = b.hang; data.ngayTop = b.ngay; }
        if (b.tg) data.chucVu = "Trợ giảng";
        await setDoc(ref, data);
      } else {
        const t = x.t, data = { muc: t.muc || "tinlop", tieuDe: t.tieuDe, nd: t.nd || "", link: t.link || "", tacGia: mail, tenTacGia: tenToi(),
          ghim: !!t.ghim, luc: Date.parse((t.ngay || "2026-10-09") + "T08:00:00+07:00") || Date.now() };
        if (t.anh) data.anh = await nenAnh(await layFile(t.anh), 1100, 450000);
        await setDoc(ref, data);
      }
      xong++;
    } catch (e) { loi++; loiTen.push(x.b ? x.b.hocVien || x.b.loai : x.t ? x.t.tieuDe : x.id); console.warn("Chưa chuyển được", x.id, e); }
  }
  dangChuyenWeb = false;
  if (!loi) { try { localStorage.setItem("lvkv-chuyen-web-v1", "1"); } catch (e) {} toast(`Đã chuyển ${xong} mục sang bài đăng web.`); }
  else toast(`Mới chuyển được ${xong} mục, còn ${loi} mục lỗi (${loiTen.slice(0, 3).join(", ")}). Tải lại trang để thử tiếp.`, "err");
}
// Quản lý đặt hạng Top k cho một bài (k = 0: bỏ khỏi Top). Mỗi vị trí trong tuần chỉ có 1 bài.
async function datTop(id, k) {
  const b = writeBatch(db), hom = todayVN();
  if (k) {
    // Đưa bài vào Top k: bài đang ở Top k bị đẩy xuống Top k+1, bài ở k+1 đẩy tiếp; Top 5 bị đẩy thì bỏ khỏi Top.
    const theo = {}; BAIVE_DONG.filter(x => x.id !== id && tuanNay(x) && x.hang >= 1 && x.hang <= 5).forEach(x => theo[x.hang] = x);
    const doi = []; let dang = id, vt = k;
    while (true) {
      doi.push([dang, vt]);
      const occ = theo[vt];
      if (!occ) break;
      if (vt >= 5) { doi.push([occ.id, 0]); break; }
      dang = occ.id; vt += 1;
    }
    doi.forEach(([x, h]) => b.set(doc(db, "baive", x), h ? { hang: h, ngayTop: hom } : { hang: 0, ngayTop: "" }, { merge: true }));
  } else b.set(doc(db, "baive", id), { hang: 0, ngayTop: "" }, { merge: true });
  const kq = await timed("Chọn Top", b.commit());
  if (k) { const x = BAIVE_DONG.find(y => y.id === id) || {};
    thongBaoTuDong(`🏆 Top ${k} tuần này`, `${x.hocVien || "Một bài vẽ"}${x.loai ? " · " + x.loai : ""} vừa được chọn vào Top ${k} tuần. Xem trong mục Bài nổi bật.`); }
  return kq;
}

/* ---------- Bản tin nổi bật ---------- */
const MUC_TIN = { tuyensinh: "Tuyển sinh", tinlop: "Thông báo lớp", hoacu: "Hoạ cụ", lythuyet: "Lý thuyết", kinhnghiem: "Kinh nghiệm thi" };
let tnLoc = "all";
function banTinTatCa() {
  const t = x => x.luc || Date.parse((x.ngay || "1970-01-01") + "T08:00:00+07:00") || 0;
  return [...BANTIN_DONG.filter(t => !String(t.id).startsWith("seed-")), ...BAN_TIN.map((x, i) => ({ ...x, id: "", codinh: i }))].sort((a, b) => (b.ghim ? 1 : 0) - (a.ghim ? 1 : 0) || t(b) - t(a));
}
// "Tin nổi bật" ngay dưới mục Về lớp: vòng xoay tin tuyển sinh, thông báo, bài đăng (bấm thẻ giữa để mở link)
// Bản tin nổi bật: một mục duy nhất, hiển thị dạng vòng xoay như dải tin cũ.
// Lọc theo chuyên mục; quản lý có nút ⋮ để sửa hoặc xoá; giáo viên có ô "+" để đăng tin.
let tnSig = "";
function renderBanTin() {
  const box = $("#tn-grid"); if (!box) return;
  { const n = $("#tn-them"); if (n) n.hidden = !(user && isTeacher); }
  const all = banTinTatCa(), co = Object.keys(MUC_TIN).filter(k => all.some(x => x.muc === k));
  if (tnLoc !== "all" && !co.includes(tnLoc)) tnLoc = "all";
  $("#tn-loc").innerHTML = co.length > 1 ? [`<button class="tab" data-tn="all" aria-selected="${tnLoc === "all"}">Tất cả</button>`, ...co.map(k => `<button class="tab" data-tn="${k}" aria-selected="${tnLoc === k}">${MUC_TIN[k]}</button>`)].join("") : "";
  $$("#tn-loc [data-tn]").forEach(b => b.onclick = () => { tnLoc = b.dataset.tn; renderBanTin(); });

  const ds = all.filter(x => tnLoc === "all" || x.muc === tnLoc), them = !!(user && isTeacher);
  const k = [tnLoc, them, isAdmin, ...ds.map(x => (x.id || "c" + x.codinh) + (x.tieuDe || "") + (x.anh || "") + (x.ghim ? 1 : 0))].join("|");
  if (k === tnSig) return; tnSig = k;

  const ngayCua = x => x.luc ? fmtDate(x.luc) : x.ngay ? ngayVN(x.ngay) : "";
  const the = (x, i) => `<figure class="nb-card tb-the${x.anh ? " co-anh" : ""}" data-i="${i}">
      ${x.anh ? `<img src="${esc(x.anh)}" alt="" loading="lazy" decoding="async" draggable="false">` : `<span class="tb-nen m-${esc(x.muc || "tinlop")}" aria-hidden="true"></span>`}
      ${isAdmin && x.id ? `<button type="button" class="nb-more" data-mt="${esc(x.id)}" aria-label="Tuỳ chọn: sửa hoặc xoá bản tin">⋮</button>` : ""}
      <div class="tb-the-nd"><span class="tb-chip"><span class="tn-muc m-${esc(x.muc || "tinlop")}">${esc(MUC_TIN[x.muc] || "Tin của lớp")}</span>${x.ghim ? `<span class="tn-ghim">📌 Ghim</span>` : ""}</span>
        <b>${esc(x.tieuDe || "")}</b><small>${esc(String(x.nd || "").split(/\n/)[0].slice(0, 120))}${String(x.nd || "").length > 120 ? "…" : ""}</small>
        <span class="tb-mo">${"Xem chi tiết →"} <em class="num">${ngayCua(x)}</em></span></div></figure>`;
  const n = ds.length + (them ? 1 : 0);
  box.innerHTML = n ? `<div class="gv-ring tb-ring" aria-roledescription="vòng xoay" aria-label="Bản tin nổi bật"><div class="gv-stage tb-stage">${ds.map(the).join("")}
      ${them ? `<figure class="nb-card nb-add tb-the" data-i="${ds.length}" data-add="1"><div class="nb-add-in"><span class="nb-plus" aria-hidden="true">+</span><b>Đăng tin mới</b><small>Tin tuyển sinh, thông báo, hoạ cụ…<br>Có thể kèm ảnh và link</small></div></figure>` : ""}</div>
      <div class="gv-ctl"><button type="button" class="gv-nav" aria-label="Tin trước">‹</button><div class="gv-dots">${Array.from({ length: n }, (_, i) => `<button type="button" data-i="${i}" aria-label="Tin ${i + 1}"></button>`).join("")}</div><button type="button" class="gv-nav" aria-label="Tin sau">›</button></div></div>`
    : `<p class="muted">Chưa có bản tin trong mục này.</p>`;
  if (!n) return;

  const ring = box.querySelector(".tb-ring"), [p2, n2] = ring.querySelectorAll(".gv-nav");
  ring.querySelectorAll(".nb-more[data-mt]").forEach(bt => {
    bt.addEventListener("pointerdown", e => e.stopPropagation());
    bt.addEventListener("click", e => { e.stopPropagation(); e.preventDefault(); moMenuBai(bt, BANTIN_DONG.find(y => y.id === bt.dataset.mt), "tin"); });
  });
  vongXoay(ring, ring.querySelector(".tb-stage"), [...ring.querySelectorAll(".tb-the")], [...ring.querySelectorAll(".gv-dots button")], p2, n2, c => {
    if (c.dataset.add) { moDangTin(); return; }
    moBanTin(ds[Number(c.dataset.i)]);
  });
}
// Mở một bản tin: luôn hiện nội dung trong hộp; link ngoài (chỉ https) thành nút "Mở link" bên trong. Tin chỉ có link nội bộ, không nội dung → đi thẳng tới mục đó
function moBanTin(x) {
  if (!x) return;
  const ngoai = linkAnToan(x.link);
  if (x.link && x.link.startsWith("#") && !x.nd) { location.hash = x.link; return; }
  const doan = t => esc(t || "").split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join("");
  moHop(`<p class="tn-dau"><span class="tn-muc m-${esc(x.muc || "tinlop")}">${esc(MUC_TIN[x.muc] || "Tin của lớp")}</span></p>
    <h3>${esc(x.tieuDe || "")}</h3>
    ${x.anh ? `<img class="tn-anh" src="${esc(x.anh)}" alt="" loading="lazy" decoding="async">` : ""}
    <div class="tn-text mo">${doan(x.nd)}</div>
    <p class="muted tn-meta">${esc(x.tenTacGia || "Lớp Vẽ Thạch Thất")} · ${x.luc ? fmtDate(x.luc) : x.ngay ? ngayVN(x.ngay) : ""}</p>
    <div class="hop-nut">${ngoai ? `<a class="btn primary" href="${esc(ngoai)}" target="_blank" rel="noopener">Mở link ↗</a>` : x.link && x.link.startsWith("#") ? `<a class="btn primary" href="${esc(x.link)}">Xem mục này →</a>` : ""}<button class="btn" type="button" data-dong>Đóng</button></div>`);
}
// sua: bản tin đang có (quản lý bấm ⋮ → Sửa); không có thì là đăng tin mới
function moDangTin(sua) {
  if (!(user && isTeacher && db)) { toast("Đăng nhập tài khoản giáo viên hoặc quản lý để đăng bản tin.", "err"); location.hash = "#tai-khoan"; return; }
  if (sua && !isAdmin) return;
  const s = sua || {};
  const { el, dong } = moHop(`<h3>${sua ? "Sửa bản tin" : "Đăng bản tin"}</h3>
    <form id="f-tin" class="hop-f" novalidate>
      <fieldset class="chon-loai"><legend>Chuyên mục *</legend>${Object.entries(MUC_TIN).map(([k, v], i) => `<label><input type="radio" name="tn-muc" value="${k}"${(s.muc ? s.muc === k : i === 0) ? " checked" : ""}><span>${v}</span></label>`).join("")}</fieldset>
      <label>Tiêu đề *<input id="tn-td" maxlength="120" placeholder="VD: ĐH Kiến trúc thay đổi phương thức tuyển sinh 2027" value="${esc(s.tieuDe || "")}"></label>
      <label>Nội dung *<textarea id="tn-nd" rows="6" maxlength="3000" placeholder="Viết ngắn gọn, mỗi ý một dòng.">${esc(s.nd || "")}</textarea></label>
      <label class="anh-chon nho" for="tn-anh"><img id="tn-xem" alt="" ${s.anh ? `src="${esc(s.anh)}"` : "hidden"}><span id="tn-chu" ${s.anh ? "hidden" : ""}><b>🖼 Thêm ảnh (không bắt buộc)</b></span><input id="tn-anh" type="file" accept="image/*"></label>
      <label>Link (không bắt buộc)<input id="tn-link" type="url" inputmode="url" maxlength="300" placeholder="https://…" value="${esc(s.link || "")}"></label>
      ${isAdmin ? `<label class="check"><input type="checkbox" id="tn-ghim"${s.ghim ? " checked" : ""}> Ghim lên đầu mục Bản tin</label>` : ""}
      <div class="hop-nut"><button class="btn primary" type="submit" id="tn-gui">${sua ? "Lưu thay đổi" : "Đăng bản tin"}</button><button class="btn" type="button" data-dong>Huỷ</button></div>
      <p class="status" id="tn-st" role="status"></p>
    </form>`, sua ? "Sửa bản tin" : "Đăng bản tin");
  let anh = s.anh || ""; const st = el.querySelector("#tn-st"), f = el.querySelector("#tn-anh");
  f.onchange = async () => { const file = f.files && f.files[0]; if (!file) return; st.textContent = "Đang thu nhỏ ảnh…";
    try { anh = await nenAnh(file, 1100, 450000); const im = el.querySelector("#tn-xem"); im.src = anh; im.hidden = false; el.querySelector("#tn-chu").hidden = true; st.textContent = ""; }
    catch (e) { anh = ""; st.textContent = e.message; } };
  el.querySelector("#f-tin").onsubmit = async e => {
    e.preventDefault(); st.classList.remove("err");
    const tieuDe = el.querySelector("#tn-td").value.trim(), nd = el.querySelector("#tn-nd").value.trim(), link = el.querySelector("#tn-link").value.trim();
    const loi = !tieuDe ? "Nhập tiêu đề." : !nd ? "Nhập nội dung." : !linkHopLe(link) ? "Link phải bắt đầu bằng https://" : "";
    if (loi) { st.textContent = loi; st.classList.add("err"); return; }
    const nut = el.querySelector("#tn-gui"); nut.disabled = true; st.textContent = "Đang đăng…";
    if (sua) {
      try {
        const patch = { muc: (el.querySelector('[name="tn-muc"]:checked') || {}).value || "tinlop", tieuDe, nd, link, anh };
        if (isAdmin) patch.ghim = !!(el.querySelector("#tn-ghim") || {}).checked;
        await timed("Sửa bản tin", setDoc(doc(db, "bantin", sua.id), patch, { merge: true }));
        toast("Đã lưu bản tin."); dong();
      } catch (err) { nut.disabled = false; st.classList.add("err"); st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho sửa: quản lý cần dán luật bảo mật mới (firestore.rules) một lần." : "Chưa lưu được, kiểm tra mạng rồi thử lại."; }
      return;
    }
    try {
      await timed("Đăng bản tin", addDoc(collection(db, "bantin"), { muc: (el.querySelector('[name="tn-muc"]:checked') || {}).value || "tinlop", tieuDe, nd, anh, link,
        ghim: !!(el.querySelector("#tn-ghim") || {}).checked, tacGia: mail, tenTacGia: tenToi(), luc: Date.now() }));
      if (isAdmin) thongBaoTuDong("📢 Tin mới: " + tieuDe, `${nd.split(/\n+/)[0].slice(0, 200)}\nXem chi tiết trong mục Tin nổi bật.`);
      toast("Đã đăng bản tin."); dong(); location.hash = "#ban-tin";
    } catch (err) { nut.disabled = false; st.classList.add("err"); st.textContent = err && err.code === "permission-denied" ? "Máy chủ chưa cho đăng: quản lý cần dán luật bảo mật mới (firestore.rules) một lần." : "Chưa đăng được, kiểm tra mạng rồi thử lại."; }
  };
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-dang-bai]")) { e.preventDefault(); moDangBai(); }
  else if (e.target.closest("[data-dang-tin]")) { e.preventDefault(); moDangTin(); }
  else if (e.target.closest("[data-top5]")) { setTimeout(() => { const h = $("#ql-top5-h"); if (h) h.scrollIntoView({ block: "start" }); }, 80); }
});

/* ---------- Trang Quản lý: học viên đi học · tiến độ · % đỗ ---------- */
let qlLoc = { cs: "", sx: "can", q: "" };
function renderQL() {
  const box = $("#ql-tong"); if (!box || !isAdmin) return;
  const hom = todayVN(), d = new Date(hom + "T00:00:00Z"), thu2 = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
  const all = roster.map(r => {
    const dd = diemdanhAll[r.id] || {}, t = thongKe(dd, r, feedbackAll[r.id]), p = progressAll[r.id] || {};
    const daHoc = lessons.filter(l => (p.bai || {})[l.id]).length, nop = Object.values(p.baitap || {}).filter(Boolean).length;
    const tuan = Object.keys(dd).filter(k => k.slice(0, 10) >= thu2 && k.slice(0, 10) <= hom && dd[k] === "co").length;
    return { r, t, daHoc, nop, tuan };
  });
  const coDL = all.filter(x => x.t.pass !== null), tb = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const passTB = tb(coDL.map(x => x.t.pass)), attTB = tb(all.filter(x => x.t.att !== null).map(x => x.t.att));
  const diTuan = all.filter(x => x.tuan > 0).length, canNhac = all.filter(x => x.t.keys.length && x.t.muc !== "ok").length;
  const nhom = [["cao", "≥ 70%", x => x.t.pass >= 70], ["vua", "40–69%", x => x.t.pass >= 40 && x.t.pass < 70], ["thap", "< 40%", x => x.t.pass !== null && x.t.pass < 40], ["chua", "Chưa có dữ liệu", x => x.t.pass === null]]
    .map(([k, t, f]) => ({ k, t, n: all.filter(f).length }));
  const words = timTen(qlLoc.q).split(" ").filter(Boolean);
  const rows = all.filter(x => (!qlLoc.cs || String(x.r.coso || "").includes(qlLoc.cs)) && words.every(w => timTen(x.r.ten).includes(w)))
    .sort((a, b) => qlLoc.sx === "ten" ? String(a.r.ten).localeCompare(String(b.r.ten), "vi")
      : qlLoc.sx === "do" ? (a.t.pass ?? 101) - (b.t.pass ?? 101)
      : qlLoc.sx === "it" ? a.t.co28 - b.t.co28
      : ({ bad: 0, warn: 1, ok: 2 }[a.t.keys.length ? a.t.muc : "ok"] - { bad: 0, warn: 1, ok: 2 }[b.t.keys.length ? b.t.muc : "ok"]) || (a.t.pass ?? 101) - (b.t.pass ?? 101));
  const dangGo = document.activeElement && document.activeElement.id === "ql-q";
  const tong = lessons.length || 0;
  const bang = rows.length ? rows.map(({ r, t, daHoc, nop, tuan }) => `<tr class="${t.keys.length ? t.muc : ""}">
      <td data-l="Học viên"><div><b>${esc(r.ten)}</b><span class="muted">${esc(r.chuongTrinh || r.lop || t.khoi)}${r.coso ? " · " + esc(r.coso) : ""}</span></div></td>
      <td data-l="Đi học" class="num"><div><b>${tuan}</b> buổi tuần này<span class="muted">${t.records28 ? t.co28 + " buổi / 4 tuần" : "chưa điểm danh"}${t.streak >= 2 ? ` · vắng liền ${t.streak}` : ""}</span></div></td>
      <td data-l="Chuyên cần" class="num"><div>${t.att === null ? "–" : Math.round(t.att * 100) + "%"}</div></td>
      <td data-l="Tiến độ"><div><div class="ql-bar"><i style="width:${tong ? Math.round(daHoc / tong * 100) : 0}%"></i></div><span class="muted num">${daHoc}/${tong} bài · giờ ${t.gio}/${t.gioCan}</span></div></td>
      <td data-l="Bài tập" class="num"><div>${nop}/${homework.length} nộp<span class="muted">${t.avg === null ? "chưa có điểm" : "TB " + nf1(t.avg)}</span></div></td>
      <td data-l="Dự báo đỗ"><div><span class="pill ${t.keys.length ? t.muc : ""}">${t.pass === null ? "Chưa có" : t.pass + "%"}</span></div></td>
      <td><button type="button" class="btn small" data-qlmsg="${esc(r.id)}">Tin PH</button></td></tr>`).join("")
    : `<tr><td colspan="7" class="muted">${roster.length ? "Không có học viên phù hợp bộ lọc." : "Chưa có học viên nào được duyệt."}</td></tr>`;
  box.innerHTML = `<h2 class="ql-h2" id="ql-tong-h">Học viên đi học · tiến độ · % đỗ</h2>
    <div class="ql-kpi">
      <div><span>Học viên</span><b class="num">${all.length}</b></div>
      <div><span>Đi học tuần này</span><b class="num">${diTuan}<small>/${all.length}</small></b></div>
      <div><span>Chuyên cần 30 ngày</span><b class="num">${attTB === null ? "–" : Math.round(attTB * 100) + "%"}</b></div>
      <div class="hl"><span>% đỗ dự báo TB</span><b class="num">${passTB === null ? "–" : Math.round(passTB) + "%"}</b></div>
      <div class="${canNhac ? "warn" : ""}"><span>Cần nhắc</span><b class="num">${canNhac}</b></div>
    </div>
    <div class="ql-pb" aria-label="Phân bố khả năng đỗ">${all.length ? nhom.filter(x => x.n).map(x => `<i class="${x.k}" style="flex:${x.n}" title="${x.t}: ${x.n} em"></i>`).join("") : "<i class='chua' style='flex:1'></i>"}</div>
    <p class="ql-pb-chu">${nhom.map(x => `<span class="${x.k}"><i></i>${x.t}: <b>${x.n}</b></span>`).join("")}</p>
    <div class="ql-loc">
      <label>Tìm<input id="ql-q" type="search" value="${esc(qlLoc.q)}" placeholder="Tên học viên" autocomplete="off"></label>
      <label>Cơ sở<select id="ql-cs"><option value="">Tất cả</option>${["Bình Phú", "Kim Quan", "Online"].map(c => `<option${qlLoc.cs === c ? " selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Xếp theo<select id="ql-sx">${[["can", "Cần nhắc trước"], ["do", "% đỗ thấp → cao"], ["it", "Đi học ít nhất"], ["ten", "Tên A–Z"]].map(([v, t]) => `<option value="${v}"${qlLoc.sx === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    </div>
    <div class="ql-bang-w"><table class="ql-bang"><thead><tr><th>Học viên</th><th>Đi học</th><th>Chuyên cần</th><th>Tiến độ giáo trình</th><th>Bài tập</th><th>Dự báo đỗ</th><th></th></tr></thead><tbody>${bang}</tbody></table></div>
    <p class="muted ql-ghi">% đỗ là ước tính từ giờ học, chuyên cần và điểm bài tập — dùng để biết em nào cần kèm thêm, không phải cam kết với phụ huynh. "Tin PH" chép sẵn tin nhắn gửi Zalo phụ huynh.</p>`;
  const q = $("#ql-q"); q.oninput = () => { qlLoc.q = q.value; renderQL(); };
  if (dangGo) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  $("#ql-cs").onchange = e => { qlLoc.cs = e.target.value; renderQL(); };
  $("#ql-sx").onchange = e => { qlLoc.sx = e.target.value; renderQL(); };
  $$("#ql-tong [data-qlmsg]").forEach(b => b.onclick = () => { const x = all.find(o => o.r.id === b.dataset.qlmsg); if (!x) return;
    const msg = tinNhanPhuHuynh(x.r, x.t);
    try { navigator.clipboard.writeText(msg).then(() => toast("Đã chép tin nhắn. Dán vào Zalo gửi phụ huynh."), () => moHop(`<h3>Tin nhắn phụ huynh</h3><textarea class="dd-msg" readonly rows="8">${esc(msg)}</textarea>`)); }
    catch (e) { moHop(`<h3>Tin nhắn phụ huynh</h3><textarea class="dd-msg" readonly rows="8">${esc(msg)}</textarea>`); } });
  renderTop5();
}
function renderTop5() {
  const box = $("#ql-top5"); if (!box || !isAdmin) return;
  const gan = BAIVE_DONG.filter(b => (Date.parse(todayVN()) - Date.parse(b.ngay || "2000-01-01")) / 864e5 <= 45).sort((a, b) => (b.luc || 0) - (a.luc || 0));
  const o = k => BAIVE_DONG.find(b => tuanNay(b) && b.hang === k);
  box.innerHTML = `<h2 class="ql-h2" id="ql-top5-h">Top 5 bài vẽ nổi bật tuần</h2>
    <p class="muted">Chọn bài cho từng vị trí: bài đang ở vị trí đó sẽ tự xuống một bậc (Top 5 bị đẩy thì bỏ khỏi Top). Chỉ 5 bài này hiện ở mục "Bài vẽ nổi bật" trên trang chủ; sau 1 tuần tự chuyển sang Top tháng. Bài khác vẫn nằm ở mục "Bài vẽ học viên".</p>
    ${baiVeLoi ? `<p class="xh-loi">Máy chủ chưa cho đọc mục bài vẽ. Quản lý cần dán luật bảo mật mới (firestore.rules) một lần.</p>` : ""}
    <div class="tq5">${[1, 2, 3, 4, 5].map(k => { const b = o(k); return `<div class="t5-o h${k}">
      <span class="t5-so">TOP ${k}</span>${b ? `<img src="${esc(b.anh)}" alt="">` : `<span class="t5-trong">Trống</span>`}
      <select data-t5="${k}" aria-label="Chọn bài Top ${k}"><option value="">${b ? "— Bỏ khỏi Top —" : "Chọn bài…"}</option>${gan.map(x => `<option value="${esc(x.id)}"${b && b.id === x.id ? " selected" : ""}>${esc(x.hocVien)} · ${esc(x.loai)} · ${ngayVN(x.ngay)}</option>`).join("")}</select></div>`; }).join("")}</div>
    <p><button type="button" class="btn primary" data-dang-bai>+ Đăng bài vẽ mới</button> <span class="muted">${gan.length} bài anh chị đăng trong 45 ngày qua</span></p>`;
  $$("#ql-top5 [data-t5]").forEach(s => s.onchange = () => {
    const k = Number(s.dataset.t5), cu = o(k), id = s.value;
    (id ? datTop(id, k) : cu ? datTop(cu.id, 0) : Promise.resolve()).then(() => toast(id ? `Đã đặt Top ${k} tuần.` : `Đã bỏ Top ${k}.`)).catch(() => { toast("Chưa lưu được. Kiểm tra mạng hoặc luật bảo mật.", "err"); renderTop5(); });
  });
}
renderBanTin();
/* Bàn phím điện thoại: đo phần màn hình còn nhìn thấy để khung tin nhắn không bị bàn phím che */
(function vungNhin() {
  const vv = window.visualViewport; if (!vv) return;
  const dat = () => document.documentElement.style.setProperty("--vvh", Math.round(vv.height) + "px");
  vv.addEventListener("resize", dat); dat();
  const nd = $("#chat-nd");
  if (nd) nd.addEventListener("focus", () => [150, 450].forEach(t => setTimeout(() => { dat(); $("#f-chat").scrollIntoView({ block: "end" }); const m = $("#chat-msgs"); if (m) m.scrollTop = m.scrollHeight; }, t)));
})();
