// Nhóm 8, 9: chuyển tab giáo trình / khoá học / Ebook; đăng nhập và phân quyền theo vai trò.
import { test, expect, choVaiTro, nhatKyFB } from "./support/fixtures.mjs";
import { TK, MAT_KHAU } from "./support/du-lieu-mau.mjs";

/* ---------------- Giáo trình · Khoá học · Ebook ---------------- */
test("Học viên: đổi môn trong Giáo trình đổi đúng danh sách bài, không nhảy khỏi khung", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "giao-trinh" });
  await choVaiTro(page, "hocVien");
  const tabs = page.locator("#course-tabs button");
  await expect(tabs.first()).toBeVisible();
  const n = await tabs.count();
  expect(n, "Học viên được cấp 3 khoá nên phải có nhiều tab môn").toBeGreaterThan(1);
  const daThay = new Set();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(250);
    const ds = await page.locator("#gt-ds").innerText();
    expect(ds.trim().length, `Tab ${i + 1} trống`).toBeGreaterThan(0);
    daThay.add(ds.slice(0, 200));
    const top = await page.locator("#gt-wrap").evaluate(e => e.getBoundingClientRect().top);
    expect(top, "Khung giáo trình bị cuộn mất khỏi màn hình").toBeGreaterThan(-200);
  }
  expect(daThay.size, "Các tab môn hiện cùng một danh sách").toBe(n);
});

test("Khách: menu Học tập → Khoá học mở đúng mục, không bị menu che", async ({ page, moTrang, isMobile }) => {
  await moTrang({ hash: "" });
  if (isMobile) { await page.locator("#nav-burger").click(); await page.locator('#menu-links a[href="#khoa-hoc"]').click(); }
  else { await page.locator(".dd-t", { hasText: "Học tập" }).click(); await page.locator('nav a[href="#khoa-hoc"]').click(); }
  await expect(page.locator("#khoa-hoc")).toBeVisible();
  await page.waitForTimeout(1200);
  const v = await page.evaluate(() => { const h = document.querySelector("#h-khoa").getBoundingClientRect(), n = document.querySelector("body > nav").getBoundingClientRect(); return { h: h.top, n: n.bottom, cao: innerHeight }; });
  expect(v.h, "Tiêu đề Các khoá học bị menu che").toBeGreaterThanOrEqual(v.n);
  expect(v.h).toBeLessThan(v.cao);
});

