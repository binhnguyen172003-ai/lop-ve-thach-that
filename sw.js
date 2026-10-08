// Bộ nhớ đệm giúp web mở tức thì ở lần sau và vẫn xem được khi mất mạng.
// Thường không cần sửa file này. Mỗi lần đưa web lên, mã phiên bản (?v=) đổi nên bản cũ tự bị thay.
const V = new URL(self.location.href).searchParams.get("v") || "dev";
const TRANG = "lvkv-trang-" + V;      // file của web (theo phiên bản)
const THU_VIEN = "lvkv-thu-vien";     // thư viện Firebase + phông chữ (không bao giờ đổi)

self.addEventListener("install", e => {
  e.waitUntil(caches.open(TRANG).then(c => c.add("./")).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("lvkv-trang-") && k !== TRANG).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const luu = (ten, req, res) => { if (res && res.ok) { const c = res.clone(); caches.open(ten).then(x => x.put(req, c)); } return res; };
// Lấy từ bộ nhớ trước (nhanh nhất), không có mới tải mạng.
const nhoTruoc = (ten, req) => caches.match(req).then(r => r || fetch(req).then(res => luu(ten, req, res)));
// Trả bản đã lưu ngay, đồng thời tải bản mới cho lần sau.
const nhoRoiCapNhat = (ten, req) => caches.match(req).then(r => {
  const moi = fetch(req).then(res => luu(ten, req, res)).catch(() => r);
  return r || moi;
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Trang chính: lấy bản mới nhất; mạng yếu quá 0,8 giây hoặc mất mạng thì mở bản đã lưu.
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    e.respondWith((async () => {
      const mang = fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) { const c = res.clone(); caches.open(TRANG).then(x => x.put("./", c)); } return res; });
      const cu = await caches.match("./");
      if (!cu) return mang;
      const cho = new Promise(r => setTimeout(() => r(cu), 800));
      return Promise.race([mang.catch(() => cu), cho]);
    })());
    return;
  }
  if (url.origin === self.location.origin) {
    // File có mã phiên bản không bao giờ đổi nội dung → lấy từ bộ nhớ luôn.
    e.respondWith(url.searchParams.has("v") ? nhoTruoc(TRANG, req) : nhoRoiCapNhat(TRANG, req));
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) { e.respondWith(nhoTruoc(THU_VIEN, req)); return; }
  if (url.hostname === "fonts.gstatic.com") { e.respondWith(nhoTruoc(THU_VIEN, req)); return; }
  if (url.hostname === "fonts.googleapis.com") { e.respondWith(nhoRoiCapNhat(THU_VIEN, req)); return; }
  // Còn lại (đăng nhập Google, dữ liệu Firestore, gửi email) đi thẳng, không đụng tới.
});
