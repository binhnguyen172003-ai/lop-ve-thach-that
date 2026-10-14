import { test, expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';

test('Quản lý mở được bảng học viên từ phiên đã lưu khi máy chủ chưa trả lời', async ({ page }) => {
  await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
  await page.addInitScript(() => localStorage.setItem('lvkv-phien', JSON.stringify({
    mail: 'admin-fixture@example.com', ten: 'Quản lý thử', isAdmin: true, isTeacher: true
  })));
  await page.route('**/assets/js/app.js?*', async route => {
    const source = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
    // Chỉ thay dữ liệu trong trình duyệt thử; Firebase đã bị chặn ở trên.
    await route.fulfill({ contentType: 'text/javascript', body: source + `
      window.adminContentFixture = rows => {
        roster = rows; window.__rosterReady = true; renderQL();
      };` });
  });
  await page.goto('/#duyet');
  await expect(page.locator('#ql-tong-h')).toBeVisible();
  await expect(page.locator('#ql-tong')).toContainText('Đang tải danh sách học viên');
  await page.getByRole('link', { name: 'Học viên & % đỗ', exact: true }).click();
  await expect(page.locator('#ql-q')).toBeVisible();
  await page.evaluate(() => window.adminContentFixture([
    { id: 'fixture-a', ten: 'Nguyễn An', coso: 'Bình Phú', khoi: 'Khối H' },
    { id: 'fixture-b', ten: 'Trần Bình', coso: 'Kim Quan', khoi: 'Khối V' }
  ]));
  await expect(page.locator('.ql-bang tbody tr')).toHaveCount(2);
  await page.locator('#ql-q').fill('nguyen an');
  await expect(page.locator('.ql-bang tbody tr')).toHaveCount(1);
  await expect(page.locator('.ql-bang')).toContainText('Nguyễn An');
  await page.locator('#ql-q').fill('khong co');
  await expect(page.locator('.ql-bang')).toContainText('Không có học viên phù hợp bộ lọc');
  await page.evaluate(() => window.adminContentFixture([]));
  await expect(page.locator('.ql-bang')).toContainText('Chưa có học viên nào được duyệt');
});

test('550 học viên: phân trang, tìm toàn bộ danh sách, giao diện dài không tràn', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => localStorage.setItem('lvkv-phien', JSON.stringify({mail:'fixture@example.com',ten:'Thử nghiệm',isAdmin:true,isTeacher:true})));
  await page.route('**/assets/js/app.js?*', async route => {
    const source=await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
    await route.fulfill({contentType:'text/javascript',body:source+`\nwindow.auditFixture=()=>{roster=Array.from({length:550},(_,i)=>({id:'fixture-'+i,ten:'Học viên thử nghiệm '+i,coso:'Bình Phú',khoi:'Khối H'}));window.__rosterReady=true;renderQL();};`});
  });
  await page.goto('/#duyet'); await page.waitForFunction(()=>window.auditFixture);
  await page.evaluate(()=>window.auditFixture());
  await expect(page.locator('.ql-bang tbody tr')).toHaveCount(30);
  await expect(page.locator('.ql-pagination')).toContainText('1–30 / 550');
  await page.getByRole('button',{name:'Trang sau',exact:true}).click();
  await expect(page.locator('.ql-pagination')).toContainText('31–60 / 550');
  await page.locator('#ql-q').fill('549');
  await expect(page.locator('.ql-bang tbody tr')).toHaveCount(1);
  await expect(page.locator('.ql-bang')).toContainText('Học viên thử nghiệm 549');
  await page.locator('#ql-q').fill('');
  await expect(page.locator('.ql-pagination')).toContainText('1–30 / 550');
  for(const width of [320,390,768,1366]) {
    await page.setViewportSize({width,height:844});
    for(const theme of ['light','dark']) {
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    }
  }
});
