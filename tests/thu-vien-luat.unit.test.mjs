import { test } from "node:test";
import { strictEqual, deepStrictEqual, ok } from "node:assert";
import { ytId, kiemCanva, kiemLink, thaoTac, chuyen, luuNoiDung, taiLieuMoi, hocVienXem, khoaTrung } from "../assets/js/thu-vien-luat.js";

const QL = { admin: true, mail: "ql@x" }, GV = { gv: true, mail: "gv@x", quyen: { them: true } }, GV0 = { gv: true, mail: "gv0@x", quyen: {} };
const ks = (a, d) => thaoTac(a, d).map(x => x.k);

test("nhận đủ các dạng link YouTube, từ chối link lạ", () => {
  for (const l of ["https://youtu.be/vZdFuUTUeJw", "https://www.youtube.com/watch?v=vZdFuUTUeJw&t=3", "https://m.youtube.com/watch?v=vZdFuUTUeJw", "https://www.youtube.com/shorts/vZdFuUTUeJw", "https://www.youtube.com/embed/vZdFuUTUeJw"])
    strictEqual(ytId(l), "vZdFuUTUeJw", l);
  for (const l of ["http://youtu.be/vZdFuUTUeJw", "https://evil.com/watch?v=vZdFuUTUeJw", "https://youtu.be/ngan", "javascript:alert(1)"]) strictEqual(ytId(l), "", l);
  strictEqual(khoaTrung("video", "https://youtu.be/vZdFuUTUeJw"), khoaTrung("video", "https://www.youtube.com/watch?v=vZdFuUTUeJw"));
});
test("Canva: chỉ nhận link xem, từ chối link chỉnh sửa", () => {
  deepStrictEqual(kiemCanva("https://www.canva.com/design/DAF1/abc/view?utm_content=x"), { link: "https://www.canva.com/design/DAF1/abc/view", nhung: "https://www.canva.com/design/DAF1/abc/view?embed" });
  ok(kiemCanva("https://www.canva.com/design/DAF1/abc/edit").loi.includes("CHỈNH SỬA"));
  ok(kiemLink("ebook", "https://drive.google.com/x").loi);
});
test("quy trình đầy đủ: nháp → gửi → yêu cầu sửa → gửi lại → duyệt → xuất bản → ẩn → khôi phục → lưu trữ", () => {
  let d = taiLieuMoi(GV, "video", { tieuDe: "A", link: "https://www.youtube.com/watch?v=vZdFuUTUeJw", ytId: "vZdFuUTUeJw" }, false, 1);
  strictEqual(d.duyet, "nhap"); strictEqual(d.hienThi, "chua");
  ok(!ks(GV, d).includes("duyet"), "giáo viên không có nút duyệt");
  d = { ...d, ...chuyen(GV, d, "gui") }; strictEqual(d.duyet, "cho");
  ok(chuyen(GV, d, "duyet").loi, "giáo viên không tự duyệt");
  ok(chuyen(QL, d, "yeucausua", { lyDo: " " }).loi, "bắt buộc lý do");
  d = { ...d, ...chuyen(QL, d, "yeucausua", { lyDo: "Thiếu mô tả" }) }; strictEqual(d.duyet, "sua"); strictEqual(d.lyDo, "Thiếu mô tả");
  d = { ...d, ...chuyen(GV, d, "gui") }; strictEqual(d.duyet, "cho"); strictEqual(d.lyDo, "");
  ok(!ks(QL, d).includes("xuatban"), "chưa duyệt thì chưa xuất bản");
  d = { ...d, ...chuyen(QL, d, "duyet") }; strictEqual(d.phienDuyet, 1);
  d = { ...d, ...chuyen(QL, d, "xuatban") }; strictEqual(d.hienThi, "xuatban");
  ok(hocVienXem(d, { hocVien: true, mail: "hv@x" }));
  d = { ...d, ...chuyen(QL, d, "an") }; ok(!hocVienXem(d, { hocVien: true }));
  d = { ...d, ...chuyen(QL, d, "khoiphuc") }; strictEqual(d.hienThi, "xuatban");
  d = { ...d, ...chuyen(QL, d, "luutru") }; strictEqual(d.hienThi, "luutru"); ok(ks(QL, d).includes("xoa"));
  d = { ...d, ...chuyen(QL, d, "khoiphuc") }; strictEqual(d.hienThi, "chua", "khôi phục từ lưu trữ phải xuất bản lại");
});
test("sửa bản đã xuất bản: bản cũ vẫn hiển thị tới khi duyệt bản sửa", () => {
  const d = { ...taiLieuMoi(GV, "video", { tieuDe: "Cũ", link: "l", ytId: "x" }, false, 1), duyet: "daduyet", hienThi: "xuatban", phienDuyet: 1 };
  const moi = { ...d, ...luuNoiDung(GV, d, { tieuDe: "Mới", link: "l", ytId: "x" }, true) };
  strictEqual(moi.tieuDe, "Cũ"); strictEqual(moi.banSua.tieuDe, "Mới"); strictEqual(moi.duyet, "cho"); ok(hocVienXem(moi, { hocVien: true }));
  const tuChoi = { ...moi, ...chuyen(QL, moi, "tuchoi", { lyDo: "Chưa đạt" }) }; strictEqual(tuChoi.tieuDe, "Cũ"); ok(hocVienXem(tuChoi, { hocVien: true }));
  const duyet = { ...moi, ...chuyen(QL, moi, "duyet") }; strictEqual(duyet.tieuDe, "Mới"); strictEqual(duyet.banSua, null); strictEqual(duyet.phienDuyet, 2); strictEqual(duyet.hienThi, "xuatban");
});
test("phạm vi xem: khoá học, tài khoản cụ thể, công khai, lên lịch", () => {
  const d = { hienThi: "xuatban", phienDuyet: 1, phamViKieu: "khoa", phamViKhoa: ["Màu & bố cục màu"] };
  ok(!hocVienXem(d, { hocVien: true, khoa: ["Hình hoạ cơ bản"] })); ok(hocVienXem(d, { hocVien: true, khoa: ["Màu & bố cục màu"] }));
  ok(hocVienXem({ ...d, phamViKieu: "taikhoan", phamViMail: ["a@x"] }, { mail: "a@x" })); ok(!hocVienXem({ ...d, phamViKieu: "taikhoan", phamViMail: ["a@x"] }, { mail: "b@x", hocVien: true }));
  ok(hocVienXem({ ...d, phamViKieu: "congkhai" }, {})); ok(!hocVienXem({ ...d, phamViKieu: "hocvien" }, {}));
  ok(!hocVienXem({ ...d, phamViKieu: "congkhai", lichXuatBan: 2000 }, {}, 1000)); ok(hocVienXem({ ...d, phamViKieu: "congkhai", lichXuatBan: 2000 }, {}, 3000));
  ok(!hocVienXem({ ...d, phamViKieu: "congkhai", phienDuyet: 0 }, {}), "chưa duyệt thì không hiện dù đánh dấu xuất bản");
});
test("giáo viên không được cấp quyền: không có thao tác nào", () => {
  deepStrictEqual(ks(GV0, { duyet: "nhap", hienThi: "chua", nguoiTao: "gv0@x" }), []);
  deepStrictEqual(ks(GV0, { duyet: "daduyet", hienThi: "xuatban", nguoiTao: "khac@x", phienDuyet: 1 }), []);
});
