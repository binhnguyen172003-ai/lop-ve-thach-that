export const GO_KHOI_CA = "__go__";

// Quyền tham gia ca là dữ liệu riêng; điểm danh và hồ sơ luôn được giữ nguyên.
export function thuocDanhSachCa(hocVien, diemDanh = {}, coSo = "", khoaCa = "") {
  const chon = diemDanh["ds:" + khoaCa];
  if (chon === GO_KHOI_CA) return false;
  if (chon) return !coSo || chon === coSo;
  if (!coSo) return true;
  const daDiemDanhTai = diemDanh["cs:" + khoaCa];
  return daDiemDanhTai ? daDiemDanhTai === coSo : String(hocVien.coso || "").includes(coSo);
}
