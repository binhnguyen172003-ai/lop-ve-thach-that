import { test, expect } from "playwright/test";

for (const width of [320, 375, 430, 768, 1366]) {
  test(`trang công khai không tràn ngang ở ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const metrics = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(metrics.page, `tràn ngang ${metrics.page - metrics.viewport}px`).toBeLessThanOrEqual(metrics.viewport + 1);
  });
}

test("mở các trang công khai rồi trở lại trang chủ", async ({ page }) => {
  await page.goto("/");
  await page.goto("/#giao-trinh");
  await expect(page.locator("#v-giao-trinh")).toBeVisible();
  await page.goto("/#tai-khoan");
  await expect(page.locator("#v-tai-khoan")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#v-giao-trinh")).toBeHidden();
});
