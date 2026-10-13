import { test, expect } from 'playwright/test';
test('Góc nghệ thuật mở miễn phí, quản lý có thể thêm nội dung', async ({ page }) => {
  await page.route('**/art-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/assets/css/style.css"><div class="wrap"><div id="root" class="resource-workspace"></div></div>' }));
  await page.goto('/art-fixture');
  await page.evaluate(async () => {
    const { createResourceWorkspace } = await import('/assets/js/resource-workspace.js');
    window.artState = { rows: [
      { id: 'topic', phan: 'goc-nghe-thuat', khoa: 'Phim & nghệ thuật', ten: 'Phim & nghệ thuật', loai: 'khoa', an: false },
      { id: 'video', phan: 'goc-nghe-thuat', khoa: 'Phim & nghệ thuật', ten: 'Quan sát màu sắc', loai: 'video', an: false, noidung: 'Nội dung chia sẻ miễn phí.', link: 'https://youtu.be/vZdFuUTUeJw' }
    ], staff: true, canManage: false, mail: '' };
    window.art = createResourceWorkspace(document.querySelector('#root'), { phan: 'goc-nghe-thuat', publicMode: true, markdown: text => text, notify: () => {}, save: async () => ({ id: 'new' }) });
    window.art.update(window.artState);
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  }
  await page.locator('[data-open="video"]').click();
  await expect(page.getByText('Nội dung chia sẻ miễn phí.', { exact: true })).toBeVisible();
  await expect(page.locator('[data-access]')).toHaveCount(0);
  await expect(page.locator('[data-add]')).toHaveCount(0);
  await page.evaluate(() => { window.artState.canManage = true; window.artState.mail = 'admin@example.com'; window.art.update(window.artState); });
  await page.locator('[data-add]').click();
  await expect(page.locator('select[name="loai"] option')).toHaveText(['Phim / video', 'Kiến thức / đời sống', 'Tài liệu miễn phí']);
  await expect(page.locator('[data-access]')).toHaveCount(0);
});
