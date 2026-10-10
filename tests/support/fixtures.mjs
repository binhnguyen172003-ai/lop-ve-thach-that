// Khung kiểm thử dùng chung: mọi trang mở qua đây đều
//  1) thay Firebase thật bằng Firebase giả lập (không đọc/ghi dữ liệu thật),
//  2) chặn mọi kết nối ra ngoài máy kiểm thử (FormSubmit, Google Fonts, AI…),
//  3) cố định giờ Việt Nam để lịch, chấm công, lương ra kết quả lặp lại được.
import { test as base, expect } from "playwright/test";
import { readFileSync } from "node:fs";
import { duLieuMau, TAI_KHOAN, GIO_THU } from "./du-lieu-mau.mjs";

const FAKE = readFileSync(new URL("./fake-firebase.js", import.meta.url), "utf8");

export const test = base.extend({
  // Ghi lại các yêu cầu ra ngoài bị chặn để kiểm thử có thể khẳng định "không gửi dữ liệu ra ngoài"
  ngoai: async ({}, use) => { await use([]); },
  context: async ({ context, ngoai }, use) => {
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
      if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"))
        return route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: FAKE });
      // Ảnh thu nhỏ YouTube: trả ảnh giả 1 điểm ảnh để ảnh chụp kiểm thử không hiện biểu tượng ảnh hỏng
      if (url.hostname === "i.ytimg.com") return route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAJmZmQAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64") });
      ngoai.push(route.request().method() + " " + url.origin + url.pathname);
      return route.abort("blockedbyclient");
    });
    await use(context);
  },
  // moTrang({ nguoi, hash, db, deny }): mở web với tài khoản thử đã đăng nhập (hoặc khách nếu nguoi rỗng)
  moTrang: async ({ page }, use) => {
    const loiTrang = [];
    page.on("pageerror", e => loiTrang.push(e.message));
    await page.clock.install({ time: GIO_THU });
    await use(async ({ nguoi = null, hash = "", db = duLieuMau(), deny = {} } = {}) => {
      await page.addInitScript(([seed, phien]) => {
        if (window !== window.top) return; // khung nhúng YouTube/Canva (bị chặn trong kiểm thử): không đụng tới
        window.__FAKE_FB_SEED = seed;
        if (sessionStorage.getItem("__da_nap_seed")) return; // tải lại trang: Firebase giả đọc lại dữ liệu từ sessionStorage
        sessionStorage.setItem("__da_nap_seed", "1");
        try { localStorage.clear(); if (phien) localStorage.setItem("lvkv-gmail", phien); } catch (e) {}
      }, [{ db, accounts: TAI_KHOAN, signedIn: nguoi, deny }, nguoi]);
      await page.goto("/" + (hash ? "#" + hash.replace(/^#/, "") : ""));
      await page.waitForFunction(() => window.__appOk === true);
      return { loiTrang };
    });
    expect(loiTrang, "Trang có lỗi JavaScript").toEqual([]);
  }
});
export { expect };

/* ---------------- Hàm kiểm tra bố cục dùng chung ---------------- */

// Chờ đến khi khu tài khoản đã mở đúng quyền (không còn "đang kiểm tra")
export async function choVaiTro(page, vaiTro) {
  const sel = { quanLy: "#duyet-body:not([hidden])", giaoVien: "#dd-body:not([hidden])", hocVien: "#gt-body:not([hidden])" }[vaiTro];
  if (sel) await page.waitForSelector(sel, { state: "attached", timeout: 15_000 });
}

// Trả về danh sách lỗi "chữ chạm khung" trong vùng `goc`:
//  - chữ vượt ra ngoài vùng nội dung của khung (đè lên lề trong/viền) hoặc ra ngoài màn hình,
//  - ô nhập / nút / ô chọn to hơn khung chứa nó (đè sang ô bên cạnh).
// Đo bằng Range trên chữ thật nên không bị nhầm bởi vùng chạm mở rộng vô hình (::before inset âm).
// Bỏ qua phần tử ẩn, chữ cắt có chủ đích bằng "…", và khung cuộn ngang có chủ đích (overflow-x auto/scroll).
export async function timTranChu(page, goc = "body") {
  return page.evaluate(goc => {
    const root = document.querySelector(goc); if (!root) return [`Không tìm thấy ${goc}`];
    const vw = document.documentElement.clientWidth, loi = [];
    const cuonNgang = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return p; } return null; };
    const ten = el => (el.id ? "#" + el.id : el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""))
      + ` "${(el.innerText || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
    const hop = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el), f = k => parseFloat(s[k]) || 0;
      return { l: r.left + f("borderLeftWidth") + f("paddingLeft"), r: r.right - f("borderRightWidth") - f("paddingRight"), t: r.top, b: r.bottom }; };
    const hien = el => el.checkVisibility && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    // Thẻ xoay / nghiêng 3D (băng chuyền xếp hạng): toạ độ đã bị chiếu, không đo được chính xác
    const bienDang = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const t = getComputedStyle(p).transform;
      if (t && t !== "none" && (t.startsWith("matrix3d") || !/^matrix\(1, 0, 0, 1,/.test(t))) return true; } return false; };
    for (const el of root.querySelectorAll("*")) {
      if (!hien(el) || el.closest("svg, [aria-hidden=true], .sr-only, .visually-hidden") || bienDang(el)) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const kc = cuonNgang(el);
      // 1) chữ trực tiếp trong khối không vượt vùng nội dung
      if (s.display !== "inline" && s.display !== "contents") {
        const chu = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
        if (chu.length) {
          // cho phép chữ lấn tối đa nửa phần lề trong (khoảng cách chữ, dấu tiếng Việt); chạm sát viền mới là lỗi
          const k0 = hop(el), du = Math.max(1.5, Math.min(parseFloat(s.paddingLeft) || 0, parseFloat(s.paddingRight) || 0) / 2), k = { l: k0.l - du + 1.5, r: k0.r + du - 1.5 }, cat = s.textOverflow === "ellipsis" || (s.webkitLineClamp && s.webkitLineClamp !== "none");
          for (const n of chu) {
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const q of rg.getClientRects()) {
              if (!q.width) continue;
              if (!cat && (q.right > k.r + 1.5 || q.left < k.l - 1.5)) { loi.push(`${ten(el)} chữ chạm/tràn khung (chữ ${Math.round(q.left)}→${Math.round(q.right)}, khung ${Math.round(k.l)}→${Math.round(k.r)})`); break; }
              if (!kc && !(cat && /hidden|clip/.test(s.overflowX)) && (q.right > vw + 1 || q.left < -1)) { loi.push(`${ten(el)} chữ ra ngoài màn hình`); break; }
            }
          }
        }
      }
      // 2) nút / ô nhập không to hơn khung chứa nó
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName) && !/^(absolute|fixed)$/.test(s.position) && el.type !== "hidden" && el.type !== "checkbox" && el.type !== "radio") {
        let cha = el.parentElement; while (cha && getComputedStyle(cha).display === "inline") cha = cha.parentElement;
        if (cha && cha !== document.body && getComputedStyle(cha).overflowX === "visible" && !kc) {
          const k = hop(cha);
          if (r.right > k.r + 1.5 || r.left < k.l - 1.5) loi.push(`${ten(el)} rộng hơn khung ${ten(cha)} (${Math.round(r.left)}→${Math.round(r.right)}, khung ${Math.round(k.l)}→${Math.round(k.r)})`);
        }
        if (!kc && (r.right > vw + 1 || r.left < -1)) loi.push(`${ten(el)} ra ngoài màn hình`);
      }
    }
    return [...new Set(loi)].slice(0, 25);
  }, goc);
}

export async function tranNgang(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// Nút/ô bấm trong `goc` bị phần tử cố định (nút nổi, thanh dưới, menu) che mất NGAY CẢ KHI đã cuộn nút
// vào giữa màn hình — tức là người dùng không có cách nào bấm trúng. Cuộn như người thật để các nút nổi
// tự ẩn/hiện theo hướng cuộn (tl-an) chạy đúng như trên điện thoại.
export async function timNutBiChe(page, goc = "body") {
  return page.evaluate(async goc => {
    const loi = [], root = document.querySelector(goc); if (!root) return loi;
    const khung = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const tenDe = el => el.id ? "#" + el.id : el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "");
    const nut = [...root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=tab]")]
      .filter(el => el.checkVisibility && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width);
    for (const el of nut) {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }); await khung();
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
      const tren = document.elementFromPoint(x, y);
      if (!tren || el.contains(tren) || tren.contains(el)) continue;
      let coDinh = null;
      for (let p = tren; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed" || getComputedStyle(p).position === "sticky") { coDinh = p; break; }
      if (!coDinh || coDinh.contains(el)) continue;
      loi.push(`${tenDe(el)} "${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().replace(/\s+/g, " ").slice(0, 30)}" bị ${tenDe(coDinh)} › ${tenDe(tren)} che`);
    }
    return loi;
  }, goc);
}

// Ghi chép ghi/đọc của Firebase giả lập
export const nhatKyFB = page => page.evaluate(() => window.__FAKE_FB.log);
export const docFB = (page, path) => page.evaluate(p => window.__FAKE_FB.docs.get(p), path);
