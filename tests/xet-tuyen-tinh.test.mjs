// Kiểm thử bộ tính điểm xét tuyển. Chạy: node tests/xet-tuyen-tinh.test.mjs (cấu hình trong file chỉ để thử, không phải công thức thật)
import assert from "node:assert/strict";
import * as T from "../assets/js/xet-tuyen-tinh.js";
let n = 0; const t = (ten, f) => { f(); n++; console.log("✓", ten); };
// Cấu hình KIỂM THỬ (không phải công thức thật của trường nào)
const base = { xacMinh: true, nguonUrl: "https://vi-du.test/de-an", nam: 2027, lamTron: 2, uuTien: "khong",
  mon: [{ ma: "toan", nguon: "thpt", heSo: 1 }, { ma: "hinhhoa", nguon: "nk", heSo: 1 }, { ma: "bocucmau", nguon: "nk", heSo: 1 }], diemChuan: [{ nam: 2026, diem: 25 }, { nam: 2025, diem: 24 }, { nam: 2027, diem: 26 }] };
const hs = { thpt: { toan: { v: 7, loai: "chinhthuc" } }, nk: { hinhhoa: { chinhThuc: 8 }, bocucmau: { chinhThuc: 8.5 } } };
t("soDiem: dấu phẩy, dấu chấm, rỗng, chữ, số 0", () => {
  assert.equal(T.soDiem("7,5"), 7.5); assert.equal(T.soDiem("7.25"), 7.25); assert.equal(T.soDiem(""), null); assert.equal(T.soDiem("   "), null);
  assert.ok(Number.isNaN(T.soDiem("7a"))); assert.ok(Number.isNaN(T.soDiem("-1"))); assert.ok(Number.isNaN(T.soDiem("7,5,1"))); assert.equal(T.soDiem("0"), 0); assert.equal(T.soDiem(0), 0);
  assert.equal(T.hopLeDiem(10.5), false); assert.equal(T.hopLeDiem(0), true); });
t("làm tròn đúng (2,675 → 2,68; 23,345 → 23,35)", () => { assert.equal(T.lamTron(2.675), 2.68); assert.equal(T.lamTron(23.345), 23.35); assert.equal(T.lamTron(1.005), 1.01); });
t("cấu hình chưa xác minh → không tính", () => { const k = T.tinhTong({ ...base, xacMinh: false }, hs); assert.equal(k.ok, false); assert.match(k.ly, /Chưa đủ dữ liệu tính điểm/); });
t("thiếu link nguồn → không tính", () => assert.equal(T.tinhTong({ ...base, nguonUrl: "" }, hs).ok, false));
t("tổng 3 môn không hệ số", () => { const k = T.tinhTong(base, hs); assert.equal(k.ok, true); assert.equal(k.tong, 23.5); assert.equal(k.duKien, false); });
t("điểm chuẩn: lấy năm gần nhất TRƯỚC năm tuyển sinh, không lấy năm khác", () => { const k = T.tinhTong(base, hs); assert.equal(k.diemChuan.nam, 2026); assert.equal(k.chenh, -1.5); });
t("nguyện vọng 2 cao hơn tham chiếu", () => { const k = T.tinhTong({ ...base, diemChuan: [{ nam: 2026, diem: 22.5 }] }, hs); assert.equal(k.chenh, 1); });
t("hệ số: Toán ×2 quy về thang 30", () => { const c = { ...base, thang: 30, mon: [{ ma: "toan", nguon: "thpt", heSo: 2 }, ...base.mon.slice(1)] };
  const k = T.tinhTong(c, hs); assert.equal(k.tong, T.lamTron((7 * 2 + 8 + 8.5) * 30 / 40)); });
t("hệ số giữ nguyên thang 40 khi không quy đổi (không nhân đôi)", () => { const c = { ...base, mon: [{ ma: "toan", nguon: "thpt", heSo: 1 }, { ma: "hinhhoa", nguon: "nk", heSo: 2 }] };
  assert.equal(T.tinhTong(c, hs).tong, 23); assert.equal(T.thangCua(c), 30); });
t("khai báo trùng môn bị báo lỗi cấu hình", () => assert.ok(T.kiemTraCauHinh({ ...base, mon: [...base.mon, { ma: "toan", nguon: "thpt", heSo: 1 }] }).some(x => /nhân đôi/.test(x))));
t("thiếu điểm bắt buộc → không tính, liệt kê thiếu", () => { const k = T.tinhTong(base, { thpt: {}, nk: hs.nk }); assert.equal(k.ok, false); assert.deepEqual(k.thieu, ["Toán (điểm thi THPT)"]); });
t("điểm 0 nhập chủ động vẫn tính", () => { const k = T.tinhTong(base, { ...hs, thpt: { toan: { v: 0, loai: "chinhthuc" } } }); assert.equal(k.ok, true); assert.equal(k.tong, 16.5); });
t("điểm ngoài thang bị chặn", () => assert.equal(T.tinhTong(base, { ...hs, thpt: { toan: { v: 11, loai: "chinhthuc" } } }).ok, false));
t("học bạ 5 học kỳ: trung bình đúng các kỳ, thiếu kỳ thì báo", () => {
  const c = { ...base, diemChuan: [], mon: [{ ma: "van", nguon: "hb_5hk", heSo: 1 }] };
  const hb = { van: { "10.hk1": 7, "10.hk2": 8, "11.hk1": 7.5, "11.hk2": 8.5, "12.hk1": 9, "12.hk2": 1, "12.cn": 1 } };
  assert.equal(T.tinhTong(c, { hocBa: hb }).tong, 8); delete hb.van["11.hk2"];
  const k = T.tinhTong(c, { hocBa: hb }); assert.equal(k.ok, false); assert.deepEqual(k.thieu, ["Ngữ văn HK2 lớp 11"]); });
