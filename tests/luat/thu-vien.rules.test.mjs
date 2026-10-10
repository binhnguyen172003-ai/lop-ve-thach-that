// Kiểm thử LUẬT BẢO MẬT firestore.rules cho thư viện Video/Ebook trên Firebase Emulator (không đụng Firebase thật).
// Chạy: npm run test:rules
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";

const QL = "quanly.thu@dreamers.test", GV = "giaovien.thu@dreamers.test", GV2 = "giaovien2.thu@dreamers.test", HV = "hocvien.thu@dreamers.test", LA = "nguoila.thu@dreamers.test";
let env;
const db = mail => (mail ? env.authenticatedContext(mail, { email: mail, email_verified: true }) : env.unauthenticatedContext()).firestore();
const YT = "https://www.youtube.com/watch?v=vZdFuUTUeJw", CANVA = "https://www.canva.com/design/DAF123abc/XyZ_tok-1/view";
const moi = (o = {}) => ({ tieuDe: "Video thử", moTa: "", danhMuc: "Hình họa chân dung", link: YT, ytId: "vZdFuUTUeJw", anh: "https://i.ytimg.com/vi/vZdFuUTUeJw/hqdefault.jpg", thoiLuong: "",
  thuTu: 1, duyet: "nhap", hienThi: "chua", phamViKieu: "hocvien", phamViKhoa: [], phamViMail: [], phienDuyet: 0, banSua: null, lyDo: "",
  nguoiTao: GV, tenNguoiTao: "GV", tao: 1, guiLuc: 0, xuLyBoi: "", xuLyLuc: 0, lichXuatBan: 0, capNhat: 1, v: 1, ...o });

before(async () => {
  env = await initializeTestEnvironment({ projectId: "dreamers-kiem-thu", firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const d = c.firestore();
    await setDoc(doc(d, "admins", QL), { ten: "QL" });
    await setDoc(doc(d, "giaovien", GV), { ten: "GV", quyenTV: { video: { them: true }, ebook: {} } });
    await setDoc(doc(d, "giaovien", GV2), { ten: "GV2" });
    await setDoc(doc(d, "hocvien", HV), { ten: "HV", khoaHoc: ["Hình hoạ cơ bản"] });
    await setDoc(doc(d, "tv_video", "nhap-gv"), moi());
    await setDoc(doc(d, "tv_video", "cho-gv"), moi({ duyet: "cho", guiLuc: 2 }));
    await setDoc(doc(d, "tv_video", "xb"), moi({ duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1 }));
    await setDoc(doc(d, "tv_video", "xb-cong"), moi({ duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1, phamViKieu: "congkhai" }));
    await setDoc(doc(d, "tv_video", "an"), moi({ duyet: "daduyet", hienThi: "an", phienDuyet: 1 }));
  });
});

