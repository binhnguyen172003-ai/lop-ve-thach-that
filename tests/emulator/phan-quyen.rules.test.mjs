// Kiểm thử luật phân quyền nội dung trên Firebase Emulator (không đụng dữ liệu thật): 15 tình huống nghiệm thu + 7 ví dụ xung đột
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, writeBatch } from "firebase/firestore";
import * as Q from "../../assets/js/quyen.js";
const env = await initializeTestEnvironment({ projectId: "demo-pq", firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8094 } });
const ai = m => env.authenticatedContext(m, { email: m, email_verified: true }).firestore();
const QL = "binhnguyen172003@gmail.com", QL2 = "ql2@x.com";
const NOW = Date.now(), A = (...a) => a;
// Tài khoản kiểm thử
const PQ = {
  "gva@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|*|Bình Phú": { a: A("VIEW", "CREATE", "EDIT") } } },                  // TH1
  "qlcs@x.com": { vaiTro: "qlcs", coSo: ["Bình Phú"], cap: { "ebook|*|Bình Phú": { a: A("APPROVE") } } },                             // TH2
  "gvs@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "doc:v01": { a: A("VIEW", "EDIT") } } },                                     // TH3
  "gvn@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|Hình hoạ người|*": { a: A("VIEW", "CREATE", "EDIT", "SOURCE", "ARCHIVE") } } }, // TH4
  "gvp@x.com": { vaiTro: "gv", coSo: ["Bình Phú", "Kim Quan"], cap: { "video|*|*": { a: A("VIEW", "PUBLISH") } } },                     // TH5 + publish
  "gvk@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], khoa: true, cap: { "video|*|*": { a: A("VIEW", "EDIT") } } },                        // TH6
  "gvr@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|*|Bình Phú": { a: A("VIEW", "EDIT") } } },                             // thu hồi trong phiên
  "gvh@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|*|Bình Phú": { a: A("EDIT"), het: NOW - 1000 }, "ebook|*|Bình Phú": { a: A("EDIT"), het: NOW + 864e5 } } },
  "gvd@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "doc:vkq": { a: A("VIEW", "EDIT") }, "doc:vkq2": { a: A("VIEW", "EDIT"), vuot: true } } },
  "gvc@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|*|Bình Phú": { a: A("VIEW", "EDIT", "APPROVE"), cam: A("APPROVE") }, "doc:v02": { cam: A("VIEW") } }, camXem: ["v02"] },
  "gve@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "ebook|*|Bình Phú": { a: A("VIEW", "CREATE", "EDIT") } } },
  "gvx@x.com": { vaiTro: "gv", coSo: ["Bình Phú"], cap: { "video|*|Bình Phú": { a: A("VIEW", "CREATE", "EDIT", "APPROVE") } } },
};
const VID = "https://youtu.be/vZdFuUTUeJw", VID2 = "https://www.youtube.com/watch?v=kcsVYarOj3Q", CANVA = "https://www.canva.com/design/DAF123/view";
let luc = NOW;
const mk = (id, f, tg) => Q.taoMoi(id, { loai: "video", dm: "Hình hoạ người", cs: "Bình Phú", tieuDe: "Bài " + id, moTa: "mô tả", nguon: VID, ...f }, tg, NOW - 5000, "seed-" + id);
const daDuyet = (nd, boi = QL2) => ({ ...nd, tt: "duyet", duyet: { ban: nd.ban, tieuDe: nd.tieuDe, moTa: nd.moTa, nguon: nd.nguon, boi, luc: NOW - 4000 } });
await env.withSecurityRulesDisabled(async c => { const f = c.firestore();
  await setDoc(doc(f, "admins/" + QL2), {});
  for (const m of [...Object.keys(PQ), "gvz@x.com"]) await setDoc(doc(f, "giaovien/" + m), { ten: m });
  for (const [m, p] of Object.entries(PQ)) await setDoc(doc(f, "phanquyen/" + m), { khoa: false, ...p, capNhat: 1, capNhatBoi: QL, hdMa: "seed" });
  await setDoc(doc(f, "hocvien/hvb@x.com"), { coso: "Bình Phú" }); await setDoc(doc(f, "hocvien/hvk@x.com"), { coso: "Kim Quan" });
  await setDoc(doc(f, "baitap/b1"), { ten: "x" });
  const S = (id, d) => setDoc(doc(f, "noidung/" + id), d);
  await S("v01", { ...mk("v01", {}, "gvz@x.com") });
  await S("v02", { ...mk("v02", {}, "gvz@x.com"), tt: "cho" });                         // đang chờ duyệt
  await S("vkq", mk("vkq", { cs: "Kim Quan" }, "gvz@x.com")); await S("vkq2", mk("vkq2", { cs: "Kim Quan" }, "gvz@x.com"));
  await S("vpub", daDuyet(mk("vpub", { cs: "chung" }, "gvz@x.com")));                    // đã duyệt, sẽ xuất bản
  await S("e01", { ...mk("e01", { loai: "ebook", dm: "Mỹ thuật 2", nguon: CANVA }, "gve@x.com"), tt: "cho" });
  await S("vsch", daDuyet(mk("vsch", {}, "gvz@x.com")));
  await S("vrv", daDuyet(mk("vrv", { cs: "chung" }, "gvz@x.com")));
  await S("vh", mk("vh", {}, "gvz@x.com")); await S("eh", mk("eh", { loai: "ebook", nguon: CANVA }, "gvz@x.com"));
  await S("vx", { ...mk("vx", {}, "gvx@x.com"), tt: "cho" });
  await S("vr", mk("vr", {}, "gvz@x.com"));
});
let ok = 0, n = 0; const loi = [];
const t = async (ten, p) => { n++; try { await p; ok++; console.log("✓ " + ten); } catch (e) { loi.push(ten); console.log("✗ " + ten, String(e.message).slice(0, 140)); } };
const doc0 = async id => (await env.withSecurityRulesDisabled(async c => (await getDoc(doc(c.firestore(), id))).data())) ;
let doc_ = null; await env.withSecurityRulesDisabled(async c => { doc_ = c; });
const docNow = async id => { let d; await env.withSecurityRulesDisabled(async c => { d = (await getDoc(doc(c.firestore(), id))).data(); }); return d; };
// Ghi một thao tác kèm nhật ký bắt buộc (như giao diện làm)
async function lam(me, id, dung, them = [], { boLog = false, nx = "" } = {}) {
  const f = ai(me), b = writeBatch(f);
  b.set(doc(f, "noidung", id), dung);
  if (!boLog) b.set(doc(f, `noidung/${id}/ls/${dung.hdMa}`), Q.nhatKy(dung, me, dung.hdLuc, nx));
  for (const [p, d] of them) b.set(doc(f, p), d);
  return b.commit();
}
const buoc = async (me, id, hd, nx = "") => { const o = await docNow("noidung/" + id); luc++; const n2 = Q.chuyen(o, hd, me, luc, Q.maHd(luc), nx); return lam(me, id, n2, [], { nx }); };
const suaND = async (me, id, f) => { const o = await docNow("noidung/" + id); luc++; return lam(me, id, Q.sua(o, { tieuDe: o.tieuDe, moTa: o.moTa, nguon: o.nguon, ...f }, me, luc, Q.maHd(luc))); };
async function xuatBan(me, id, f = {}) {
  const o = await docNow("noidung/" + id); luc = Math.max(luc + 1, Date.now()); const ma = Q.maHd(luc);
  const tv = Q.banXuatBan(o, f, me, luc, ma);
  const nd = { ...o, hd: tv.hd, hdBoi: me, hdLuc: luc, hdMa: ma };
  return lam(me, id, nd, [["thuvien/" + id, tv]]);
}
async function thaoTV(me, id, hdNd, tvSua, nx = "") {   // ẩn / phạm vi / kích hoạt / thu hồi + ẩn
  const o = await docNow("noidung/" + id), tv = await docNow("thuvien/" + id); luc = Math.max(luc + 1, Date.now()); const ma = Q.maHd(luc);
  const nd = hdNd === "thuhoi" || hdNd === "luutru" ? Q.chuyen(o, hdNd, me, luc, ma, nx) : { ...o, hd: hdNd, hdBoi: me, hdLuc: luc, hdMa: ma };
  const them = tvSua ? [["thuvien/" + id, { ...tv, ...tvSua, hdBoi: me, hdLuc: luc, hdMa: ma }]] : [];
  return lam(me, id, nd, them, { nx });
}
async function capQuyen(me, mail, p, hd = "sua") {
  const f = ai(me), b = writeBatch(f), cu = await docNow("phanquyen/" + mail); luc++; const ma = Q.maHd(luc);
  b.set(doc(f, "phanquyen", mail), { khoa: false, vaiTro: "gv", coSo: [], cap: {}, ...cu, ...p, capNhat: luc, capNhatBoi: me, hdMa: ma });
  b.set(doc(f, `phanquyen/${mail}/ls/${ma}`), { ai: me, luc, hd, noi: JSON.stringify(p).slice(0, 6000) });
  return b.commit();
}
const hv = ai("hvb@x.com"), hvk = ai("hvk@x.com");
const thuVienHV = f => getDocs(query(collection(f, "thuvien"), where("hien", "==", true), where("phamVi", "in", ["tatca", f === hv ? "Bình Phú" : "Kim Quan"])));

