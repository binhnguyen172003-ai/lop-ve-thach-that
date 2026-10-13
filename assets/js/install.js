// Cài web độc lập với đăng nhập và dữ liệu lớp.
(() => {
  const INSTALLED_KEY = "lvkv-app-installed";
  let promptEvent = null, installed = false, busy = false, checking = true;
  try { installed = localStorage.getItem(INSTALLED_KEY) === "1"; } catch {}
  const rememberInstalled = () => {
    installed = true;
    promptEvent = null;
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
  };
  const standalone = matchMedia("(display-mode: standalone)");
  const inApp = () => standalone.matches || matchMedia("(display-mode: minimal-ui)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
  const isApp = () => installed || inApp();
  let detection = null;
  const detectInstalled = () => detection ||= (async () => {
    try {
      if (inApp()) rememberInstalled();
      if (typeof navigator.getInstalledRelatedApps === "function") {
        const apps = await navigator.getInstalledRelatedApps();
        const appId = new URL("./", location.href).href;
        const manifestUrl = new URL("manifest.webmanifest", location.href).href;
        if (apps.some(app => app.platform === "webapp" && (app.id === appId || app.url?.split("?")[0] === manifestUrl))) rememberInstalled();
      }
    } catch {} // Trình duyệt không hỗ trợ vẫn nhận biết qua lần mở app.
    finally { checking = false; render(); }
  })().finally(() => { detection = null; });
  const button = () => document.getElementById("pwa-install");
  function render() {
    const card = document.getElementById("pwa-card"), btn = button();
    if (!card || !btn) return;
    card.hidden = checking || isApp();
    btn.disabled = busy;
    btn.textContent = promptEvent ? "Cài ứng dụng" : "Tạo lối tắt / Hướng dẫn";
  }
  addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    // Trình duyệt cho cài lại: app đã gỡ, bỏ trạng thái cũ trên máy.
    installed = false;
    try { localStorage.removeItem(INSTALLED_KEY); } catch {}
    promptEvent = event;
    render();
  });
  addEventListener("appinstalled", () => {
    rememberInstalled();
    render();
  });
  standalone.addEventListener?.("change", detectInstalled);
  addEventListener("pageshow", detectInstalled);
  addEventListener("storage", event => {
    if (event.key !== INSTALLED_KEY) return;
    installed = event.newValue === "1";
    render();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) detectInstalled(); });
  document.addEventListener("DOMContentLoaded", () => {
    const btn = button(), help = document.getElementById("pwa-help");
    if (!btn || !help) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    help.textContent = ios
      ? "Mở web bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Bật Mở dưới dạng ứng dụng nếu có."
      : "Mở web lớp bằng Chrome → menu ⋮ → Thêm vào màn hình chính → Cài đặt hoặc Tạo lối tắt. Nếu mở từ Zalo/Facebook, chọn Mở bằng trình duyệt trước.";
    btn.addEventListener("click", async () => {
      if (busy || isApp()) return;
      if (!promptEvent) {
        help.hidden = !help.hidden;
        btn.setAttribute("aria-expanded", String(!help.hidden));
        return;
      }
      const event = promptEvent;
      promptEvent = null;
      busy = true;
      render();
      const status = document.getElementById("pwa-status");
      try {
        await event.prompt();
        const result = await event.userChoice;
        status.textContent = result.outcome === "accepted"
          ? "Đã chấp nhận cài. Chờ Chrome hoàn tất rồi mở biểu tượng Vẽ Không Vui."
          : "Chưa cài. Em có thể tạo lối tắt qua menu Chrome.";
      } catch {
        status.textContent = "Chưa mở được cửa sổ cài đặt. Xem hướng dẫn bên dưới.";
        help.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      } finally {
        busy = false;
        render();
      }
    });
    render();
    detectInstalled();
  });
})();
