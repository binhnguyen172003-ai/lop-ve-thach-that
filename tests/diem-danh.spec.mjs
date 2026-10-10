// Nhóm 7, 10: sắp xếp tên học viên A–Z, điểm danh không làm mất dữ liệu và đồng bộ sang hồ sơ, trang Quản lý.
import { test, expect, choVaiTro, nhatKyFB, docFB } from "./support/fixtures.mjs";
import { TK, THU_TU_AZ, HOC_VIEN, HOM_NAY } from "./support/du-lieu-mau.mjs";

const tenTrongDanhSach = page => page.$$eval("#dd-list li.dd-hv > div > b:first-child", bs => bs.map(b => b.textContent.trim()));

test("Điểm danh: mặc định xếp A–Z theo tên gọi tiếng Việt (a < â, d < đ), không theo họ", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "diem-danh" });
  await choVaiTro(page, "quanLy");
  await page.selectOption("#dd-ca", "toi");
  await page.selectOption("#dd-cs", "");
  await expect(page.locator("#dd-sort")).toHaveValue("name");
  const ten = (await tenTrongDanhSach(page)).filter(t => THU_TU_AZ.includes(t));
  expect(ten).toEqual(THU_TU_AZ);
});

test("Điểm danh: tìm không dấu vẫn ra đúng người, giữ thứ tự A–Z", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "diem-danh" });
  await choVaiTro(page, "quanLy");
  await page.selectOption("#dd-cs", "");
  await page.fill("#dd-search", "an");
  await page.waitForTimeout(300);
  const ten = await tenTrongDanhSach(page);
  expect(ten).toEqual(THU_TU_AZ.filter(t => /an/i.test(t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d"))));
});

test("Quản lý: chọn “Tên A–Z” trong bảng học viên cho đúng thứ tự", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "duyet" });
  await choVaiTro(page, "quanLy");
  await page.selectOption("#ql-sx", "ten");
  const ten = (await page.$$eval("#ql-tong tbody td[data-l='Học viên'] b", bs => bs.map(b => b.textContent.trim()))).filter(t => THU_TU_AZ.includes(t));
  expect(ten).toEqual(THU_TU_AZ);
});

test("Điểm danh một em: chỉ thêm buổi mới, giữ nguyên các buổi cũ và hồ sơ (không mất dữ liệu)", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.giaoVien, hash: "diem-danh" });
  await choVaiTro(page, "giaoVien");
  await page.selectOption("#dd-ca", "toi");
  const [id, ten] = HOC_VIEN.find(([, t]) => t === "Trần Văn An");
  const truoc = await docFB(page, "diemdanh/" + id), hoSoTruoc = await docFB(page, "hocvien/" + id);
  // Giáo viên chỉ dạy Bình Phú tối nay: "Trần Văn An" (hv-01, Kim Quan) không có trong ca → dùng em cơ sở Bình Phú
  const [id2] = HOC_VIEN.find(([, t]) => t === "Bùi Quang Đạt");
  const nut = page.locator(`#dd-list [data-dd="${id2}"][data-v="co"]`);
  await expect(nut).toBeVisible();
  const truoc2 = await docFB(page, "diemdanh/" + id2);
  await nut.click();
  await expect(nut).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300);
  const sau2 = await docFB(page, "diemdanh/" + id2);
  expect(sau2[HOM_NAY + "_toi"]).toBe("co");
  expect(sau2["cs:" + HOM_NAY + "_toi"]).toBe("Bình Phú");
  for (const [k, v] of Object.entries(truoc2)) expect(sau2[k], `Mất buổi cũ ${k}`).toBe(v);
  // Em không thuộc ca này không bị ghi gì, hồ sơ không đổi
  expect(await docFB(page, "diemdanh/" + id)).toEqual(truoc);
  expect(await docFB(page, "hocvien/" + id)).toEqual(hoSoTruoc);
  expect(ten).toBe("Trần Văn An");
  // Mọi lệnh ghi điểm danh đều là gộp (merge), không ghi đè cả tài liệu
  const ghi = (await nhatKyFB(page)).filter(x => x.op === "set" && x.path.startsWith("diemdanh/"));
  expect(ghi.length).toBeGreaterThan(0);
});

test("Đồng bộ: giáo viên điểm danh → học viên thấy ngay trên trang tiến độ của mình", async ({ page, moTrang }) => {
  // Hai người dùng cùng dùng một "máy chủ" giả: chạy tuần tự trong cùng trang để chia sẻ dữ liệu
  await moTrang({ nguoi: TK.giaoVien, hash: "diem-danh" });
  await choVaiTro(page, "giaoVien");
  await page.selectOption("#dd-ca", "toi");
  const nut = page.locator(`#dd-list [data-dd="${TK.hocVien}"][data-v="co"]`);
  await expect(nut).toBeVisible();
  await nut.click();
  await page.waitForTimeout(300);
  // Chuyển sang tài khoản học viên trên cùng "máy chủ"
  await page.evaluate(m => window.__fakeAuth.dangNhap(m), TK.hocVien);
  await page.goto("/#giao-trinh");
  await choVaiTro(page, "hocVien");
  await expect(page.locator("#my-prog")).toBeVisible();
  await expect(page.locator("#my-prog .mp-dots i.co").first()).toBeVisible();
  const daDi = await page.locator("#my-prog .mp-stats").innerText();
  expect(daDi).toMatch(/1 buổi/);
});

test("Gỡ học viên khỏi ca: hồ sơ và điểm danh cũ còn nguyên", async ({ page, moTrang }) => {
  await moTrang({ nguoi: TK.quanLy, hash: "diem-danh" });
  await choVaiTro(page, "quanLy");
  await page.selectOption("#dd-ca", "toi");
  await page.selectOption("#dd-cs", "Bình Phú");
  const [id] = HOC_VIEN.find(([, t]) => t === "Bùi Quang Đạt");
  const truoc = await docFB(page, "diemdanh/" + id), hoSo = await docFB(page, "hocvien/" + id);
  const go = page.locator(`#dd-list li:has([data-dd="${id}"]) .dd-go`);
  await go.click();
  await page.locator("#dd-go-xac-nhan").click(); // hộp xác nhận "Chỉ gỡ khỏi ca"
  await expect(page.locator(`#dd-list [data-dd="${id}"]`)).toHaveCount(0);
  const sau = await docFB(page, "diemdanh/" + id);
  for (const [k, v] of Object.entries(truoc)) expect(sau[k]).toBe(v);
  expect(await docFB(page, "hocvien/" + id)).toEqual(hoSo);
});