console.log("\n== Ví dụ 1 / Kiểm thử 5: GV được thêm Video, không được duyệt / xuất bản; Video ≠ Ebook ==");
luc++; const va = Q.taoMoi("va", { loai: "video", dm: "Hình hoạ cơ bản", cs: "Bình Phú", tieuDe: "Khối hộp", moTa: "", nguon: VID }, "gva@x.com", luc, Q.maHd(luc));
await t("GV A tạo Video ở Bình Phú", assertSucceeds(lam("gva@x.com", "va", va)));
await t("GV A gửi duyệt Video của mình", assertSucceeds(buoc("gva@x.com", "va", "gui")));
await t("GV A KHÔNG tự duyệt Video", assertFails(buoc("gva@x.com", "va", "duyet")));
await t("GV A KHÔNG yêu cầu sửa / từ chối", assertFails(buoc("gva@x.com", "va", "tuchoi", "x")));
luc++; const ea = Q.taoMoi("ea", { loai: "ebook", dm: "Mỹ thuật 2", cs: "Bình Phú", tieuDe: "Ebook", moTa: "", nguon: CANVA }, "gva@x.com", luc, Q.maHd(luc));
await t("KT5: quyền Video KHÔNG áp dụng cho Ebook (tạo Ebook bị chặn)", assertFails(lam("gva@x.com", "ea", ea)));
await t("KT5: GV A KHÔNG xem Ebook e01", assertFails(getDoc(doc(ai("gva@x.com"), "noidung/e01"))));
await t("GV A KHÔNG xuất bản (không có PUBLISH)", assertFails(xuatBan("gva@x.com", "vpub")));

