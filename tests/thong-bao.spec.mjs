// Nhóm 2, 3: menu che nội dung và nhảy / tụt trang khi bấm thông báo "yêu cầu chờ duyệt" → Duyệt tài khoản.
import { test, expect, choVaiTro } from "./support/fixtures.mjs";
import { TK } from "./support/du-lieu-mau.mjs";

// Vị trí tiêu đề so với đáy thanh menu đang ghim (âm = bị menu che)
const viTri = page => page.evaluate(() => {
  const h = document.querySelector("#ql-duyet-h").getBoundingClientRect();
  let day = 0; document.querySelectorAll("body > nav, .acc-nav").forEach(n => { const s = getComputedStyle(n), b = n.getBoundingClientRect();
    if ((s.position === "sticky" || s.position === "fixed") && b.bottom > 0 && b.top < innerHeight / 4) day = Math.max(day, b.bottom); });
  return { top: Math.round(h.top), duoiMenu: Math.round(h.top - day), cao: innerHeight, y: Math.round(scrollY) };
});

async function bamThongBaoDuyet(page) {
  await page.locator("#tl-nhac-nut").click();
  const muc = page.locator("#tl-nhac-ds a.tl-nh", { hasText: "yêu cầu chờ duyệt" });
  await expect(muc).toBeVisible();
  await muc.click();
}

for (const tu of ["tai-khoan", "", "bai-tap"]) {
  test(`Bấm thông báo duyệt tài khoản từ trang "${tu || "chủ"}": cuộn đúng chỗ, không bị menu che, không tụt`, async ({ page, moTrang }, info) => {
    await moTrang({ nguoi: TK.quanLy, hash: tu });
    await page.waitForFunction(() => document.querySelector("#tl-nhac-nut"));
    await page.waitForTimeout(600);
    await bamThongBaoDuyet(page);
    await expect(page).toHaveURL(/#duyet$/);
    await choVaiTro(page, "quanLy");
    await page.waitForTimeout(1200);
    const dau = await viTri(page);
    await info.attach("anh-sau-khi-bam", { body: await page.screenshot(), contentType: "image/png" });
    expect(dau.duoiMenu, "Tiêu đề Duyệt tài khoản bị menu che").toBeGreaterThanOrEqual(0);
    expect(dau.top, "Tiêu đề không nằm trong nửa trên màn hình").toBeLessThan(dau.cao / 2);
    // Dữ liệu phía trên tải thêm (thêm học viên, tiến độ) không được đẩy tiêu đề đi chỗ khác
    for (let i = 0; i < 12; i++) await page.evaluate(i => window.__fakeMayChu.ghi(`hocvien/hv-moi-${i}`, { ten: `Học Viên Mới ${i}`, coso: "Bình Phú", duyetLuc: Date.now() + i }), i);
    const moc = [];
    for (let t = 0; t < 6; t++) { await page.waitForTimeout(500); moc.push((await viTri(page)).top); }
    await info.attach("anh-sau-4-giay", { body: await page.screenshot(), contentType: "image/png" });
    const lech = Math.max(...moc.map(x => Math.abs(x - dau.top)));
    expect(lech, `Tiêu đề trôi ${lech}px sau khi bấm (vị trí theo thời gian: ${moc.join(", ")})`).toBeLessThanOrEqual(4);
  });
}

test("Bấm đi nhanh “Duyệt tài khoản” trong trang Quản lý không bị menu che", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "duyet" });
  await choVaiTro(page, "quanLy");
  await page.waitForTimeout(800);
  await page.locator('.ql-nhay a[href="#ql-duyet-h"]').click();
  await page.waitForTimeout(1200);
  const v = await viTri(page);
  expect(v.duoiMenu).toBeGreaterThanOrEqual(0);
  expect(v.top).toBeLessThan(v.cao / 2);
});
