// Cơ chế khoá cục bộ đã ngừng dùng; đăng nhập bằng Firebase Gmail/mật khẩu.
const clearLegacyLock = () => {
  try { localStorage.removeItem("lvkv-vantay"); localStorage.removeItem("lvkv-vantay-sai"); } catch (_) {}
  document.querySelector(".vt-ov")?.remove();
  document.body.classList.remove("vt-khoa");
};
export const khoiDong = clearLegacyLock;
export const khiDangNhap = clearLegacyLock;
export const tat = clearLegacyLock;
export const hoTro = async () => false;
export const daBat = () => false;
export const coPin = () => false;
export const tatVanTay = clearLegacyLock;
export const boPin = clearLegacyLock;
export const bat = async () => { throw new Error("Tính năng đã ngừng dùng"); };
export const datPin = bat;
export const otp = () => {};