console.log("\n== Ví dụ 2 / Kiểm thử 1: QLCS có APPROVE Ebook, không có PUBLISH ==");
await t("QLCS duyệt Ebook e01 (Bình Phú)", assertSucceeds(buoc("qlcs@x.com", "e01", "duyet", "Đạt")));
await t("KT1: QLCS KHÔNG xuất bản Ebook đã duyệt", assertFails(xuatBan("qlcs@x.com", "e01")));
await t("QLCS KHÔNG duyệt Video (chỉ được cấp Ebook)", assertFails(buoc("qlcs@x.com", "va", "duyet")));
await t("QLCS kế thừa: xem tài liệu trong cơ sở", assertSucceeds(getDoc(doc(ai("qlcs@x.com"), "noidung/va"))));
await t("QLCS KHÔNG xem tài liệu cơ sở Kim Quan", assertFails(getDoc(doc(ai("qlcs@x.com"), "noidung/vkq"))));

console.log("\n== Ví dụ 3: GV sửa được Video 01 nhưng không được thay link YouTube ==");
await t("GV S sửa tiêu đề Video 01", assertSucceeds(suaND("gvs@x.com", "v01", { tieuDe: "Video 01 – dựng hình" })));
await t("GV S KHÔNG thay link YouTube Video 01", assertFails(suaND("gvs@x.com", "v01", { nguon: VID2 })));
await t("KT8: quyền riêng Video 01 KHÔNG dùng được cho tài liệu khác (vh)", assertFails(suaND("gvs@x.com", "vh", { tieuDe: "x" })));
await t("KT8: GV S đọc Video 01 nhờ quyền riêng", assertSucceeds(getDoc(doc(ai("gvs@x.com"), "noidung/v01"))));
await t("Link nguồn sai định dạng bị chặn (ngay cả khi có quyền SOURCE)", assertFails(suaND("gvn@x.com", "v01", { nguon: "javascript:alert(1)" })));
await t("GV N (có SOURCE trong danh mục) thay link YouTube hợp lệ", assertSucceeds(suaND("gvn@x.com", "v01", { nguon: VID2 })));

