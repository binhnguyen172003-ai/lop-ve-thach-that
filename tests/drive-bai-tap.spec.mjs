import { test, expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';

test('2K9 nộp link Drive, lưu lỗi không đổi tiến độ; 2K10 và trợ giảng không có luồng nộp', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => localStorage.setItem('lvkv-phien', JSON.stringify({ mail:'fixture@example.com', ten:'Học viên thử', approved:true, hv:{ten:'Học viên thử',namSinh:2009} })));
  await page.route('**/assets/js/app.js?*', async route => {
    const source = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
    await route.fulfill({contentType:'text/javascript',body: source + `
      window.driveFixture = (namSinh = 2009, ten = 'Học viên thử') => {
        myHv = {ten, namSinh, driveBaiTap:'https://drive.google.com/drive/folders/fixture'};
        homework = [{id:'fixture',ten:'Đề thử',choHv:[mail]}]; myProgress = {bai:{},baitap:{}};
        user.uid = 'fixture-uid'; luuTienDo = async () => {throw Error('offline')}; renderHomework();
      };`});
  });
  await page.goto('/#bai-tap');
  await page.waitForFunction(() => window.driveFixture);
  await page.evaluate(() => window.driveFixture());
  await expect(page.getByRole('link',{name:'Mở thư mục của em ↗',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nộp bài từ Drive',exact:true}).click();
  await page.locator('#drive-nop-url').fill('https://evil.example');
  await page.locator('#drive-nop-save').click();
  await expect(page.locator('#drive-nop-st')).toContainText('hợp lệ');
  await page.locator('#drive-nop-url').fill('https://drive.google.com/file/d/fixture/view');
  await page.locator('#drive-nop-save').click();
  await expect(page.locator('#drive-nop-st')).toContainText('Chưa gửi được');
  await expect(page.locator('[data-hw="fixture"]')).toHaveText('Đánh dấu đã nộp');
  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  for (const [nam, ten] of [[2010,'Học viên thử'],[2011,'Học viên thử'],[2009,'Bảo Châu']]) {
    await page.evaluate(([nam,ten]) => window.driveFixture(nam,ten), [nam,ten]);
    await expect(page.locator('#drive-bai-tap')).toBeHidden();
    await expect(page.locator('[data-drive-nop]')).toHaveCount(0);
  }
});