test("Khách: menu Sản phẩm → Ebook mở thư viện Ebook", async ({ page, moTrang, isMobile }) => {
  await moTrang({ hash: "" });
  if (isMobile) await page.locator("#nav-burger").click(); else await page.locator("#sp-dd .dd-t").click();
  await page.locator(isMobile ? "#menu-links a" : "#sp-p a", { hasText: "Ebook" }).click();
  await expect(page).toHaveURL(/#ebook$/);
  await expect(page.locator("#v-ebook")).toBeVisible();
  await expect(page.locator("#tv-ebook")).toContainText("Đăng nhập"); // khách: chưa có ebook công khai
});

test("Link cũ Khoá học nâng cao (#nang-cao) chuyển sang thư viện Video, không trang trắng", async ({ page, moTrang }) => {
  await moTrang({ hash: "nang-cao" });
  await expect(page).toHaveURL(/#video$/);
  await expect(page.locator("#v-video")).toBeVisible();
  await expect(page.locator("#tv-video")).not.toBeEmpty();
});

/* ---------------- Đăng nhập & phân quyền ---------------- */
test("Đăng nhập sai mật khẩu báo lỗi tiếng Việt, đúng mật khẩu thì vào được", async ({ page, moTrang }) => {
  await moTrang({ hash: "tai-khoan" });
  await page.locator("#tab-in").click();
  await page.fill("#pw-mail", TK.hocVien); await page.fill("#pw-pass", "sai-mat-khau");
  await page.locator("#pw-in").click();
  await expect(page.locator("#pw-status")).toContainText("Sai Gmail hoặc mật khẩu");
  await page.fill("#pw-pass", MAT_KHAU);
  await page.locator("#pw-in").click();
  await expect(page.locator('#acc-nav [data-acc="giao-trinh"]')).toBeVisible();
});

const VAI_TRO = [
  { ai: "hocVien", mail: TK.hocVien, thay: ["giao-trinh", "bai-tap"], khong: ["diem-danh", "duyet"] },
  { ai: "giaoVien", mail: TK.giaoVien, thay: ["diem-danh", "van-hanh"], khong: ["duyet"] },
  { ai: "quanLy", mail: TK.quanLy, thay: ["diem-danh", "van-hanh", "duyet"], khong: [] }
];
for (const v of VAI_TRO) {
  test(`Phân quyền ${v.ai}: thanh tài khoản chỉ hiện mục được phép`, async ({ page, moTrang }) => {
    await moTrang({ nguoi: v.mail, hash: "tai-khoan" });
    await choVaiTro(page, v.ai);
    for (const m of v.thay) await expect(page.locator(`#acc-nav [data-acc="${m}"]`)).toBeVisible();
    for (const m of v.khong) await expect(page.locator(`#acc-nav [data-acc="${m}"]`)).toBeHidden();
  });
}

test("Học viên gõ thẳng #duyet / #diem-danh: chỉ thấy khung khoá, không thấy dữ liệu", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "duyet" });
  await choVaiTro(page, "hocVien");
  await page.goto("/#duyet");
  await expect(page.locator("#duyet-lock")).toBeVisible();
  await expect(page.locator("#duyet-body")).toBeHidden();
  await page.goto("/#diem-danh");
  await expect(page.locator("#dd-lock")).toBeVisible();
  await expect(page.locator("#dd-body")).toBeHidden();
});

test("Học viên không tải danh sách học viên, yêu cầu duyệt, lương hay nhật ký của lớp", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.hocVien, hash: "tai-khoan" });
  await choVaiTro(page, "hocVien");
  for (const h of ["giao-trinh", "bai-tap", "van-hanh", "lam-viec", "thi-thu"]) { await page.goto("/#" + h); await page.waitForTimeout(300); }
  const doc = (await nhatKyFB(page)).filter(x => /^(watch|list)$/.test(x.op)).map(x => x.path);
  for (const cam of ["hocvien", "yeucau", "giaovien", "bangluong", "luongdc", "caday", "nhatky", "diemdanh", "nhanxet", "tiendo"])
    expect(doc, `Học viên đang tải cả bộ sưu tập "${cam}"`).not.toContain(cam);
});

test("Chờ duyệt: vào được trang tài khoản nhưng không mở được giáo trình", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.choDuyet, hash: "giao-trinh" });
  await page.waitForTimeout(1500);
  await expect(page.locator("#gt-body")).toBeHidden();
  await expect(page.locator("#v-giao-trinh [data-lock]")).toBeVisible();
});

test("Chưa xác nhận Gmail: bị giữ ở bước xác nhận, không đọc dữ liệu lớp", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.chuaXacNhan, hash: "tai-khoan" });
  await page.waitForTimeout(1500);
  await expect(page.locator("#btn-verified")).toBeVisible();
  const doc = (await nhatKyFB(page)).filter(x => x.ai === TK.chuaXacNhan && /^(watch|list)$/.test(x.op)).map(x => x.path);
  expect(doc.filter(p => /^(giaotrinh|baitap|hocvien|diemdanh)/.test(p))).toEqual([]);
});

test("Không gửi dữ liệu ra ngoài khi dùng web (ngoài Firebase)", async ({ page, moTrang, ngoai }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "duyet" });
  await choVaiTro(page, "quanLy");
  for (const h of ["diem-danh", "van-hanh", "lam-viec", "giao-trinh"]) { await page.goto("/#" + h); await page.waitForTimeout(300); }
  // chỉ cho phép phông chữ Google (GET, không kèm dữ liệu)
  expect(ngoai.filter(x => !/^GET https:\/\/fonts\.(googleapis|gstatic)\.com/.test(x))).toEqual([]);
});