console.log("\n== Ví dụ 4 / Kiểm thử 6, 7: danh mục Hình hoạ người tại Bình Phú ==");
const mkN = (id, f) => { luc++; return Q.taoMoi(id, { loai: "video", dm: "Hình hoạ người", cs: "Bình Phú", tieuDe: "N " + id, moTa: "", nguon: VID, ...f }, "gvn@x.com", luc, Q.maHd(luc)); };
await t("GV N tạo Video Hình hoạ người tại Bình Phú", assertSucceeds(lam("gvn@x.com", "n1", mkN("n1"))));
await t("KT6: GV N KHÔNG tạo cùng danh mục tại Kim Quan", assertFails(lam("gvn@x.com", "n2", mkN("n2", { cs: "Kim Quan" }))));
await t("KT6: GV N KHÔNG tạo tài liệu chung 2 cơ sở", assertFails(lam("gvn@x.com", "n3", mkN("n3", { cs: "chung" }))));
await t("KT6: GV N KHÔNG sửa tài liệu Kim Quan", assertFails(suaND("gvn@x.com", "vkq", { tieuDe: "x" })));
await t("KT7: GV N KHÔNG tạo Video danh mục Màu", assertFails(lam("gvn@x.com", "n4", mkN("n4", { dm: "Màu & bố cục màu" }))));
await t("KT6: quyền riêng tài liệu Kim Quan KHÔNG vượt cơ sở", assertFails(suaND("gvd@x.com", "vkq", { tieuDe: "x" })));
await t("KT6: có uỷ quyền vượt cơ sở (vuot) thì được", assertSucceeds(suaND("gvd@x.com", "vkq2", { tieuDe: "x" })));
await t("GV N liệt kê đúng phạm vi (loai+dm+cs)", assertSucceeds(getDocs(query(collection(ai("gvn@x.com"), "noidung"), where("loai", "==", "video"), where("dm", "==", "Hình hoạ người"), where("cs", "==", "Bình Phú")))));
await t("GV N KHÔNG liệt kê phạm vi Kim Quan", assertFails(getDocs(query(collection(ai("gvn@x.com"), "noidung"), where("loai", "==", "video"), where("dm", "==", "Hình hoạ người"), where("cs", "==", "Kim Quan")))));
await t("GV N KHÔNG liệt kê cả kho", assertFails(getDocs(collection(ai("gvn@x.com"), "noidung"))));
await t("GV liệt kê tài liệu mình liên quan", assertSucceeds(getDocs(query(collection(ai("gvn@x.com"), "noidung"), where("lq", "array-contains", "gvn@x.com")))));

console.log("\n== Ví dụ 5 / Kiểm thử 2, 3: có PUBLISH nhưng tài liệu đang chờ duyệt ==");
await t("KT3: GV P KHÔNG xuất bản v02 đang Chờ duyệt", assertFails((async () => { const o = await docNow("noidung/v02"); luc++; const ma = Q.maHd(luc);
  const tv = { loai: o.loai, dm: o.dm, cs: o.cs, ban: o.ban, tieuDe: o.tieuDe, moTa: o.moTa, nguon: o.nguon, duyetBoi: QL, phamVi: "Bình Phú", hien: true, tu: luc, xbBoi: "gvp@x.com", xbLuc: luc, hd: "xuatban", hdBoi: "gvp@x.com", hdLuc: luc, hdMa: ma };
  return lam("gvp@x.com", "v02", { ...o, hd: "xuatban", hdBoi: "gvp@x.com", hdLuc: luc, hdMa: ma }, [["thuvien/v02", tv]]); })()));
await t("KT2: GV P KHÔNG duyệt (chỉ có PUBLISH)", assertFails(buoc("gvp@x.com", "v02", "duyet")));
await t("KT3: GV P KHÔNG tự chèn 'duyet' giả vào tài liệu", assertFails((async () => { const o = await docNow("noidung/v02"); luc++;
  return lam("gvp@x.com", "v02", { ...o, tt: "duyet", duyet: { ban: o.ban, tieuDe: o.tieuDe, moTa: o.moTa, nguon: o.nguon, boi: QL, luc }, hd: "sua", hdBoi: "gvp@x.com", hdLuc: luc, hdMa: Q.maHd(luc) }); })()));
await t("KT2: GV P xuất bản vpub đã duyệt (phạm vi mặc định: cả 2 cơ sở)", assertSucceeds(xuatBan("gvp@x.com", "vpub")));
await t("Bản xuất bản sao y bản đã duyệt", (async () => { const a = await docNow("thuvien/vpub"), b = await docNow("noidung/vpub"); if (a.ban !== b.duyet.ban || a.nguon !== b.duyet.nguon || !a.hien) throw new Error("lệch"); })());
await t("Học viên Bình Phú thấy vpub", (async () => { const s = await thuVienHV(hv); if (!s.docs.some(d => d.id === "vpub")) throw new Error("không thấy"); })());
await t("GV P KHÔNG đổi phạm vi xem (thiếu MANAGE_ACCESS)", assertFails(thaoTV("gvp@x.com", "vpub", "phamvi", { phamVi: "Kim Quan", hd: "phamvi" })));
await t("GV P KHÔNG xuất bản bản sửa nội dung (khác bản đã duyệt)", assertFails((async () => { const o = await docNow("noidung/vpub"); luc++; const ma = Q.maHd(luc);
  const tv = { ...Q.banXuatBan(o, {}, "gvp@x.com", luc, ma), tieuDe: "Đổi tiêu đề lén" }; return lam("gvp@x.com", "vpub", { ...o, hd: "xuatban", hdBoi: "gvp@x.com", hdLuc: luc, hdMa: ma }, [["thuvien/vpub", tv]]); })()));
await t("QL cấp MANAGE_ACCESS → GV P đổi phạm vi chỉ Bình Phú", (async () => {
  await capQuyen(QL, "gvp@x.com", { cap: { "video|*|*": { a: A("VIEW", "PUBLISH", "MANAGE_ACCESS"), boi: QL, luc } } }, "cap");
  await thaoTV("gvp@x.com", "vpub", "phamvi", { phamVi: "Bình Phú", hd: "phamvi" }); })());
