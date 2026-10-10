// Khoá nhanh bằng vân tay / Face ID trên máy này (WebAuthn, cảm biến thật của điện thoại / máy tính).
// Đây là KHOÁ TRÊN THIẾT BỊ giống khoá ứng dụng: đăng nhập vẫn bằng Gmail + mật khẩu như cũ,
// sau đó mỗi lần mở lại web trên máy đã bật, phải chạm vân tay mới xem được nội dung.
const KHOA = "lvkv-vantay";
const NGHI_LAU = 5 * 60 * 1000; // rời web quá 5 phút thì khoá lại
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tuB64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const ngauNhien = n => crypto.getRandomValues(new Uint8Array(n));
const doc = () => { try { return JSON.parse(localStorage.getItem(KHOA) || "null"); } catch (e) { return null; } };
const ghi = v => { try { v ? localStorage.setItem(KHOA, JSON.stringify(v)) : localStorage.removeItem(KHOA); } catch (e) {} };

let ov = null, nguoi = null, dangXuat = () => {}, anLuc = 0;

export const hoTro = async () => {
  try { return !!(window.PublicKeyCredential && navigator.credentials && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
};
export const daBat = uid => { const k = doc(); return !!(k && uid && k.uid === uid); };

const VAN_TAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v3a8 8 0 0 1-1.2 4.3M8.5 7.6A5 5 0 0 1 17 11v1.5M7 11a5 5 0 0 1 .2-1.4M15 15.5a12 12 0 0 1-1 3.8M9.5 13.5v-2.4a2.5 2.5 0 0 1 5 0v.9M4.6 15.3A11 11 0 0 0 5 11a7 7 0 0 1 11.6-5.3M19 16.5c.2-1.1.3-2.3.2-3.5M6.8 18.6A10 10 0 0 0 7.6 16"/></svg>`;

function veKhoa(trangThai) {
  if (!ov) {
    ov = document.createElement("div"); ov.className = "vt-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "vt-tieude");
    ov.innerHTML = `<div class="vt-the"><p class="vt-tieude" id="vt-tieude"></p>
      <button type="button" class="vt-vong" aria-describedby="vt-loi">${VAN_TAY}<i class="vt-quet" aria-hidden="true"></i></button>
      <p class="vt-loi" id="vt-loi" role="status"></p>
      <button type="button" class="linkish vt-mk">Dùng mật khẩu (đăng xuất)</button></div>`;
    document.body.append(ov); document.body.classList.add("vt-khoa");
    ov.querySelector(".vt-vong").onclick = moKhoa;
    ov.querySelector(".vt-mk").onclick = () => { ghi(null); go(); dangXuat(); };
  }
  const chu = { cho: ["ĐÃ KHOÁ", "Chạm vào vân tay để mở khoá bằng cảm biến của máy."], quet: ["ĐANG QUÉT…", "Đặt ngón tay lên cảm biến hoặc nhìn vào camera."],
    ok: ["MỞ KHOÁ THÀNH CÔNG", `Chào mừng trở lại${nguoi && nguoi.displayName ? ", " + nguoi.displayName.split(/\s+/).pop() : ""}!`], loi: ["KHÔNG MỞ ĐƯỢC", "Chưa xác minh được vân tay. Chạm để thử lại."] }[trangThai];
  ov.dataset.tt = trangThai; ov.querySelector(".vt-tieude").textContent = chu[0]; ov.querySelector(".vt-loi").textContent = chu[1];
  if (trangThai === "cho") requestAnimationFrame(() => ov && ov.querySelector(".vt-vong").focus());
}
function go() { if (ov) { ov.remove(); ov = null; } document.body.classList.remove("vt-khoa"); }

async function moKhoa() {
  const k = doc(); if (!k || !ov || ov.dataset.tt === "quet") return;
  veKhoa("quet");
  try {
    const kq = await navigator.credentials.get({ publicKey: { challenge: ngauNhien(32), timeout: 60000, userVerification: "required",
      allowCredentials: [{ type: "public-key", id: tuB64(k.id), transports: ["internal"] }] } });
    if (!kq || b64(kq.rawId) !== k.id) throw new Error("sai");
    veKhoa("ok"); setTimeout(go, 900);
  } catch (e) { veKhoa("loi"); }
}

// Gọi ngay khi web mở: máy đã bật khoá thì che nội dung trước khi kịp hiện
export function khoiDong(opts = {}) {
  dangXuat = opts.dangXuat || dangXuat;
  if (doc()) veKhoa("cho");
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) anLuc = Date.now();
    else if (anLuc && Date.now() - anLuc > NGHI_LAU && nguoi && daBat(nguoi.uid) && !ov) veKhoa("cho");
  });
}
// Gọi mỗi lần trạng thái đăng nhập đổi
export function khiDangNhap(u) {
  nguoi = u || null;
  if (!u || !daBat(u.uid)) go(); // chưa đăng nhập / người khác dùng máy: bỏ màn khoá (màn đăng nhập vẫn cần mật khẩu)
}
// Bật khoá: tạo khoá vân tay mới trên máy này cho tài khoản đang đăng nhập
export async function bat(u) {
  const kq = await navigator.credentials.create({ publicKey: {
    challenge: ngauNhien(32), timeout: 60000, attestation: "none",
    rp: { name: "Học Vẽ Không Vui · Dreamers" },
    user: { id: new TextEncoder().encode(u.uid).slice(0, 64), name: u.email || u.uid, displayName: u.displayName || u.email || "Học viên" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" } } });
  ghi({ uid: u.uid, id: b64(kq.rawId), luc: Date.now() });
}
export function tat() { ghi(null); go(); }
