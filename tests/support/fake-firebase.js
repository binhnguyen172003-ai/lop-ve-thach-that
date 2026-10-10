// =====================================================================
//  FIREBASE GIẢ LẬP CHO KIỂM THỬ — chỉ dùng trong Playwright, không bao giờ tải trên web thật.
//  Playwright chặn mọi yêu cầu tới www.gstatic.com/firebasejs/* và trả về file này thay cho
//  firebase-app / auth / firestore / storage / ai. Dữ liệu nằm trong bộ nhớ trình duyệt kiểm thử,
//  nạp từ window.__FAKE_FB_SEED (tests/support/du-lieu-mau.mjs), nên không đọc/ghi Firebase thật.
//  Mỗi lần đọc/ghi được ghi lại ở window.__FAKE_FB.log để kiểm thử phân quyền và chống mất dữ liệu.
// =====================================================================
const G = globalThis;
const S = G.__FAKE_FB ||= (() => {
  const seed = G.__FAKE_FB_SEED || {};
  // Tải lại trang trong cùng lần kiểm thử: dùng dữ liệu đã ghi trước đó (giống máy chủ thật giữ dữ liệu)
  let luu = null; try { luu = JSON.parse(sessionStorage.getItem("__fake_fb_state") || "null"); } catch (e) {}
  const docs = new Map(luu ? luu.docs : []); // "col/id" hoặc "col/id/sub/id2" -> dữ liệu
  if (!luu) for (const [col, rows] of Object.entries(seed.db || {})) for (const [id, data] of Object.entries(rows)) docs.set(col + "/" + id, structuredClone(data));
  return { docs, accounts: (luu && luu.accounts) || seed.accounts || {}, signedIn: luu ? luu.signedIn : seed.signedIn || null,
    listeners: new Set(), authListeners: new Set(), log: [], seq: 0, deny: seed.deny || {} };
})();
const clone = v => v === undefined ? undefined : structuredClone(v);
const segs = parts => parts.flatMap(p => String(p).split("/")).filter(Boolean);
const loi = (code, message = code) => Object.assign(new Error(message), { code, name: "FirebaseError" });

/* ---------------- app ---------------- */
const apps = [];
export function initializeApp(options = {}, name = "[DEFAULT]") { const a = { name, options }; apps.push(a); return a; }
export const getApps = () => apps;
export const getApp = (name = "[DEFAULT]") => apps.find(a => a.name === name);

/* ---------------- auth ---------------- */
function taoUser(mail) {
  const acc = S.accounts[mail] || {};
  return { uid: "uid-" + mail, email: mail, emailVerified: acc.verified !== false, displayName: acc.ten || "",
    async reload() {}, async getIdToken() { return "fake-token"; } };
}
const auth = { currentUser: null, languageCode: "vi" };
export function getAuth() { return auth; }
function doiNguoi(mail) {
  S.signedIn = mail; auth.currentUser = mail ? taoUser(mail) : null; luuPhien();
  S.authListeners.forEach(cb => setTimeout(() => cb(auth.currentUser), 0));
}
export function onAuthStateChanged(_a, cb) {
  auth.currentUser = S.signedIn ? taoUser(S.signedIn) : null;
  S.authListeners.add(cb); setTimeout(() => cb(auth.currentUser), 0);
  return () => S.authListeners.delete(cb);
}
export async function signInWithEmailAndPassword(_a, mail, pass) {
  const acc = S.accounts[String(mail).toLowerCase()];
  if (!acc || acc.pass !== pass) throw loi("auth/invalid-credential");
  doiNguoi(String(mail).toLowerCase()); return { user: auth.currentUser };
}
export async function createUserWithEmailAndPassword(_a, mail, pass) {
  mail = String(mail).toLowerCase();
  if (S.accounts[mail]) throw loi("auth/email-already-in-use");
  S.accounts[mail] = { pass, verified: false }; doiNguoi(mail); return { user: auth.currentUser };
}
export async function signOut() { doiNguoi(null); }
export async function sendEmailVerification() {}
export async function sendPasswordResetEmail() {}
export async function updateProfile(u, p) { Object.assign(u, p); }
G.__fakeAuth = { dangNhap: mail => doiNguoi(mail), dangXuat: () => doiNguoi(null) };

