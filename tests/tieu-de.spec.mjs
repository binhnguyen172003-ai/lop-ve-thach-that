import {test,expect,tranNgang} from './support/fixtures.mjs';
for(const width of [320,390,1280])test(`Tiêu đề chữ nghiêng không bị cắt ở ${width}px`,async({page,moTrang},info)=>{
 await page.setViewportSize({width,height:900});await moTrang({hash:'bang-vang'});
 const heads=page.locator('#v-home .sec-head h2');const n=await heads.count();expect(n).toBeGreaterThan(5);
 for(let i=0;i<n;i++){const h=heads.nth(i);if(!await h.isVisible())continue;await h.scrollIntoViewIfNeeded();const ok=await h.evaluate(el=>{const r=el.getBoundingClientRect();const style=getComputedStyle(el);const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()].every(q=>q.left>=r.left+1&&q.right<=r.right-1&&q.top>=r.top&&q.bottom<=r.bottom)&&parseFloat(style.lineHeight)>=parseFloat(style.fontSize)*1.2;});expect(ok,await h.textContent()).toBe(true);}
 expect(await tranNgang(page)).toBeLessThanOrEqual(1);await page.locator('#h-bv').scrollIntoViewIfNeeded();await info.attach('tieu-de',{body:await page.locator('#bang-vang .sec-head').screenshot(),contentType:'image/png'});
});
