// Các biểu tượng vẫn là SVG tĩnh và các nút vẫn hoạt động nếu không tải được thư viện.
const DOWN = "M3 8l9 9 9-9";
const UP = "M3 16l9-9 9 9";
const MENU = "M4 6h16M4 12h16M4 18h16";
const CLOSE = "M5 5l14 14M19 5L5 19";
const EYE = "M2 12c2.5-4.7 6-7 10-7s7.5 2.3 10 7c-2.5 4.7-6 7-10 7S4.5 16.7 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF = EYE + "M3 3l18 18";

try {
  const { createMorph } = await import("https://cdn.jsdelivr.net/npm/morphicons@1.7.1/dist/dom.js");
  const bind = (button, path, off, on, attr) => {
    if (!button || !path) return;
    const active = () => button.getAttribute(attr) === "true";
    const morph = createMorph(path, active() ? on : off, { reducedMotion: "user" });
    new MutationObserver(() => morph.morphTo(active() ? on : off, "snappy"))
      .observe(button, { attributes: true, attributeFilter: [attr] });
  };

  document.querySelectorAll("nav .dd-t").forEach(button => {
    const svg = button.querySelector(".chev");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.width = svg.style.height = "12px";
    svg.style.transform = "none";
    bind(button, svg.querySelector("path"), DOWN, UP, "aria-expanded");
  });

  const burger = document.getElementById("nav-burger");
  if (burger) {
    burger.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" style="display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="' + MENU + '"/></svg>';
    const nav = burger.closest("nav");
    const syncColor = () => { burger.style.color = nav?.classList.contains("on-hero") ? "#fff" : "var(--ink)"; };
    syncColor();
    if (nav) new MutationObserver(syncColor).observe(nav, { attributes: true, attributeFilter: ["class"] });
    bind(burger, burger.querySelector("path"), MENU, CLOSE, "aria-expanded");
    new MutationObserver(() => {
      burger.setAttribute("aria-label", burger.getAttribute("aria-expanded") === "true" ? "Đóng menu" : "Mở menu");
    }).observe(burger, { attributes: true, attributeFilter: ["aria-expanded"] });
  }

  for (const id of ["nw-show", "pw-show"]) {
    const button = document.getElementById(id);
    const svg = button?.querySelector("svg");
    if (!svg) continue;
    svg.innerHTML = '<path d="' + EYE + '" style="stroke-dasharray:none"/>';
    bind(button, svg.querySelector("path"), EYE, EYE_OFF, "aria-pressed");
  }
} catch (error) {
  console.warn("Morphicons không tải được; biểu tượng tĩnh vẫn hoạt động.", error);
}
