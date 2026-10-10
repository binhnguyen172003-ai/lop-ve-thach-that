import {test,expect,choVaiTro,tranNgang,timTranChu} from './support/fixtures.mjs';
import {TK,duLieuMau} from './support/du-lieu-mau.mjs';
for(const width of [320,390,768,1280]) test(`Bố cục báo cáo, XP, hạng và lịch ở ${width}px`,async({page,moTrang},info)=>{
 await page.setViewportSize({width,height:900});const db=duLieuMau();db.kho={but:{ten:'Bút chì thử',loai:'Bút',ton:20,von:2000,gia:5000}};await moTrang({nguoi:TK.quanLy,hash:'tai-khoan',db});await choVaiTro(page,'quanLy');
 await expect(page.locator('#f-xh')).toBeVisible();await expect(page.locator('#xh-ten')).toBeVisible();
 const form=await page.locator('#f-xh').evaluate(el=>{const f=el.getBoundingClientRect();return [...el.querySelectorAll('input,select,button')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.left>=f.left-1&&r.right<=f.right+1;});});expect(form).toBe(true);
 await expect(page.locator('#f-xh .xh-xp')).toBeVisible();await page.locator('#f-xh [data-l="thanhtuu"]').click();await expect(page.locator('#f-xh .xh-tt')).toBeVisible();await expect(page.locator('#f-xh .xh-xp')).toBeHidden();await page.locator('#f-xh [data-l="xp"]').click();
 await info.attach('form-xp',{body:await page.locator('#xh-ql').screenshot(),contentType:'image/png'});
 await page.locator('#rk-dots button').nth(4).click();await page.waitForTimeout(500);
 const safe=await page.locator('.rk-card.on .rk-in').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].every(e=>{const b=e.getBoundingClientRect();return b.top>=r.top+8&&b.bottom<=r.bottom-8;});});expect(safe).toBe(true);
 await info.attach('the-hang',{body:await page.locator('.rk-ring').screenshot(),contentType:'image/png'});
 await page.goto('/#kho');await page.locator('[data-kt="ll"]').click();const btns=await page.locator('.kho-report-actions .btn').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,right:r.right,bottom:r.bottom};}));expect(btns[1].y>=btns[0].bottom+8||btns[1].x>=btns[0].right+8).toBe(true);await info.attach('bao-cao',{body:await page.locator('.kho-report-actions').screenshot(),contentType:'image/png'});
 expect(await tranNgang(page)).toBeLessThanOrEqual(1);expect(await timTranChu(page,'#xh-ql')).toEqual([]);
 await page.goto('/#van-hanh');await expect(page.locator('.lpc-bang')).toBeVisible();await expect(page.locator('.lpc-gv-ten').first()).toBeVisible();const sizes=await page.locator('.lpc-gv-ten').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));expect(sizes.every(x=>x.width>=90&&x.height<80)).toBe(true);await info.attach('lich-phan-cong',{body:await page.locator('.lpc').screenshot(),contentType:'image/png'});
});
