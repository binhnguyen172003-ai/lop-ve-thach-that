// Bộ nhớ đệm giúp web mở tức thì ở lần sau và vẫn xem được khi mất mạng.
// Thường không cần sửa file này. Mỗi lần đưa web lên, mã phiên bản (?v=) đổi nên bản cũ tự bị thay.
const V = new URL(self.location.href).searchParams.get("v") || "dev";
const TRANG = "lvkv-trang-20261013fresh-" + V;      // file của web (theo phiên bản)
const THU_VIEN = "lvkv-thu-vien";     // thư viện Firebase + phông chữ (không bao giờ đổi)

self.addEventListener("install", e => {
  e.waitUntil(caches.open(TRANG).then(async c => {
    // Trang mất mạng phải có sẵn trước khi worker bắt đầu điều hướng.
    await c.add("./offline.html");
    await c.add("./assets/img/bia-1280.jpg");
    await c.add("./").catch(() => {});
  }));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // Bắt đầu tải trang song song với lúc worker khởi động khi mở lại app.
    // Trình duyệt cũ vẫn dùng đường fetch thông thường.
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable().catch(() => {});
    }
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith("lvkv-trang-") && k !== TRANG).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Cache failures (quota/private browsing) must never turn a successful download into an error.
const luu = (event, ten, req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    event.waitUntil(caches.open(ten).then(cache => cache.put(req, copy)).catch(() => {}));
  }
  return res;
};
const docNho = (ten, req) => caches.open(ten).then(cache => cache.match(req)).catch(() => undefined);
const nhoTruoc = (event, ten, req) => docNho(ten, req).then(saved => saved || fetch(req).then(res => luu(event, ten, req, res)));
const nhoRoiCapNhat = (event, ten, req) => {
  const saved = docNho(ten, req);
  const fresh = fetch(req).then(res => luu(event, ten, req, res));
  event.waitUntil(fresh.catch(() => {}));
  return saved.then(res => res || fresh);
};

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Trang chính: lấy bản mới nhất; mất mạng thì mở bản đã lưu.
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    e.respondWith((async () => {
      const matMang = async () => (await caches.match("./offline.html")) || (await caches.match("./"));
      const mang = (async () => {
        const preloaded = await e.preloadResponse?.catch(() => undefined);
        const res = preloaded?.ok ? preloaded : await fetch(req, { cache: "no-cache" });
        if (res.ok) { const c = res.clone(); e.waitUntil(caches.open(TRANG).then(x => x.put("./", c)).catch(() => {})); }
        return res;
      })();
      // Khi có mạng, dùng HTML mới ngay; chỉ trả bản lưu khi tải mạng thất bại.
      // Không hiện giao diện cũ trong lúc chờ rồi buộc người dùng tải lại lần nữa.
      return mang.catch(async () => (await caches.match("./")) || matMang());
    })());
    return;
  }
  if (url.origin === self.location.origin) {
    // File có mã phiên bản không bao giờ đổi nội dung → lấy từ bộ nhớ luôn.
    e.respondWith(url.searchParams.has("v") ? nhoTruoc(e, TRANG, req) : nhoRoiCapNhat(e, TRANG, req));
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) { e.respondWith(nhoTruoc(e, THU_VIEN, req)); return; }
  if (url.hostname === "fonts.gstatic.com") { e.respondWith(nhoTruoc(e, THU_VIEN, req)); return; }
  if (url.hostname === "fonts.googleapis.com") { e.respondWith(nhoRoiCapNhat(e, THU_VIEN, req)); return; }
  // Còn lại (đăng nhập Google, dữ liệu Firestore, gửi email) đi thẳng, không đụng tới.
});
