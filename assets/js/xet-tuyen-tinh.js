// =====================================================================
//  BỘ TÍNH ĐIỂM XÉT TUYỂN — chỉ tính toán, không đọc/ghi máy chủ (dễ kiểm thử).
//  Mỗi trường / ngành / phương thức / năm là MỘT cấu hình riêng do quản lý nhập từ đề án tuyển sinh.
//  Cấu hình chưa được quản lý đánh dấu "đã xác minh" (kèm link nguồn) thì KHÔNG tính: báo "Chưa đủ dữ liệu tính điểm".
//  Không có tỷ lệ % trúng tuyển: chỉ có tổng điểm, chênh lệch so với mức tham chiếu và mức độ đáp ứng.
// =====================================================================

export const MON_VH = { toan: "Toán", van: "Ngữ văn", anh: "Tiếng Anh", ly: "Vật lí", hoa: "Hoá học", sinh: "Sinh học", su: "Lịch sử", dia: "Địa lí", gdktpl: "GD kinh tế và pháp luật", tin: "Tin học", cn: "Công nghệ" };
export const MON_NK = { hinhhoa: "Hình hoạ", bocucmau: "Bố cục màu", trangtrimau: "Trang trí màu", vemythuat: "Vẽ mỹ thuật", mythuat2: "Mỹ thuật 2", nkkhac: "Năng khiếu khác" };
export const tenMon = ma => MON_VH[ma] || MON_NK[ma] || ma;
export const laNK = ma => ma in MON_NK;
export const PHUONG_THUC = { thpt: "Điểm thi tốt nghiệp THPT", hocba: "Xét học bạ", kethop: "Xét tuyển kết hợp", khac: "Phương thức khác trường công bố" };
export const TRANG_THAI_NV = { chuaxd: "Chưa xác định", dukien: "Dự kiến", xacnhan: "Đã xác nhận" };
// Tổ hợp thường gặp ở khối vẽ — chỉ để gợi ý chọn môn khi nhập cấu hình; môn năng khiếu cụ thể phải đối chiếu đề án từng trường
export const TO_HOP = { H00: "Ngữ văn + 2 môn năng khiếu", H01: "Toán + Ngữ văn + năng khiếu", V00: "Toán + Vật lí + năng khiếu vẽ", V01: "Toán + Ngữ văn + năng khiếu vẽ" };
export const khoiToHop = th => /^H/i.test(th || "") ? "H" : /^V/i.test(th || "") ? "V" : "";

// Nguồn điểm của từng môn trong công thức
export const KY = ["10.hk1", "10.hk2", "10.cn", "11.hk1", "11.hk2", "11.cn", "12.hk1", "12.hk2", "12.cn"];
export const TEN_KY = k => { const [l, p] = k.split("."); return `${p === "cn" ? "Cả năm" : p === "hk1" ? "HK1" : "HK2"} lớp ${l}`; };
export const NGUON = {
  thpt: { ten: "Điểm thi tốt nghiệp THPT" },
  nk: { ten: "Điểm thi năng khiếu" },
  hb_cn3: { ten: "Học bạ: TB cả năm lớp 10, 11, 12", ky: ["10.cn", "11.cn", "12.cn"] },
  hb_cn12: { ten: "Học bạ: cả năm lớp 12", ky: ["12.cn"] },
  hb_cn2_hk1: { ten: "Học bạ: cả năm lớp 10, 11 + HK1 lớp 12", ky: ["10.cn", "11.cn", "12.hk1"] },
  hb_5hk: { ten: "Học bạ: 5 học kỳ (lớp 10, 11 + HK1 lớp 12)", ky: ["10.hk1", "10.hk2", "11.hk1", "11.hk2", "12.hk1"] },
  hb_6hk: { ten: "Học bạ: 6 học kỳ", ky: ["10.hk1", "10.hk2", "11.hk1", "11.hk2", "12.hk1", "12.hk2"] }
};

// "7,5" / "7.5" / " 8 " → số; "" → null (chưa nhập); chữ, dấu lạ → NaN. Số 0 là điểm hợp lệ, KHÁC chưa nhập.
export function soDiem(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : NaN;
  const t = String(x).trim(); if (t === "") return null;
  if (!/^\d{1,2}([.,]\d{1,3})?$/.test(t)) return NaN;
  return Number(t.replace(",", "."));
}
export const hopLeDiem = (v, max = 10) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export const coDiem = v => typeof v === "number" && Number.isFinite(v);
// Làm tròn kiểu thông thường (≥ 5 làm tròn lên) tới n chữ số thập phân, tránh sai số máy tính (2,675 → 2,68)
export function lamTron(v, n = 2) { const k = 10 ** n; return Math.round((v + Math.sign(v) * 1e-9) * k) / k; }
export const fmt = (v, n = 2) => coDiem(v) ? lamTron(v, n).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: n }) : "—";