/* ---------------- firestore: tham chiếu ---------------- */
const db = { type: "firestore" };
export const getFirestore = () => db;
export const initializeFirestore = () => db;
export const persistentLocalCache = o => o, persistentMultipleTabManager = o => o;
function colRef(path) {
  const p = segs([path]); const id = p.at(-1);
  return { type: "collection", id, path: p.join("/"), get parent() { return p.length > 1 ? docRef(p.slice(0, -1).join("/")) : null; } };
}
function docRef(path) {
  const p = segs([path]); const id = p.at(-1);
  return { type: "document", id, path: p.join("/"), get parent() { return colRef(p.slice(0, -1).join("/")); } };
}
export function collection(base, ...parts) { return colRef([...(base && base.path ? [base.path] : []), ...parts].join("/")); }
export function doc(base, ...parts) {
  if (base && base.type === "collection" && !parts.length) return docRef(base.path + "/auto" + (++S.seq).toString(36) + Math.random().toString(36).slice(2, 8));
  return docRef([...(base && base.path ? [base.path] : []), ...parts].join("/"));
}
export const where = (field, op, value) => ({ kind: "where", field, op, value });
export const orderBy = (field, dir = "asc") => ({ kind: "orderBy", field, dir });
export const limit = n => ({ kind: "limit", n });
export const documentId = () => "__name__";
export function query(ref, ...cons) { return { type: "query", path: ref.path, ref, cons: [...(ref.cons || []), ...cons] }; }

/* ---------------- firestore: giá trị đặc biệt ---------------- */
const SENT = Symbol("sentinel");
export const deleteField = () => ({ [SENT]: "delete" });
export const increment = n => ({ [SENT]: "inc", n });
export const serverTimestamp = () => ({ [SENT]: "ts" });
export const arrayUnion = (...v) => ({ [SENT]: "union", v });
export const arrayRemove = (...v) => ({ [SENT]: "remove", v });
export class Timestamp { constructor(s, ns = 0) { this.seconds = s; this.nanoseconds = ns; } toMillis() { return this.seconds * 1000; } toDate() { return new Date(this.toMillis()); } static now() { return new Timestamp(Date.now() / 1000 | 0); } static fromMillis(ms) { return new Timestamp(ms / 1000 | 0); } }
const laObj = v => v && typeof v === "object" && !Array.isArray(v) && !v[SENT] && Object.getPrototypeOf(v) === Object.prototype;
function apGiaTri(cu, v) {
  if (v && v[SENT]) {
    if (v[SENT] === "inc") return (Number(cu) || 0) + v.n;
    if (v[SENT] === "ts") return Date.now();
    if (v[SENT] === "union") return [...new Set([...(Array.isArray(cu) ? cu : []), ...v.v])];
    if (v[SENT] === "remove") return (Array.isArray(cu) ? cu : []).filter(x => !v.v.includes(x));
  }
  return laObj(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => !(x && x[SENT] === "delete")).map(([k, x]) => [k, apGiaTri(undefined, x)])) : clone(v);
}
function tronSau(dich, nguon) {
  for (const [k, v] of Object.entries(nguon)) {
    if (v && v[SENT] === "delete") delete dich[k];
    else if (laObj(v)) { if (!laObj(dich[k])) dich[k] = {}; tronSau(dich[k], v); }
    else dich[k] = apGiaTri(dich[k], v);
  }
  return dich;
}
function datTheoDuong(dich, duong, v) {
  const p = duong.split("."); let o = dich;
  p.slice(0, -1).forEach(k => { if (!laObj(o[k])) o[k] = {}; o = o[k]; });
  const k = p.at(-1);
  if (v && v[SENT] === "delete") delete o[k]; else o[k] = apGiaTri(o[k], v);
}

/* ---------------- firestore: đọc ---------------- */
function kiemQuyen(kieu, path) {
  const col = segs([path])[0], cam = S.deny[S.signedIn || ""] || [];
  if (cam.includes(col) || cam.includes(kieu + ":" + col)) throw loi("permission-denied", "Missing or insufficient permissions.");
}
const docSnap = (ref, data) => ({ id: ref.id, ref, exists: () => data !== undefined, data: () => clone(data), get: f => clone(f.split(".").reduce((o, k) => o == null ? undefined : o[k], data)),
  metadata: { hasPendingWrites: false, fromCache: false } });
