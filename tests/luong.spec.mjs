// Nhóm 5, 6, 9: bảng công – lương đúng số tiền, ca trùng không tính hai lần, giáo viên chỉ thấy lương của mình.
// Số liệu mong đợi tính tay từ tests/support/du-lieu-mau.mjs (tháng 10/2026):
//  - Giáo Viên Thử (Giáo viên, 160.000đ/ca): 11 ca có vào + ra ở Bình Phú; 7 ngày thường × 50.000đ + 4 ngày cuối tuần × 30.000đ trợ cấp;
//    thưởng chuyên cần 200.000đ → 1.760.000 + 470.000 + 200.000 = 2.430.000đ.
//  - Trợ giảng (80.000đ/ca, Kim Quan 60.000đ trợ cấp): ca ngày 2, 7, 9 đủ giờ; ca ngày 5 thiếu chấm ra; ca trùng giờ ngày 7 ở Bình Phú không tính
//    → 3 × 80.000 + 3 × 60.000 = 420.000đ.
import { test, expect, choVaiTro, nhatKyFB } from "./support/fixtures.mjs";
import { TK } from "./support/du-lieu-mau.mjs";

const moBangLuong = async page => {
  await page.locator('[data-vh="cc"]').click();
  await page.locator('[data-x="cc-view"][data-id="luong"]').first().click();
  await expect(page.locator("#vh-body table.cc-bang").first()).toBeVisible();
};
const dongCua = (page, ten) => page.locator("#vh-body table.cc-bang tbody tr", { hasText: ten });

test("Quản lý: bảng lương tháng tính đúng thực nhận, ca trùng không tính hai lần", async ({ page, moTrang }, info) => {
  await moTrang({ nguoi: TK.quanLy, hash: "van-hanh" });
  await choVaiTro(page, "quanLy");
  await moBangLuong(page);
  await info.attach("bang-luong", { body: await page.locator("#vh-body").screenshot(), contentType: "image/png" });
  const gv = dongCua(page, "Giáo Viên Thử"), tg = dongCua(page, "Trợ Giảng Thử");
  await expect(gv).toContainText("1.760.000đ");
  await expect(gv).toContainText("470.000đ");
  await expect(gv).toContainText("2.430.000đ");
  await expect(tg).toContainText("240.000đ");
  await expect(tg).toContainText("420.000đ");
  await tg.locator('[data-x="cc-phieu"]').click();
  await expect(page.locator(".hop")).toContainText("Trùng ca");
});

test("Giáo viên: chỉ thấy phiếu lương của mình, không tải bảng lương người khác", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.giaoVien, hash: "van-hanh" });
  await choVaiTro(page, "giaoVien");
  await page.locator('[data-vh="cc"]').click();
  await page.locator('[data-x="cc-view"][data-id="luong"]').first().click();
  await expect(page.locator("#vh-body .cc-phieu")).toContainText("Giáo Viên Thử");
  await expect(page.locator("#vh-body .cc-phieu")).toContainText("2.430.000đ");
  await expect(page.locator("#vh-body")).not.toContainText("Trợ Giảng Thử");
  // Truy vấn lương/thưởng luôn kèm điều kiện gv == chính mình (luật máy chủ cũng chặn, đây là lớp kiểm tra phía web)
  const nghe = (await nhatKyFB(page)).filter(x => x.op === "watch" && /^(bangluong|luongdc|suacong|nhatky)/.test(x.path));
  expect(nghe.map(x => x.path)).not.toContain("nhatky");
});

test("Chấm công tháng: lịch tháng hiện đủ ca, ô ca thiếu chấm được đánh dấu", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "van-hanh" });
  await choVaiTro(page, "quanLy");
  await page.locator('[data-vh="cc"]').click();
  await page.locator('[data-x="cc-view"][data-id="thang"]').first().click();
  await expect(page.locator(".cc-luoi")).toBeVisible();
  await expect(page.locator(".cc-luoi .cc-chip.bad").first()).toBeVisible(); // ca ngày 5 của trợ giảng thiếu chấm ra
  const tg = page.locator("#vh-body table.cc-bang tbody tr", { hasText: "Trợ Giảng Thử" });
  await expect(tg).toContainText("Thiếu KPI");
});
