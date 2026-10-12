// Cài web độc lập với đăng nhập và dữ liệu lớp.
(() => {
  let promptEvent = null, installed = false, busy = false;
  const standalone = matchMedia("(display-mode: standalone)");
  const isApp = () => installed || standalone.matches || navigator.standalone === true;
  const button = () => document.getElementById("pwa-install");
  function render() {
    const card = document.getElementById("pwa-card"), btn = button();
    if (!card || !btn) return;
    card.hidden = isApp();
    btn.disabled = busy;
    btn.textContent = promptEvent ? "Cài ứng dụng" : "Tạo lối tắt / Hướng dẫn";
  }
  addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    promptEvent = event;
    render();
  });
  addEventListener("appinstalled", () => {
    installed = true;
    promptEvent = null;
    render();
  });
  standalone.addEventListener?.("change", render);
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
          ? "Đã chấp nhận cài. Chờ Chrome hoàn tất rồi mở biểu tượng Dreamers."
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
  });
})();