const layTruong = (d, f) => f === "__name__" ? undefined : f.split(".").reduce((o, k) => o == null ? undefined : o[k], d);
const soSanh = (a, b) => a === b ? 0 : a === undefined ? -1 : b === undefined ? 1 : a < b ? -1 : 1;
function chayQuery(q) {
  const path = q.path, cons = q.cons || [], sau = segs([path]).length + 1;
  let rows = [...S.docs.entries()].filter(([k]) => k.startsWith(path + "/") && segs([k]).length === sau).map(([k, d]) => ({ ref: docRef(k), d }));
  for (const c of cons) if (c.kind === "where") rows = rows.filter(({ d }) => {
    const v = layTruong(d, c.field);
    switch (c.op) {
      case "==": return v === c.value; case "!=": return v !== c.value; case "<": return v < c.value; case "<=": return v <= c.value;
      case ">": return v > c.value; case ">=": return v >= c.value; case "in": return c.value.includes(v); case "not-in": return !c.value.includes(v);
      case "array-contains": return Array.isArray(v) && v.includes(c.value); case "array-contains-any": return Array.isArray(v) && v.some(x => c.value.includes(x));
      default: return true;
    }
  });
  const ords = cons.filter(c => c.kind === "orderBy");
  // Firestore bỏ qua tài liệu thiếu trường đang sắp xếp
  ords.forEach(o => { rows = rows.filter(({ d }) => layTruong(d, o.field) !== undefined); });
  if (ords.length) rows.sort((a, b) => { for (const o of ords) { const r = soSanh(layTruong(a.d, o.field), layTruong(b.d, o.field)); if (r) return o.dir === "desc" ? -r : r; } return 0; });
  else rows.sort((a, b) => a.ref.id.localeCompare(b.ref.id));
  const lim = cons.find(c => c.kind === "limit"); if (lim) rows = rows.slice(0, lim.n);
  return rows;
}
function querySnap(q) {
  const docsArr = chayQuery(q).map(({ ref, d }) => docSnap(ref, d));
  return { docs: docsArr, size: docsArr.length, empty: !docsArr.length, forEach: f => docsArr.forEach(f), docChanges: () => docsArr.map(doc => ({ type: "added", doc })),
    metadata: { hasPendingWrites: false, fromCache: false } };
}
export async function getDoc(ref) {
  S.log.push({ op: "get", path: ref.path, ai: S.signedIn }); kiemQuyen("get", ref.path);
  return docSnap(ref, S.docs.get(ref.path));
}
export async function getDocs(q) {
  S.log.push({ op: "list", path: q.path, ai: S.signedIn }); kiemQuyen("list", q.path);
  return querySnap(q);
}
export function onSnapshot(ref, next, err) {
  const isDoc = ref.type === "document";
  S.log.push({ op: isDoc ? "watch-doc" : "watch", path: ref.path, ai: S.signedIn, loc: (ref.cons || []).filter(c => c.kind === "where").map(c => `${c.field}${c.op}${c.value}`) });
  const onNext = typeof next === "function" ? next : next && next.next, onErr = typeof err === "function" ? err : next && next.error;
  try { kiemQuyen(isDoc ? "get" : "list", ref.path); }
  catch (e) { setTimeout(() => onErr && onErr(e), 0); return () => {}; }
  const l = { ref, fire: () => { try { onNext(isDoc ? docSnap(ref, S.docs.get(ref.path)) : querySnap(ref)); } catch (e) { console.error(e); } } };
  S.listeners.add(l); setTimeout(() => S.listeners.has(l) && l.fire(), 0);
  return () => S.listeners.delete(l);
}
let henPhat = 0;
function luuPhien() { try { sessionStorage.setItem("__fake_fb_state", JSON.stringify({ docs: [...S.docs], accounts: S.accounts, signedIn: S.signedIn })); } catch (e) {} }
function phat() { luuPhien(); clearTimeout(henPhat); henPhat = setTimeout(() => S.listeners.forEach(l => l.fire()), 0); }