t("đổi nguyện vọng: kết quả tính lại theo cấu hình mới, không giữ kết quả cũ", () => {
  const c2 = { ...base, diemChuan: [], mon: [{ ma: "van", nguon: "hb_cn12", heSo: 1 }] };
  assert.equal(T.tinhTong(c2, { ...hs, hocBa: { van: { "12.cn": 6.5 } } }).tong, 6.5); assert.equal(T.tinhTong(base, hs).tong, 23.5); });
t("năng khiếu chưa thi: dùng dự kiến, đánh dấu dự kiến", () => { const k = T.tinhTong(base, { thpt: hs.thpt, nk: { hinhhoa: { duKien: 7 }, bocucmau: { chinhThuc: 8 } } }); assert.equal(k.tong, 22); assert.equal(k.duKien, true); });
t("ưu tiên cộng thẳng 0,75 trên thang 30", () => assert.equal(T.tinhTong({ ...base, uuTien: "cong" }, { ...hs, uuTien: 0.75 }).tong, 24.25));
t("ưu tiên giảm dần khi ≥ 22,5: (30 − 23,5)/7,5 × 0,75 = 0,65", () => assert.equal(T.tinhTong({ ...base, uuTien: "giamdan" }, { ...hs, uuTien: 0.75 }).tong, 24.15));
t("ưu tiên dưới 22,5 cộng đủ", () => assert.equal(T.tinhTong({ ...base, uuTien: "giamdan" }, { ...hs, nk: { hinhhoa: { chinhThuc: 6 }, bocucmau: { chinhThuc: 6 } }, uuTien: 0.5 }).tong, 19.5));
t("không áp ưu tiên khi cấu hình không cho", () => assert.equal(T.tinhTong(base, { ...hs, uuTien: 2 }).tong, 23.5));
t("cần bao nhiêu: 1 môn còn lại", () => { const r = T.canDat(base, hs, 25, { toan: 7, hinhhoa: 8 }); assert.equal(r.phuongAn[0].mon.bocucmau, 10); assert.equal(r.khaThi, true); });
t("cần bao nhiêu: vượt 10 → không khả thi", () => { const r = T.canDat(base, hs, 25.5, { toan: 7, hinhhoa: 8 }); assert.equal(r.khaThi, false); assert.equal(r.phuongAn[0].mon, null); });
t("cần bao nhiêu: nhiều môn ẩn → phương án đều nhau + phương án giữ mục tiêu", () => {
  const r = T.canDat(base, hs, 24, { toan: 7 }, { hinhhoa: 8.5, bocucmau: 9 }); assert.equal(r.phuongAn[0].mon.hinhhoa, 8.5); assert.equal(r.phuongAn.length, 3);
  assert.equal(r.phuongAn.find(p => p.tinh === "bocucmau").mon.bocucmau, 8.5); });
t("cần bao nhiêu: không có mục tiêu môn thì chỉ một phương án đều nhau (không bịa thêm)", () => assert.equal(T.canDat(base, hs, 24, { toan: 7 }).phuongAn.length, 1));
t("cần bao nhiêu có hệ số", () => { const c = { ...base, mon: [{ ma: "toan", nguon: "thpt", heSo: 1 }, { ma: "hinhhoa", nguon: "nk", heSo: 2 }] };
  assert.equal(T.canDat(c, hs, 25, { toan: 7 }).phuongAn[0].mon.hinhhoa, 9); });
t("mức độ: không có tham chiếu → chưa đủ dữ liệu", () => assert.equal(T.mucDo(T.tinhTong({ ...base, diemChuan: [] }, hs)).ma, "chua"));
t("mức độ theo chênh lệch", () => { const k = T.tinhTong(base, hs); assert.equal(T.mucDo(k).ma, "gan"); assert.equal(T.mucDo(k, 25.5).ma, "nhieu"); assert.equal(T.mucDo(k, 24).ma, "gan"); assert.equal(T.mucDo(k, 23.5).ma, "dat"); assert.equal(T.mucDo(k, 22).ma, "cao"); });
t("điều kiện môn chưa đạt hạ mức đánh giá", () => { const k = T.tinhTong({ ...base, dieuKien: [{ ma: "toan", toiThieu: 7.5 }] }, hs); assert.equal(k.dieuKien[0].dat, false); assert.match(T.mucDo(k, 20).ten, /chưa đạt điều kiện/); });
t("thống kê năng khiếu chỉ lấy bài thi thử hợp lệ", () => { const ds = [{ mon: "hinhhoa", loai: "thithu", diem: 6, ngay: "2026-09-01" }, { mon: "hinhhoa", loai: "thithu", diem: 7, ngay: "2026-09-10" },
  { mon: "hinhhoa", loai: "thithu", diem: 2, ngay: "2026-09-12", hopLe: false }, { mon: "hinhhoa", loai: "trenlop", diem: 9.5, ngay: "2026-09-15" }, { mon: "hinhhoa", loai: "thithu", diem: 8, ngay: "2026-09-20" }];
  const s = T.thongKeNK(ds, "hinhhoa"); assert.equal(s.soBai, 3); assert.equal(s.caoNhat, 8); assert.equal(s.ganNhat.diem, 8); assert.equal(T.lamTron(s.tb), 7); assert.equal(s.tbTrenLop, 9.5); assert.equal(s.xuHuong, 1.5); });
console.log(`\n${n} kiểm thử đạt`);
