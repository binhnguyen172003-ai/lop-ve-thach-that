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
export const daBat = uid => { const k = doc(); return !!(k && uid && k.uid === uid && k.id); };
const coKhoa = uid => { const k = doc(); return !!(k && uid && k.uid === uid && (k.id || k.pin)); };

const VAN_TAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v3a8 8 0 0 1-1.2 4.3M8.5 7.6A5 5 0 0 1 17 11v1.5M7 11a5 5 0 0 1 .2-1.4M15 15.5a12 12 0 0 1-1 3.8M9.5 13.5v-2.4a2.5 2.5 0 0 1 5 0v.9M4.6 15.3A11 11 0 0 0 5 11a7 7 0 0 1 11.6-5.3M19 16.5c.2-1.1.3-2.3.2-3.5M6.8 18.6A10 10 0 0 0 7.6 16"/></svg>`;

function veKhoa(trangThai, loiRieng) {
  if (!ov) {
    ov = document.createElement("div"); ov.className = "vt-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "vt-tieude");
    ov.innerHTML = `<div class="vt-the"><p class="vt-tieude" id="vt-tieude"></p>
      <button type="button" class="vt-vong" aria-describedby="vt-loi">${VAN_TAY}<i class="vt-quet" aria-hidden="true"></i></button>
      <p class="vt-loi" id="vt-loi" role="status"></p>
      <div class="vt-pin" hidden><p class="vt-hoac">hoặc nhập mã PIN</p>
        <label class="otp"><span class="sr-only">Mã PIN 4 số</span><input inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" aria-label="Mã PIN 4 số">
          <span class="otp-o"></span><span class="otp-o"></span><span class="otp-o"></span><span class="otp-o"></span></label></div>
      <button type="button" class="linkish vt-mk">Dùng mật khẩu (đăng xuất)</button></div>`;
    document.body.append(ov); document.body.classList.add("vt-khoa");
    ov.querySelector(".vt-vong").onclick = moKhoa;
    const k = doc();
    ov.querySelector(".vt-vong").hidden = !(k && k.id); // chỉ có mã PIN (máy không có cảm biến): ẩn vòng vân tay
    if (k && k.pin) { const o = ov.querySelector(".vt-pin"); o.hidden = false; otp(o.querySelector(".otp"), async ma => {
      if (await bam(ma, k.pin.muoi) === k.pin.bam) { ghiSai(0); veKhoa("ok"); setTimeout(go, 900); return true; }
      const sai = ghiSai(soSai() + 1); if (sai >= 5) { ghi(null); go(); dangXuat(); return false; }
      veKhoa("loi", `Sai mã PIN (còn ${5 - sai} lần, hết lượt web sẽ đăng xuất).`); return false; }); }
    ov.querySelector(".vt-mk").onclick = () => { ghi(null); go(); dangXuat(); };
  }
  const chu = { cho: ["ĐÃ KHOÁ", "Chạm vào vân tay để mở khoá bằng cảm biến của máy."], quet: ["ĐANG QUÉT…", "Đặt ngón tay lên cảm biến hoặc nhìn vào camera."],
    ok: ["MỞ KHOÁ THÀNH CÔNG", `Chào mừng trở lại${nguoi && nguoi.displayName ? ", " + nguoi.displayName.split(/\s+/).pop() : ""}!`], loi: ["KHÔNG MỞ ĐƯỢC", "Chưa xác minh được vân tay. Chạm để thử lại."] }[trangThai];
  const k = doc(), chiPin = k && k.pin && !k.id;
  if (chiPin && trangThai === "cho") chu[1] = "Nhập mã PIN 4 số để mở khoá.";
  ov.dataset.tt = trangThai; ov.querySelector(".vt-tieude").textContent = chu[0]; ov.querySelector(".vt-loi").textContent = loiRieng || chu[1];
  if (trangThai === "cho") requestAnimationFrame(() => ov && (chiPin ? ov.querySelector(".otp input") : ov.querySelector(".vt-vong")).focus());
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
    else if (anLuc && Date.now() - anLuc > NGHI_LAU && nguoi && coKhoa(nguoi.uid) && !ov) veKhoa("cho");
  });
}
// Gọi mỗi lần trạng thái đăng nhập đổi
export function khiDangNhap(u) {
  nguoi = u || null;
  if (!u || !coKhoa(u.uid)) go(); // chưa đăng nhập / người khác dùng máy: bỏ màn khoá (màn đăng nhập vẫn cần mật khẩu)
}
// Bật khoá: tạo khoá vân tay mới trên máy này cho tài khoản đang đăng nhập
export async function bat(u) {
  const kq = await navigator.credentials.create({ publicKey: {
    challenge: ngauNhien(32), timeout: 60000, attestation: "none",
    rp: { name: "Học Vẽ Không Vui · Dreamers" },
    user: { id: new TextEncoder().encode(u.uid).slice(0, 64), name: u.email || u.uid, displayName: u.displayName || u.email || "Học viên" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" } } });
  const cu = doc(); ghi({ ...(cu && cu.uid === u.uid ? cu : {}), uid: u.uid, id: b64(kq.rawId), luc: Date.now() });
}
export function tat() { ghi(null); ghiSai(0); go(); }
export function tatVanTay(u) { const k = doc(); if (!k || k.uid !== u.uid) return; delete k.id; ghi(k.pin ? k : null); }

// ---- Mã PIN 4 số (dự phòng khi vân tay không nhận / máy không có cảm biến). Chỉ lưu bản băm SHA-256 kèm muối, không lưu mã thật.
const SAI = "lvkv-vantay-sai";
const soSai = () => { try { return +localStorage.getItem(SAI) || 0; } catch (e) { return 0; } };
const ghiSai = n => { try { n ? localStorage.setItem(SAI, n) : localStorage.removeItem(SAI); } catch (e) {} return n; };
const bam = async (ma, muoi) => b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(muoi + ":" + ma)));
export const coPin = uid => { const k = doc(); return !!(k && k.uid === uid && k.pin); };
// Ô nhập mã kiểu OTP: 4 ô vuông, ô đang gõ sáng viền, gõ đủ 4 số tự kiểm tra; sai thì rung đỏ rồi xoá
export function otp(nhan, xong) {
  const inp = nhan.querySelector("input"), o = [...nhan.querySelectorAll(".otp-o")];
  const ve = () => { const v = inp.value; o.forEach((x, i) => { x.textContent = v[i] ? (nhan.dataset.an === "0" ? v[i] : "•") : ""; x.classList.toggle("co", !!v[i]); x.classList.toggle("dang", document.activeElement === inp && i === Math.min(v.length, 3)); }); };
  inp.addEventListener("input", async () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 4); ve(); nhan.classList.remove("sai");
    if (inp.value.length === 4) { inp.disabled = true; const ok = await xong(inp.value); inp.disabled = false;
      if (ok === false) { nhan.classList.add("sai"); setTimeout(() => { inp.value = ""; ve(); nhan.classList.remove("sai"); inp.focus(); }, 650); } } });
  inp.addEventListener("focus", ve); inp.addEventListener("blur", ve); ve();
}
export async function datPin(u, ma) {
  const k = doc() && doc().uid === u.uid ? doc() : { uid: u.uid, luc: Date.now() };
  const muoi = b64(ngauNhien(16)); k.pin = { muoi, bam: await bam(ma, muoi) }; ghi(k); ghiSai(0);
}
export function boPin(u) { const k = doc(); if (!k || k.uid !== u.uid) return; delete k.pin; ghi(k.id ? k : null); }
