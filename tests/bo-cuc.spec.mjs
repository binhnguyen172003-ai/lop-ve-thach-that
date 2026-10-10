// Nhóm 1, 2, 4, 5, 6: chữ chạm khung, menu/nút nổi che nội dung, bảng công – lương tràn, lịch khó bấm.
// Chạy trên cả máy tính và điện thoại (xem projects trong playwright.config.mjs).
import { test, expect, choVaiTro, timTranChu, tranNgang, timNutBiChe } from "./support/fixtures.mjs";
import { TK } from "./support/du-lieu-mau.mjs";

const TRANG = [
  { ten: "Trang chủ (khách)", nguoi: null, hash: "", goc: "#v-home" },
  { ten: "Đăng nhập (khách)", nguoi: null, hash: "tai-khoan", goc: "#v-tai-khoan" },
  { ten: "Tổng quan học viên", nguoi: TK.hocVien, vaiTro: "hocVien", hash: "tai-khoan", goc: "#v-tai-khoan" },
  { ten: "Giáo trình học viên", nguoi: TK.hocVien, vaiTro: "hocVien", hash: "giao-trinh", goc: "#v-giao-trinh" },
  { ten: "Bài tập học viên", nguoi: TK.hocVien, vaiTro: "hocVien", hash: "bai-tap", goc: "#v-bai-tap" },
  { ten: "Điểm danh giáo viên", nguoi: TK.giaoVien, vaiTro: "giaoVien", hash: "diem-danh", goc: "#v-diem-danh" },
  { ten: "Vận hành giáo viên", nguoi: TK.giaoVien, vaiTro: "giaoVien", hash: "van-hanh", goc: "#v-van-hanh" },
  { ten: "Quản lý lớp", nguoi: TK.quanLy, vaiTro: "quanLy", hash: "duyet", goc: "#v-duyet" },
  { ten: "Trao đổi quản lý", nguoi: TK.quanLy, vaiTro: "quanLy", hash: "lam-viec", goc: "#v-lam-viec" }
];

for (const t of TRANG) {
  test(`${t.ten}: không tràn ngang, không chữ chạm khung`, async ({ page, moTrang }, info) => {
    await moTrang({ nguoi: t.nguoi, hash: t.hash });
    if (t.vaiTro) await choVaiTro(page, t.vaiTro);
    await page.waitForTimeout(800); // dữ liệu giả lập về và vẽ xong
    await info.attach("anh-trang", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    expect(await tranNgang(page), "Trang bị kéo ngang").toBeLessThanOrEqual(1);
    expect(await timTranChu(page, t.goc)).toEqual([]);
  });
}

test("Nút nổi (chuông, Bé Chì) không che nút bấm khi cuộn trang Quản lý", async ({ page, moTrang }, info) => {
  await moTrang({ nguoi: TK.quanLy, hash: "duyet" });
  await choVaiTro(page, "quanLy");
  await page.waitForTimeout(800);
  const loi = await timNutBiChe(page, "#v-duyet");
  if (loi.length) await info.attach("anh-bi-che", { body: await page.screenshot(), contentType: "image/png" });
  expect(loi).toEqual([]);
});

test("Bảng công tháng và bảng lương nằm gọn trong khung, không làm trang tràn ngang", async ({ page, moTrang }, info) => {
  await moTrang({ nguoi: TK.quanLy, hash: "van-hanh" });
  await choVaiTro(page, "quanLy");
  await page.locator('[data-vh="cc"]').click();
  for (const view of ["thang", "luong"]) {
    await page.locator(`[data-x="cc-view"][data-id="${view}"]`).first().click();
    await expect(page.locator("#vh-body table.cc-bang").first()).toBeVisible();
    await info.attach("anh-" + view, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    expect(await tranNgang(page), `Tab ${view} kéo ngang cả trang`).toBeLessThanOrEqual(1);
    expect(await timTranChu(page, "#vh-body")).toEqual([]);
  }
});

test("Lịch phân công dạy: ô bấm đủ lớn và cuộn ngang trong khung riêng", async ({ page, moTrang }, info) => {
  await moTrang({ nguoi: TK.quanLy, hash: "van-hanh" });
  await choVaiTro(page, "quanLy");
  const bang = page.locator(".lpc-bang");
  await expect(bang).toBeVisible();
  await info.attach("anh-lich", { body: await page.locator(".lpc").screenshot(), contentType: "image/png" });
  expect(await tranNgang(page)).toBeLessThanOrEqual(1);
  // Ngón tay cần vùng chạm tối thiểu ~32px (khuyến nghị 44px); nút sửa/gỡ trong ô lịch không được nhỏ hơn 24px
  const nho = await page.$$eval(".lpc-bang button, .lpc-tuan button, .lpc-cs button", bs => bs.filter(b => b.checkVisibility()).map(b => {
    const r = b.getBoundingClientRect(); return { t: (b.getAttribute("aria-label") || b.textContent).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(x => x.w < 24 || x.h < 24));
  expect(nho, "Nút trong lịch quá nhỏ để bấm trên điện thoại").toEqual([]);
  expect(await timTranChu(page, ".lpc")).toEqual([]);
});