/* ---------------- firestore: ghi ---------------- */
function ghi(ref, data, kieu, opt) {
  kiemQuyen("write", ref.path);
  const cu = S.docs.get(ref.path);
  S.log.push({ op: kieu, path: ref.path, ai: S.signedIn, data: kieu === "delete" ? null : clone(apGiaTri(undefined, data)), truoc: clone(cu) });
  if (kieu === "delete") S.docs.delete(ref.path);
  else if (kieu === "update") { if (cu === undefined) throw loi("not-found", "No document to update: " + ref.path); const moi = clone(cu); Object.entries(data).forEach(([k, v]) => datTheoDuong(moi, k, v)); S.docs.set(ref.path, moi); }
  else if (opt && opt.merge) S.docs.set(ref.path, tronSau(clone(cu) || {}, data));
  else S.docs.set(ref.path, apGiaTri(undefined, data));
}
export async function setDoc(ref, data, opt) { ghi(ref, data, "set", opt); phat(); }
export async function updateDoc(ref, data) { ghi(ref, data, "update"); phat(); }
export async function deleteDoc(ref) { ghi(ref, null, "delete"); phat(); }
export async function addDoc(col, data) { const ref = doc(col); ghi(ref, data, "set"); phat(); return ref; }
export function writeBatch() {
  const ops = [];
  const b = { set(r, d, o) { ops.push(() => ghi(r, d, "set", o)); return b; }, update(r, d) { ops.push(() => ghi(r, d, "update")); return b; },
    delete(r) { ops.push(() => ghi(r, null, "delete")); return b; },
    async commit() { const luu = new Map(S.docs); try { ops.forEach(f => f()); } catch (e) { S.docs.clear(); luu.forEach((v, k) => S.docs.set(k, v)); throw e; } phat(); } };
  return b;
}
export async function runTransaction(_db, fn) {
  if (S.beforeTransaction) { const before = S.beforeTransaction; S.beforeTransaction = null; before(); }
  const ops = [];
  const tx = { get: async r => docSnap(r, S.docs.get(r.path)), set(r, d, o) { ops.push(() => ghi(r, d, "set", o)); return tx; },
    update(r, d) { ops.push(() => ghi(r, d, "update")); return tx; }, delete(r) { ops.push(() => ghi(r, null, "delete")); return tx; } };
  const kq = await fn(tx); const luu = new Map(S.docs);
  try { ops.forEach(f => f()); } catch (e) { S.docs.clear(); luu.forEach((v, k) => S.docs.set(k, v)); throw e; }
  phat(); return kq;
}
export async function enableIndexedDbPersistence() {}

/* ---------------- storage (không lưu tệp thật) ---------------- */
export const getStorage = () => ({ type: "storage" });
export const setMaxUploadRetryTime = () => {}, setMaxOperationRetryTime = () => {};
export const ref = (_s, path) => ({ fullPath: path });
export async function uploadBytes(r) { S.log.push({ op: "upload", path: r.fullPath, ai: S.signedIn }); return { ref: r }; }
export function uploadBytesResumable(r, file) {
  S.log.push({ op: "upload", path: r.fullPath, ai: S.signedIn });
  const p = Promise.resolve({ ref: r });
  return { on(_e, prog, err, done) { setTimeout(() => { prog && prog({ bytesTransferred: file.size || 1, totalBytes: file.size || 1 }); done && done(); }, 0); }, cancel() {}, then: p.then.bind(p), catch: p.catch.bind(p), snapshot: { ref: r } };
}
export async function getDownloadURL() { return "data:image/gif;base64,R0lGODlhAQABAAAAACw="; }
export async function getBlob() { return new Blob(["tep-thu"]); }
export async function deleteObject(r) { S.log.push({ op: "delete-file", path: r.fullPath, ai: S.signedIn }); }

/* ---------------- AI: không gọi mô hình thật trong kiểm thử ---------------- */
export class GoogleAIBackend {}
export const getAI = () => ({});
export function getGenerativeModel() { throw loi("ai/disabled-in-tests", "AI bị tắt trong môi trường kiểm thử"); }

/* ---------------- Cho kiểm thử: giả lập máy chủ đẩy dữ liệu mới (như người khác vừa ghi) ---------------- */
G.__fakeMayChu = {
  ghi(path, data) { S.docs.set(path, structuredClone(data)); phat(); },
  xoa(path) { S.docs.delete(path); phat(); }
};