await t("Học viên Kim Quan KHÔNG còn đọc được vpub", assertFails(getDoc(doc(hvk, "thuvien/vpub"))));

console.log("\n== Kiểm thử 4: không tự phê duyệt ==");
luc++; const q1 = Q.taoMoi("q1", { loai: "video", dm: "Hình hoạ tượng", cs: "chung", tieuDe: "QL tạo", moTa: "", nguon: VID }, QL, luc, Q.maHd(luc));
await t("Quản lý tạo tài liệu", assertSucceeds(lam(QL, "q1", q1)));
await t("Quản lý gửi duyệt", assertSucceeds(buoc(QL, "q1", "gui")));
await t("KT4: Quản lý KHÔNG tự duyệt bản mình tạo", assertFails(buoc(QL, "q1", "duyet")));
await t("Quản lý thứ hai duyệt được", assertSucceeds(buoc(QL2, "q1", "duyet")));
await t("KT4: GV X có APPROVE nhưng KHÔNG tự duyệt bản mình tạo", assertFails(buoc("gvx@x.com", "vx", "duyet")));
await t("KT4: GV X KHÔNG lách bằng cách xoá tên mình khỏi danh sách người sửa", assertFails((async () => { const o = await docNow("noidung/vx"); luc++;
  return lam("gvx@x.com", "vx", { ...o, nguoi: [], hd: "sua", hdBoi: "gvx@x.com", hdLuc: luc, hdMa: Q.maHd(luc), tt: "nhap" }); })()));
await t("Cấm rõ ràng thắng cho phép: GV C có cả a+cam APPROVE → không duyệt được", assertFails(buoc("gvc@x.com", "vx", "duyet")));
await t("Cấm xem riêng tài liệu v02: GV C KHÔNG đọc", assertFails(getDoc(doc(ai("gvc@x.com"), "noidung/v02"))));
await t("GV C liệt kê phạm vi phải loại v02 (not-in camXem)", assertSucceeds(getDocs(query(collection(ai("gvc@x.com"), "noidung"), where("loai", "==", "video"), where("dm", "==", "Hình hoạ người"), where("cs", "==", "Bình Phú"), where("ma", "not-in", ["v02"])))));
await t("GV C liệt kê KHÔNG loại v02 → bị chặn", assertFails(getDocs(query(collection(ai("gvc@x.com"), "noidung"), where("loai", "==", "video"), where("dm", "==", "Hình hoạ người"), where("cs", "==", "Bình Phú")))));

console.log("\n== Kiểm thử 9: thu hồi quyền có hiệu lực ngay với phiên đang đăng nhập ==");
const gvr = ai("gvr@x.com");
await t("GV R sửa được khi còn quyền", assertSucceeds(suaND("gvr@x.com", "vr", { tieuDe: "R1" })));
await t("Quản lý thu hồi quyền GV R (kèm lịch sử)", assertSucceeds(capQuyen(QL, "gvr@x.com", { cap: {} }, "thuhoi")));
await t("KT9: cùng phiên, GV R KHÔNG sửa được nữa", assertFails(suaND("gvr@x.com", "vr", { tieuDe: "R2" })));
await t("KT9: cùng phiên, GV R vẫn đọc được tài liệu mình đã sửa (liên quan)", assertSucceeds(getDoc(doc(gvr, "noidung/vr"))));

console.log("\n== Kiểm thử 10: quyền hết hạn ==");
await t("KT10: quyền Video đã hết hạn → KHÔNG sửa", assertFails(suaND("gvh@x.com", "vh", { tieuDe: "x" })));
await t("Quyền Ebook còn hạn → sửa được", assertSucceeds(suaND("gvh@x.com", "eh", { tieuDe: "x" })));

console.log("\n== Ví dụ 6 / Kiểm thử 11: tài khoản bị vô hiệu hoá ==");
await t("KT11: GV K bị khoá KHÔNG sửa", assertFails(suaND("gvk@x.com", "vh", { tieuDe: "x" })));
await t("KT11: GV K bị khoá KHÔNG đọc kho nội dung", assertFails(getDoc(doc(ai("gvk@x.com"), "noidung/vh"))));
await t("KT11: GV K bị khoá mất cả quyền nội bộ khác (đọc bài tập)", assertFails(getDoc(doc(ai("gvk@x.com"), "baitap/b1"))));
await t("GV thường vẫn đọc bài tập (đối chứng)", assertSucceeds(getDoc(doc(ai("gva@x.com"), "baitap/b1"))));