// Thang điểm của tổng: quy về `thang` nếu cấu hình có, không thì là tổng có hệ số (10 × tổng hệ số)
export const thangCua = cfg => Number(cfg.thang) > 0 ? Number(cfg.thang) : 10 * (cfg.mon || []).reduce((a, m) => a + (Number(m.heSo) || 0), 0);

// Lỗi cấu hình (để quản lý sửa trước khi đánh dấu xác minh)
export function kiemTraCauHinh(cfg) {
  const loi = [];
  if (!cfg || !Array.isArray(cfg.mon) || !cfg.mon.length) loi.push("Chưa có môn nào trong công thức.");
  (cfg?.mon || []).forEach((m, i) => {
    if (!tenMon(m.ma) || !m.ma) loi.push(`Môn thứ ${i + 1} chưa chọn.`);
    if (!NGUON[m.nguon]) loi.push(`${tenMon(m.ma)}: chưa chọn nguồn điểm.`);
    if (!(Number(m.heSo) > 0 && Number(m.heSo) <= 10)) loi.push(`${tenMon(m.ma)}: hệ số phải lớn hơn 0 và không quá 10.`);
    if (m.nguon === "nk" && !laNK(m.ma)) loi.push(`${tenMon(m.ma)} không phải môn năng khiếu nhưng chọn nguồn "điểm thi năng khiếu".`);
    if (m.nguon !== "nk" && laNK(m.ma)) loi.push(`${tenMon(m.ma)} là môn năng khiếu, nguồn điểm phải là "điểm thi năng khiếu".`);
  });
  const trung = (cfg?.mon || []).map(m => m.ma + "|" + m.nguon).filter((k, i, a) => a.indexOf(k) !== i);
  if (trung.length) loi.push("Một môn bị khai báo hai lần cùng nguồn điểm (sẽ bị nhân đôi hệ số).");
  if (cfg && cfg.thang !== "" && cfg.thang !== null && cfg.thang !== undefined && !(Number(cfg.thang) > 0)) loi.push("Thang điểm quy đổi phải là số dương (VD 30) hoặc để trống.");
  if (cfg && !["khong", "cong", "giamdan"].includes(cfg.uuTien || "khong")) loi.push("Cách cộng điểm ưu tiên chưa hợp lệ.");
  if (cfg && !(Number.isInteger(Number(cfg.lamTron ?? 2)) && Number(cfg.lamTron ?? 2) >= 0 && Number(cfg.lamTron ?? 2) <= 3)) loi.push("Số chữ số làm tròn từ 0 đến 3.");
  (cfg?.dieuKien || []).forEach(d => { if (!d.ma || !(Number(d.toiThieu) >= 0 && Number(d.toiThieu) <= 10)) loi.push("Điều kiện điểm tối thiểu chưa hợp lệ."); });
  (cfg?.diemChuan || []).forEach(d => { if (!(Number.isInteger(+d.nam) && +d.nam > 2000) || !(Number(d.diem) >= 0 && Number(d.diem) <= thangCua(cfg) + 3)) loi.push("Điểm chuẩn tham khảo chưa hợp lệ (năm hoặc điểm)."); });
  return loi;
}
export const dungDuoc = cfg => !!(cfg && cfg.xacMinh && /^https:\/\//.test(cfg.nguonUrl || "") && !kiemTraCauHinh(cfg).length);

// Lấy điểm một môn theo nguồn.
// hs = { hocBa: { toan: { "10.cn": 7.5 } }, thpt: { toan: { v, loai } }, nk: { hinhhoa: { chinhThuc, duKien } }, duKien: { ma: v } (giáo viên ước tính) }
// Trả { v, loai: "chinhthuc" | "dukien" | null, thieu: [mô tả] }
export function diemMon(hs, ma, nguon) {
  hs = hs || {};
  if (nguon === "nk") {
    const x = (hs.nk || {})[ma] || {};
    if (coDiem(x.chinhThuc)) return { v: x.chinhThuc, loai: "chinhthuc", thieu: [] };
    if (coDiem((hs.duKien || {})[ma])) return { v: hs.duKien[ma], loai: "dukien", nguonDK: "giáo viên ước tính", thieu: [] };
    if (coDiem(x.duKien)) return { v: x.duKien, loai: "dukien", nguonDK: x.nguonDK || "điểm thi thử", thieu: [] };
    return { v: null, loai: null, thieu: [`${tenMon(ma)} (điểm năng khiếu)`] };
  }
  if (nguon === "thpt") {
    const x = (hs.thpt || {})[ma];
    if (x && coDiem(x.v) && x.loai === "chinhthuc") return { v: x.v, loai: "chinhthuc", thieu: [] };
    if (coDiem((hs.duKien || {})[ma])) return { v: hs.duKien[ma], loai: "dukien", nguonDK: "giáo viên ước tính", thieu: [] };
    if (x && coDiem(x.v)) return { v: x.v, loai: "dukien", nguonDK: "học viên dự kiến", thieu: [] };
    return { v: null, loai: null, thieu: [`${tenMon(ma)} (điểm thi THPT)`] };
  }
  const n = NGUON[nguon]; if (!n || !n.ky) return { v: null, loai: null, thieu: [`${tenMon(ma)} (nguồn điểm chưa rõ)`] };
  const hb = (hs.hocBa || {})[ma] || {}, thieu = n.ky.filter(k => !coDiem(hb[k]));
  if (thieu.length) return { v: null, loai: null, thieu: thieu.map(k => `${tenMon(ma)} ${TEN_KY(k)}`) };
  return { v: n.ky.reduce((a, k) => a + hb[k], 0) / n.ky.length, loai: "chinhthuc", thieu: [] };
}
// Điểm chuẩn tham chiếu: năm gần nhất TRƯỚC năm tuyển sinh của cấu hình (không lấy năm khác, ngành khác)
export function diemChuanThamChieu(cfg) {
  const nam = Number(cfg.nam) || 9999;
  const ds = (cfg.diemChuan || []).filter(d => Number(d.nam) < nam && coDiem(Number(d.diem))).sort((a, b) => b.nam - a.nam);
  return ds.length ? { nam: Number(ds[0].nam), diem: Number(ds[0].diem), ghiChu: ds[0].ghiChu || "" } : null;
}
// Điểm ưu tiên thực được cộng (quy định thang 30; thang khác quy đổi tỉ lệ). "giamdan": từ 22,5/30 trở lên giảm dần.
export function uuTienThuc(cfg, tongTruocUT, ut) {
  const u0 = Number(ut) || 0; if (!u0 || (cfg.uuTien || "khong") === "khong") return 0;
  const S = thangCua(cfg), u = u0 * S / 30;
  if (cfg.uuTien === "cong") return u;
  const nguong = S * 0.75; // 22,5 trên thang 30
  return tongTruocUT < nguong ? u : Math.max(0, (S - tongTruocUT) / (S - nguong) * u);
}
// Tính tổng điểm xét tuyển. ghiDe = { ma: điểm } để thử phương án (không đổi dữ liệu gốc).
export function tinhTong(cfg, hs, ghiDe = {}) {
  if (!cfg) return { ok: false, ly: "Chưa chọn trường/ngành có cấu hình tính điểm.", thieu: [] };
  if (!dungDuoc(cfg)) return { ok: false, ly: "Chưa đủ dữ liệu tính điểm: công thức của trường/ngành này chưa được xác minh từ đề án tuyển sinh chính thức.", thieu: [] };
  const ct = [], thieu = []; let duKien = false;
  for (const m of cfg.mon) {
    const g = ghiDe[m.ma];
    const d = coDiem(g) ? { v: g, loai: "giadinh", thieu: [] } : diemMon(hs, m.ma, m.nguon);
    if (coDiem(d.v) && !hopLeDiem(d.v)) return { ok: false, ly: `Điểm ${tenMon(m.ma)} ngoài thang 0–10.`, thieu: [] };
    if (!coDiem(d.v)) thieu.push(...d.thieu); else if (d.loai !== "chinhthuc") duKien = true;
    ct.push({ ma: m.ma, ten: tenMon(m.ma), nguon: m.nguon, heSo: Number(m.heSo), v: d.v, loai: d.loai, nguonDK: d.nguonDK || "" });
  }
  const dc = diemChuanThamChieu(cfg), S = thangCua(cfg);
  if (thieu.length) return { ok: false, ly: "Thiếu điểm bắt buộc nên chưa tính tổng.", thieu, chiTiet: ct, diemChuan: dc, thang: S };
  const sumH = cfg.mon.reduce((a, m) => a + Number(m.heSo), 0);
  const tho = ct.reduce((a, m) => a + m.v * m.heSo, 0);
  const truoc = Number(cfg.thang) > 0 ? tho * Number(cfg.thang) / (10 * sumH) : tho;
  const ut = uuTienThuc(cfg, truoc, hs && hs.uuTien);
  const n = Number(cfg.lamTron ?? 2), tong = lamTron(truoc + ut, n);
  const dk = (cfg.dieuKien || []).map(d => { const m = ct.find(x => x.ma === d.ma); const v = m ? m.v : diemMon(hs, d.ma, laNK(d.ma) ? "nk" : "thpt").v;
    return { ma: d.ma, ten: tenMon(d.ma), toiThieu: Number(d.toiThieu), v, dat: coDiem(v) ? v >= Number(d.toiThieu) : null }; });
  return { ok: true, tong, truocUuTien: lamTron(truoc, n), uuTien: lamTron(ut, n), duKien, chiTiet: ct, dieuKien: dk, diemChuan: dc, thang: S,
    chenh: dc ? lamTron(tong - dc.diem, n) : null };
}

// Mức độ đáp ứng (nội bộ giáo viên). Ngưỡng theo tỉ lệ thang: thiếu > 5% thang (1,5/30) = cần cải thiện nhiều; cao hơn ≥ 0,5/30 = cao hơn mức tham chiếu.
export const MUC = { chua: "Chưa đủ dữ liệu đánh giá", nhieu: "Cần cải thiện nhiều", gan: "Đang tiến gần mục tiêu", dat: "Đạt mức điểm tham chiếu", cao: "Cao hơn mức điểm tham chiếu" };
export function mucDo(kq, mucTieu) {
  if (!kq || !kq.ok) return { ma: "chua", ten: MUC.chua };
  const ref = coDiem(mucTieu) ? mucTieu : kq.diemChuan ? kq.diemChuan.diem : null;
  if (!coDiem(ref)) return { ma: "chua", ten: MUC.chua };
  const S = kq.thang, gap = lamTron(kq.tong - ref, 4);
  const ma = gap < -0.05 * S ? "nhieu" : gap < 0 ? "gan" : gap < S / 60 ? "dat" : "cao";
  if (kq.dieuKien && kq.dieuKien.some(d => d.dat === false)) return { ma: ma === "cao" || ma === "dat" ? "gan" : ma, ten: (ma === "cao" || ma === "dat" ? MUC.gan : MUC[ma]) + " · chưa đạt điều kiện môn", gap, ref };
  return { ma, ten: MUC[ma], gap, ref };
}

// "CẦN BAO NHIÊU ĐIỂM ĐỂ ĐẠT MỤC TIÊU?"
// coDinh: { ma: điểm } môn giữ cố định (đã có hoặc giáo viên nhập); các môn còn lại là ẩn số.
// mucTieuMon: { ma: điểm } mục tiêu từng môn giáo viên đặt (dùng cho phương án "giữ mục tiêu các môn khác").
export function canDat(cfg, hs, mucTieu, coDinh = {}, mucTieuMon = {}) {
  if (!dungDuoc(cfg)) return { ok: false, ly: "Chưa đủ dữ liệu tính điểm: công thức chưa được xác minh." };
  if (!(coDiem(mucTieu) && mucTieu > 0)) return { ok: false, ly: "Nhập tổng điểm mục tiêu." };
  const n = Number(cfg.lamTron ?? 2), cd = {};
  cfg.mon.forEach(m => { const v = coDinh[m.ma]; if (coDiem(v)) cd[m.ma] = v; });
  const an = cfg.mon.map(m => m.ma).filter(ma => !(ma in cd));
  const tong = gd => { const k = tinhTong(cfg, { ...hs, uuTien: hs && hs.uuTien }, { ...cd, ...gd }); return k.ok ? k.tong : NaN; };
  // Tìm điểm nhỏ nhất (bước 0,01) để tổng ≥ mục tiêu khi các ẩn số theo hàm f(x)
  const timNho = f => { if (!(tong(f(10)) >= mucTieu - 1e-9)) return null; let lo = 0, hi = 10;
    if (tong(f(0)) >= mucTieu - 1e-9) return 0;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (tong(f(mid)) >= mucTieu - 1e-9) hi = mid; else lo = mid; }
    return Math.ceil(hi * 100 - 1e-6) / 100; };
  if (!an.length) { const t = tong({}); return { ok: true, an, phuongAn: [], tongHienTai: t, dat: t >= mucTieu, khaThi: t >= mucTieu }; }
  const phuongAn = [];
  if (an.length === 1) {
    const x = timNho(x => ({ [an[0]]: x }));
    phuongAn.push({ ten: `Môn còn lại: ${tenMon(an[0])}`, mon: x === null ? null : { [an[0]]: x }, khaThi: x !== null });
  } else {
    const x = timNho(x => Object.fromEntries(an.map(ma => [ma, x])));
    phuongAn.push({ ten: "Các môn chưa có điểm đạt cùng một mức", mon: x === null ? null : Object.fromEntries(an.map(ma => [ma, x])), khaThi: x !== null });
    // Giữ mục tiêu giáo viên đặt cho các môn khác, tính môn còn lại cần bao nhiêu
    an.forEach(ma => { const khac = an.filter(m => m !== ma);
      if (!khac.every(m => coDiem(mucTieuMon[m]))) return;
      const y = timNho(v => ({ ...Object.fromEntries(khac.map(m => [m, mucTieuMon[m]])), [ma]: v }));
      phuongAn.push({ ten: `Giữ mục tiêu ${khac.map(tenMon).join(", ")}, tính ${tenMon(ma)}`, mon: y === null ? null : { ...Object.fromEntries(khac.map(m => [m, mucTieuMon[m]])), [ma]: y }, khaThi: y !== null, tinh: ma });
    });
  }
  return { ok: true, an, phuongAn, khaThi: phuongAn.some(p => p.khaThi), lamTron: n };
}
// Môn cần cải thiện: điểm thấp hơn mức đều nhau cần có để chạm mức tham chiếu (hoặc thấp hơn mục tiêu môn giáo viên đặt)
export function monCanCaiThien(cfg, kq, ref, mucTieuMon = {}) {
  if (!kq || !kq.chiTiet) return [];
  const out = kq.chiTiet.filter(m => coDiem(m.v) && coDiem(mucTieuMon[m.ma]) && m.v < mucTieuMon[m.ma]).map(m => m.ma);
  if (kq.ok && coDiem(ref) && kq.tong < ref) {
    const r = canDat(cfg, {}, ref, {}, {}); const muc = r.ok && r.phuongAn[0] && r.phuongAn[0].mon ? Object.values(r.phuongAn[0].mon)[0] : null;
    if (coDiem(muc)) kq.chiTiet.forEach(m => { if (coDiem(m.v) && m.v < muc && !out.includes(m.ma)) out.push(m.ma); });
  }
  return out;
}
// Thống kê điểm năng khiếu một môn: chỉ bài thi thử / kiểm tra được đánh dấu hợp lệ; KHÔNG dùng điểm bài tập thường ngày
export function thongKeNK(ds, ma) {
  const tt = (ds || []).filter(x => x.mon === ma && x.loai === "thithu" && x.hopLe !== false && coDiem(x.diem)).sort((a, b) => String(a.ngay).localeCompare(String(b.ngay)) || (a.luc || 0) - (b.luc || 0));
  const lop = (ds || []).filter(x => x.mon === ma && x.loai === "trenlop" && x.hopLe !== false && coDiem(x.diem));
  const ct = (ds || []).filter(x => x.mon === ma && x.loai === "chinhthuc" && coDiem(x.diem)).sort((a, b) => (b.luc || 0) - (a.luc || 0))[0];
  const tb = tt.length ? tt.reduce((a, x) => a + x.diem, 0) / tt.length : null;
  // Xu hướng: chênh giữa trung bình 2 bài gần nhất và 2 bài trước đó (cần ít nhất 3 bài)
  let xuHuong = null; if (tt.length >= 3) { const d = tt.slice(-2), t = tt.slice(-4, -2); xuHuong = d.reduce((a, x) => a + x.diem, 0) / d.length - t.reduce((a, x) => a + x.diem, 0) / t.length; }
  return { soBai: tt.length, ganNhat: tt.length ? tt[tt.length - 1] : null, caoNhat: tt.length ? Math.max(...tt.map(x => x.diem)) : null, tb, xuHuong,
    tbTrenLop: lop.length ? lop.reduce((a, x) => a + x.diem, 0) / lop.length : null, chinhThuc: ct ? ct.diem : null };
}
