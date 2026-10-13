import { test, expect } from 'playwright/test';

async function mount(page, ebook = false) {
  await page.route('**/unlock-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><link rel="stylesheet" href="/assets/css/style.css"><div class="wrap"><div id="root" class="resource-workspace"></div></div>' }));
  await page.goto('/unlock-fixture');
  await page.evaluate(async ebook => {
    const { createResourceWorkspace } = await import('/assets/js/resource-workspace.js');
    window.calls = []; window.opens = 0; window.notices = [];
    const phan = ebook ? 'ebook' : 'nang-cao';
    window.state = { mail: 'test@example.com', rows: [
      { id: 'course', phan, loai: 'khoa', khoa: 'Chân dung nâng cao', access: 'selected', viewers: [], dieuKienMoKhoa: 'Cần 15 đô mở khóa' },
      { id: 'lesson', phan, khoa: 'Chân dung nâng cao', ten: 'Nội dung riêng', noidung: 'Không hiện khi khóa', link: 'https://example.com/private' }
    ], marks: {}, staff: false, canManage: false };
    window.workspace = createResourceWorkspace(document.querySelector('#root'), {
      phan, ebook, notify: text => window.notices.push(text), markdown: text => text,
      requestUnlock: name => { window.calls.push(name); return new Promise((resolve, reject) => { window.finish = resolve; window.fail = reject; }); },
      openConversation: () => { window.opens++; }
    });
    window.workspace.update(window.state);
  }, ebook);
}

for (const ebook of [false, true]) {
  test(`${ebook ? 'eBook' : 'Khóa học'}: gửi một yêu cầu, vẫn khóa nội dung và mở trao đổi`, async ({ page }) => {
    await mount(page, ebook);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await expect(page.getByRole('button', { name: 'Gửi yêu cầu mở khóa' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    }
    await expect(page.getByText('Không hiện khi khóa')).toHaveCount(0);
    await page.locator('[data-request-unlock]').evaluate(button => { button.click(); button.click(); });
    await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
    expect(await page.evaluate(() => window.calls)).toEqual(['Chân dung nâng cao']);
    await page.evaluate(() => window.finish());
    await expect(page.getByRole('button', { name: 'Mở tin nhắn trao đổi' })).toBeVisible();
    expect(await page.evaluate(() => window.opens)).toBe(1);
    await page.getByRole('button', { name: 'Mở tin nhắn trao đổi' }).click();
    expect(await page.evaluate(() => window.calls.length)).toBe(1);
    await expect(page.getByText('Không hiện khi khóa')).toHaveCount(0);
    await page.evaluate(() => { window.state.rows[0].viewers = [window.state.mail]; window.workspace.update(window.state); });
    await expect(page.locator('[data-request-unlock]')).toHaveCount(0);
    await expect(page.getByText('Nội dung riêng', { exact: true })).toBeVisible();
  });
}

test('lỗi gửi cho phép thử lại; đổi tài khoản trong lúc gửi không mở nhầm cuộc trò chuyện', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Gửi yêu cầu mở khóa' }).click();
  await page.evaluate(() => window.fail({ code: 'permission-denied' }));
  await expect(page.locator('[data-unlock-status]')).toContainText('Chưa gửi được');
  expect(await page.evaluate(() => window.opens)).toBe(0);
  await page.getByRole('button', { name: 'Gửi yêu cầu mở khóa' }).click();
  await page.evaluate(() => { window.workspace.update({ ...window.state, mail: 'other@example.com' }); window.finish(); });
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu mở khóa' })).toBeEnabled();
  expect(await page.evaluate(() => window.opens)).toBe(0);
  expect(await page.evaluate(() => window.notices)).toEqual([]);
});