console.log("\n== Kiểm thử 12: thay đổi không làm mất dữ liệu ==");
await t("Sửa bản đang xuất bản → tạo phiên bản mới, giữ bản duyệt + bản thư viện", (async () => {
  const tv0 = await docNow("thuvien/vpub"); await suaND(QL2, "vpub", { tieuDe: "Tiêu đề mới" });
  const nd = await docNow("noidung/vpub"), tv = await docNow("thuvien/vpub");
  if (nd.tt !== "nhap" || nd.ban !== 2 || !nd.duyet || nd.duyet.ban !== 1) throw new Error("phiên bản sai " + JSON.stringify([nd.tt, nd.ban, nd.duyet]));
  if (JSON.stringify(tv) !== JSON.stringify(tv0) || !tv.hien) throw new Error("bản thư viện bị ghi đè");
  const s = await thuVienHV(hv); if (!s.docs.find(d => d.id === "vpub" && d.data().tieuDe === tv0.tieuDe)) throw new Error("HV không còn thấy bản cũ"); })());
await t("Thay đổi phân quyền không đụng tới kho nội dung", (async () => { const a = JSON.stringify(await docNow("noidung/v01")); await capQuyen(QL, "gvs@x.com", { ghiChu: "đổi ghi chú" }); if (JSON.stringify(await docNow("noidung/v01")) !== a) throw new Error("đổi"); })());
await t("KHÔNG xoá tài liệu chưa lưu trữ", assertFails(deleteDoc(doc(ai(QL), "noidung/v01"))));
await t("KHÔNG xoá bản thư viện (chỉ được ẩn)", assertFails(deleteDoc(doc(ai(QL), "thuvien/vpub"))));

console.log("\n== Kiểm thử 13: không vượt quyền bằng URL / request / dữ liệu trình duyệt ==");
await t("GV KHÔNG tự sửa bảng quyền của mình", assertFails(setDoc(doc(ai("gva@x.com"), "phanquyen/gva@x.com"), { khoa: false, vaiTro: "qlcs", coSo: ["Bình Phú", "Kim Quan"], cap: { "video|*|*": { a: Q.HANH_DONG } }, capNhat: 1, capNhatBoi: "gva@x.com", hdMa: "x" })));
await t("GV bị khoá KHÔNG tự mở khoá", assertFails(setDoc(doc(ai("gvk@x.com"), "phanquyen/gvk@x.com"), { khoa: false }, { merge: true })));
await t("KHÔNG tạo tài liệu ở trạng thái Đã duyệt sẵn", assertFails((async () => { luc++; const d = Q.taoMoi("z1", { loai: "video", dm: "Hình hoạ cơ bản", cs: "Bình Phú", tieuDe: "z", nguon: VID }, "gva@x.com", luc, Q.maHd(luc));
  return lam("gva@x.com", "z1", { ...d, tt: "duyet", duyet: { ban: 1, tieuDe: "z", moTa: "", nguon: VID, boi: QL, luc } }); })()));
await t("KHÔNG tạo tài liệu mạo danh tác giả khác", assertFails((async () => { luc++; return lam("gva@x.com", "z2", Q.taoMoi("z2", { loai: "video", dm: "Hình hoạ cơ bản", cs: "Bình Phú", tieuDe: "z", nguon: VID }, "gvz@x.com", luc, Q.maHd(luc))); })()));
await t("KHÔNG ghi thẳng vào thư viện học viên khi không có quyền", assertFails(setDoc(doc(ai("gva@x.com"), "thuvien/va"), { loai: "video", dm: "x", cs: "Bình Phú", ban: 1, tieuDe: "x", moTa: "", nguon: VID, duyetBoi: QL, phamVi: "Bình Phú", hien: true, tu: 1, xbBoi: "gva@x.com", xbLuc: 1, hd: "xuatban", hdBoi: "gva@x.com", hdLuc: 1, hdMa: "x" })));
await t("Học viên KHÔNG đọc kho nội dung nháp", assertFails(getDoc(doc(hv, "noidung/v01"))));
await t("Học viên KHÔNG liệt kê thư viện thiếu lọc phạm vi", assertFails(getDocs(query(collection(hv, "thuvien"), where("hien", "==", true)))));
await t("Học viên KHÔNG đọc bản chưa xuất bản theo mã", assertFails(getDoc(doc(hv, "thuvien/vsch"))));
await t("Khách (chưa đăng nhập) KHÔNG đọc thư viện", assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "thuvien/vpub"))));
await t("Thao tác KHÔNG kèm nhật ký bị chặn", assertFails((async () => { const o = await docNow("noidung/v01"); luc++; return lam("gvs@x.com", "v01", Q.sua(o, { tieuDe: "k", moTa: o.moTa }, "gvs@x.com", luc, Q.maHd(luc)), [], { boLog: true }); })()));
await t("KHÔNG sửa / xoá nhật ký", (async () => { const s = await getDocs(collection(ai(QL), "noidung/v01/ls")); const id = s.docs[0].id;
  await assertFails(setDoc(doc(ai(QL), `noidung/v01/ls/${id}`), { ai: QL, luc: 1, hd: "duyet", ban: 1 })); await assertFails(deleteDoc(doc(ai(QL), `noidung/v01/ls/${id}`))); })());