test("Giáo viên có quyền Thêm tạo được bản nháp / gửi duyệt của chính mình", async () => {
  await assertSucceeds(setDoc(doc(db(GV), "tv_video", "moi"), moi()));
  await assertSucceeds(setDoc(doc(db(GV), "tv_video", "moi2"), moi({ duyet: "cho", guiLuc: 5 })));
});
test("Giáo viên KHÔNG tự tạo tài liệu đã duyệt / đã xuất bản / công khai", async () => {
  await assertFails(setDoc(doc(db(GV), "tv_video", "x1"), moi({ duyet: "daduyet" })));
  await assertFails(setDoc(doc(db(GV), "tv_video", "x2"), moi({ duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1 })));
  await assertFails(setDoc(doc(db(GV), "tv_video", "x3"), moi({ phamViKieu: "congkhai" })));
});
test("Giáo viên chưa được cấp quyền không thêm được; quyền Video không sang Ebook", async () => {
  await assertFails(setDoc(doc(db(GV2), "tv_video", "x"), moi({ nguoiTao: GV2 })));
  await assertFails(setDoc(doc(db(GV), "tv_ebook", "x"), moi({ link: CANVA, ytId: "" })));
});
test("Giáo viên KHÔNG tự phê duyệt, không tự xuất bản, không đổi phạm vi", async () => {
  const d = doc(db(GV), "tv_video", "cho-gv");
  await assertFails(updateDoc(d, { duyet: "daduyet", phienDuyet: 1, v: 2 }));
  await assertFails(updateDoc(d, { duyet: "daduyet", v: 2 }));
  await assertFails(updateDoc(doc(db(GV), "tv_video", "xb"), { hienThi: "an", v: 2 }));
  await assertFails(updateDoc(d, { phamViKieu: "congkhai", v: 2 }));
});
test("Giáo viên gửi duyệt bản nháp của mình; sửa bản đã duyệt chỉ vào banSua", async () => {
  await assertSucceeds(updateDoc(doc(db(GV), "tv_video", "nhap-gv"), { duyet: "cho", guiLuc: 9, v: 2 }));
  await assertFails(updateDoc(doc(db(GV), "tv_video", "xb"), { tieuDe: "Đổi thẳng bản đang chạy", v: 2 }));
  await assertSucceeds(updateDoc(doc(db(GV), "tv_video", "xb"), { banSua: { tieuDe: "Bản sửa", link: YT, ytId: "vZdFuUTUeJw" }, duyet: "cho", v: 2 }));
});
test("Ghi cũ (v không tăng đúng 1) bị từ chối: hai quản lý cùng bấm không ghi đè nhau", async () => {
  await assertSucceeds(updateDoc(doc(db(QL), "tv_video", "cho-gv"), { duyet: "daduyet", phienDuyet: 1, v: 2 }));
  await assertFails(updateDoc(doc(db(QL), "tv_video", "cho-gv"), { duyet: "tuchoi", lyDo: "x", v: 2 }));
});
test("Không xuất bản được tài liệu chưa từng được duyệt (kể cả quản lý)", async () => {
  await assertFails(updateDoc(doc(db(QL), "tv_video", "cho-gv"), { hienThi: "xuatban", v: 2 }));
});
test("Link sai định dạng / link chỉnh sửa Canva bị từ chối", async () => {
  await assertFails(setDoc(doc(db(QL), "tv_video", "l1"), moi({ nguoiTao: QL, link: "https://evil.example/watch?v=vZdFuUTUeJw" })));
  await assertFails(setDoc(doc(db(QL), "tv_ebook", "l2"), moi({ nguoiTao: QL, link: "https://www.canva.com/design/DAF123abc/XyZ_tok-1/edit", ytId: "" })));
  await assertSucceeds(setDoc(doc(db(QL), "tv_ebook", "l3"), moi({ nguoiTao: QL, link: CANVA, ytId: "", anh: "" })));
});
test("Học viên chỉ đọc tài liệu đã xuất bản trong phạm vi; không đọc bản nháp, chờ duyệt, đã ẩn", async () => {
  await assertSucceeds(getDoc(doc(db(HV), "tv_video", "xb")));
  for (const id of ["nhap-gv", "cho-gv", "an"]) await assertFails(getDoc(doc(db(HV), "tv_video", id)));
  await assertSucceeds(getDocs(query(collection(db(HV), "tv_video"), where("hienThi", "==", "xuatban"), where("phamViKieu", "==", "hocvien"))));
  await assertFails(getDocs(collection(db(HV), "tv_video")));
});
test("Học viên không sửa / xoá được tài liệu; người lạ và khách chỉ thấy nội dung công khai", async () => {
  await assertFails(updateDoc(doc(db(HV), "tv_video", "xb"), { tieuDe: "x", v: 2 }));
  await assertFails(deleteDoc(doc(db(HV), "tv_video", "xb")));
  await assertSucceeds(getDoc(doc(db(null), "tv_video", "xb-cong")));
  await assertFails(getDoc(doc(db(null), "tv_video", "xb")));
  await assertFails(getDoc(doc(db(LA), "tv_video", "xb")));
});
test("Chỉ quản lý xoá, và chỉ khi đã lưu trữ", async () => {
  await assertFails(deleteDoc(doc(db(QL), "tv_video", "xb")));
  await assertSucceeds(updateDoc(doc(db(QL), "tv_video", "xb"), { hienThi: "luutru", v: 2 }));
  await assertFails(deleteDoc(doc(db(GV), "tv_video", "xb")));
  await assertSucceeds(deleteDoc(doc(db(QL), "tv_video", "xb")));
});
test("Giáo viên không tự cấp quyền thư viện; lịch sử không sửa được", async () => {
  await assertFails(setDoc(doc(db(GV), "giaovien", GV), { quyenTV: { video: { them: true, sua: true } } }, { merge: true }));
  await assertSucceeds(setDoc(doc(db(GV), "tv_lichsu", "a"), { thuVien: "video", ma: "x", hanhDong: "gui", tu: null, den: { duyet: "cho", hienThi: "chua" }, tieuDe: "t", lyDo: "", ai: GV, luc: 1 }));
  await assertFails(setDoc(doc(db(GV), "tv_lichsu", "b"), { thuVien: "video", ma: "x", hanhDong: "duyet", tu: null, den: null, tieuDe: "t", lyDo: "", ai: QL, luc: 1 }));
  await assertFails(updateDoc(doc(db(GV), "tv_lichsu", "a"), { lyDo: "sửa" }));
});
test("Tiến độ: học viên ghi của mình, không ghi của người khác", async () => {
  await assertSucceeds(setDoc(doc(db(HV), "tv_tiendo", HV), { video: { xb: 1 }, capNhat: 1 }));
  await assertFails(setDoc(doc(db(HV), "tv_tiendo", GV), { video: { xb: 1 } }));
  await assertFails(getDoc(doc(db(LA), "tv_tiendo", HV)));
});
test("Luật cũ không bị ảnh hưởng: học viên vẫn đọc giáo trình, không đọc danh sách học viên", async () => {
  await assertSucceeds(getDoc(doc(db(HV), "giaotrinh", "bai-1")));
  await assertFails(getDocs(collection(db(HV), "hocvien")));
  await assertFails(getDoc(doc(db(HV), "giaovien", GV)));
});
test("Đúng các truy vấn trang gửi đi đều được máy chủ chấp nhận theo vai trò", async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), "tv_video", "rieng"), moi({ duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1, phamViKieu: "taikhoan", phamViMail: [HV] })));
  const xb = (d, ...w) => getDocs(query(collection(d, "tv_video"), where("hienThi", "==", "xuatban"), ...w));
  await assertSucceeds(xb(db(null), where("phamViKieu", "==", "congkhai")));
  await assertFails(xb(db(null), where("phamViKieu", "==", "hocvien")));
  for (const k of ["congkhai", "hocvien", "khoa"]) await assertSucceeds(xb(db(HV), where("phamViKieu", "==", k)));
  const rieng = await assertSucceeds(xb(db(HV), where("phamViKieu", "==", "taikhoan"), where("phamViMail", "array-contains", HV)));
  if (rieng.size !== 1) throw new Error("Học viên không thấy tài liệu cấp riêng cho mình");
  await assertSucceeds(xb(db(LA), where("phamViKieu", "==", "taikhoan"), where("phamViMail", "array-contains", LA)));
  await assertSucceeds(xb(db(GV)));
  await assertSucceeds(getDocs(query(collection(db(GV), "tv_video"), where("nguoiTao", "==", GV))));
  await assertFails(getDocs(query(collection(db(GV), "tv_video"), where("nguoiTao", "==", GV2))));
  await assertSucceeds(getDocs(collection(db(QL), "tv_video")));
  await assertSucceeds(getDoc(doc(db(null), "tv_meta", "video")));
});