await t("KHÔNG ghi nhật ký giả tên người khác", assertFails((async () => { const o = await docNow("noidung/v01"); luc++; const n2 = Q.sua(o, { tieuDe: "k2", moTa: o.moTa }, "gvs@x.com", luc, Q.maHd(luc));
  const f = ai("gvs@x.com"), b = writeBatch(f); b.set(doc(f, "noidung/v01"), n2); b.set(doc(f, `noidung/v01/ls/${n2.hdMa}`), { ...Q.nhatKy(n2, "gvs@x.com", luc), ai: QL }); return b.commit(); })()));
await t("KHÔNG đổi loại / cơ sở tài liệu để lách phạm vi", assertFails((async () => { const o = await docNow("noidung/v01"); luc++; return lam("gvs@x.com", "v01", { ...Q.sua(o, { tieuDe: o.tieuDe, moTa: o.moTa }, "gvs@x.com", luc, Q.maHd(luc)), cs: "Kim Quan" }); })()));

console.log("\n== Kiểm thử 14: lịch xuất bản xét lại quyền và trạng thái lúc thực hiện ==");
const tu = Date.now() + 4000;
await t("GV P lên lịch xuất bản vsch", assertSucceeds(xuatBan("gvp@x.com", "vsch", { tu })));
await t("Bản hẹn giờ chưa hiện cho học viên", assertFails(getDoc(doc(hv, "thuvien/vsch"))));
await t("KHÔNG kích hoạt trước giờ hẹn", assertFails(thaoTV("gvn@x.com", "vsch", "kichhoat", { hien: true, hd: "kichhoat" })));
await new Promise(r => setTimeout(r, Math.max(0, tu - Date.now()) + 800));
await t("Quản lý khoá người lên lịch", assertSucceeds(capQuyen(QL, "gvp@x.com", { khoa: true }, "khoa")));
await t("KT14: tới giờ nhưng người lên lịch đã bị khoá → KHÔNG kích hoạt", assertFails(thaoTV("gvn@x.com", "vsch", "kichhoat", { hien: true, hd: "kichhoat" })));
await t("Quản lý mở khoá", assertSucceeds(capQuyen(QL, "gvp@x.com", { khoa: false }, "mokhoa")));
await t("KT14: tới giờ, đủ điều kiện → nhân sự bất kỳ mở web là kích hoạt", assertSucceeds(thaoTV("gvn@x.com", "vsch", "kichhoat", { hien: true, hd: "kichhoat" })));
await t("Học viên thấy bản vừa tới giờ", assertSucceeds(getDoc(doc(hv, "thuvien/vsch"))));
const tu2 = Date.now() + 3000;
await t("GV P lên lịch xuất bản vrv", assertSucceeds(xuatBan("gvp@x.com", "vrv", { tu: tu2 })));
await t("Quản lý thu hồi duyệt vrv trước giờ hẹn (bản hẹn giờ bị huỷ cùng lúc)", assertSucceeds(thaoTV(QL, "vrv", "thuhoi", { hien: false, hd: "an" }, "Sai nội dung")));
await new Promise(r => setTimeout(r, Math.max(0, tu2 - Date.now()) + 800));
await t("KT14: tới giờ nhưng đã bị thu hồi duyệt → KHÔNG kích hoạt", assertFails(thaoTV("gvn@x.com", "vrv", "kichhoat", { hien: true, hd: "kichhoat" })));

console.log("\n== Ví dụ 7: thu hồi phê duyệt bản đang xuất bản ==");
await t("KHÔNG thu hồi duyệt mà vẫn để bản đang hiện", assertFails(thaoTV(QL, "vpub", "thuhoi", null, "Sai")));
await t("KHÔNG thu hồi không ghi lý do", assertFails(thaoTV(QL, "vpub", "thuhoi", { hien: false, hd: "an" }, "")));
await t("GV P (chỉ PUBLISH) KHÔNG thu hồi duyệt", assertFails(thaoTV("gvp@x.com", "vpub", "thuhoi", { hien: false, hd: "an" }, "x")));
await t("Quản lý thu hồi duyệt + ẩn bản đang hiện trong một lần ghi", assertSucceeds(thaoTV(QL, "vpub", "thuhoi", { hien: false, hd: "an" }, "Video sai tỉ lệ")));
await t("Học viên KHÔNG còn thấy bản bị thu hồi", (async () => { await assertFails(getDoc(doc(hv, "thuvien/vpub"))); const s = await thuVienHV(hv); if (s.docs.some(d => d.id === "vpub")) throw new Error("vẫn thấy"); })());
await t("KHÔNG xuất bản lại khi chưa duyệt lại (dùng lại bản cũ)", assertFails((async () => { const o = await docNow("noidung/vpub"), tv = await docNow("thuvien/vpub"); luc = Math.max(luc + 1, Date.now()); const ma = Q.maHd(luc);
  return lam(QL, "vpub", { ...o, hd: "xuatban", hdBoi: QL, hdLuc: luc, hdMa: ma }, [["thuvien/vpub", { ...tv, hien: true, tu: luc, xbBoi: QL, xbLuc: luc, hd: "xuatban", hdBoi: QL, hdLuc: luc, hdMa: ma }]]); })()));

console.log("\n== Kiểm thử 15: nhật ký đầy đủ người duyệt / xuất bản / đổi quyền ==");
await t("Nhật ký vpub có: tạo? xuất bản, đổi phạm vi, sửa, thu hồi (đúng người)", (async () => {
  const s = await getDocs(collection(ai(QL), "noidung/vpub/ls")); const hs = s.docs.map(d => d.data()).sort((a, b) => a.luc - b.luc).map(x => x.hd + ":" + x.ai);
  for (const k of ["xuatban:gvp@x.com", "phamvi:gvp@x.com", "sua:" + QL2, "thuhoi:" + QL]) if (!hs.includes(k)) throw new Error("thiếu " + k + " trong " + hs); })());
await t("Nhật ký e01 ghi người duyệt kèm nhận xét", (async () => { const s = await getDocs(collection(ai(QL), "noidung/e01/ls")); if (!s.docs.some(d => d.data().hd === "duyet" && d.data().ai === "qlcs@x.com" && d.data().nx === "Đạt")) throw new Error("thiếu"); })());
await t("Lịch sử phân quyền GV P có: cấp, khoá, mở khoá (người thực hiện = quản lý)", (async () => { const s = await getDocs(collection(ai(QL), "phanquyen/gvp@x.com/ls")); const hs = s.docs.map(d => d.data().hd + ":" + d.data().ai);
  for (const k of ["cap:" + QL, "khoa:" + QL, "mokhoa:" + QL]) if (!hs.includes(k)) throw new Error("thiếu " + k); })());
await t("Đổi quyền KHÔNG kèm lịch sử bị chặn", assertFails(setDoc(doc(ai(QL), "phanquyen/gva@x.com"), { khoa: false, vaiTro: "gv", coSo: ["Bình Phú"], cap: {}, capNhat: 9, capNhatBoi: QL, hdMa: "khong-co-log" })));
await t("GV KHÔNG đọc lịch sử phân quyền", assertFails(getDocs(collection(ai("gva@x.com"), "phanquyen/gva@x.com/ls"))));
await t("GV đọc được bảng quyền của chính mình (để hiện đúng nút)", assertSucceeds(getDoc(doc(ai("gva@x.com"), "phanquyen/gva@x.com"))));
await t("GV KHÔNG đọc bảng quyền người khác", assertFails(getDoc(doc(ai("gva@x.com"), "phanquyen/gvp@x.com"))));

console.log("\n== Vòng đời đầy đủ + lưu trữ / khôi phục / xoá ==");
await t("Yêu cầu sửa cần lý do", assertFails(buoc(QL, "va", "yeucausua", "")));
await t("Quản lý yêu cầu sửa (có lý do)", assertSucceeds(buoc(QL, "va", "yeucausua", "Thiếu bước dựng hình")));
await t("Tác giả sửa lại → phiên bản mới v2", assertSucceeds(suaND("gva@x.com", "va", { tieuDe: "Khối hộp (sửa)" })));
await t("Gửi lại", assertSucceeds(buoc("gva@x.com", "va", "gui")));
await t("Quản lý duyệt v2", assertSucceeds(buoc(QL, "va", "duyet")));
await t("Bản duyệt ghi đúng v2", (async () => { const d = await docNow("noidung/va"); if (d.duyet.ban !== 2 || d.duyet.tieuDe !== "Khối hộp (sửa)") throw new Error(JSON.stringify(d.duyet)); })());
await t("GV N lưu trữ n1", assertSucceeds(buoc("gvn@x.com", "n1", "luutru")));
await t("GV N KHÔNG khôi phục (thiếu RESTORE)", assertFails(buoc("gvn@x.com", "n1", "khoiphuc")));
await t("GV N KHÔNG xoá (thiếu DELETE)", assertFails(deleteDoc(doc(ai("gvn@x.com"), "noidung/n1"))));
await t("Quản lý xoá tài liệu đã lưu trữ", assertSucceeds(deleteDoc(doc(ai(QL), "noidung/n1"))));

console.log(`\nKẾT QUẢ: ${ok}/${n} đạt` + (loi.length ? "\nLỖI:\n - " + loi.join("\n - ") : ""));
await env.cleanup();
process.exit(loi.length ? 1 : 0);

