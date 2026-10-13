import { test, expect } from 'playwright/test';
const routes = ['tong-quan','khoa-hoc','ebook','giao-trinh','bai-tap','tai-khoan','duyet','diem-danh','lam-viec','thi-thu','van-hanh'];
for (const width of [320,375,430,768,1366]) for (const theme of ['light','dark']) {
  test(`bố cục và chuyển trang ${width}px ${theme}`, async ({page}) => {
    await page.setViewportSize({width,height:800});
    await page.addInitScript(theme=>localStorage.setItem('lvkv-theme',theme),theme);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#nav-search')).toBeVisible();
    await page.locator('#nav-search').click();
    await expect(page.locator('#tk-q')).toBeVisible();
    await page.locator('#tk-q').fill('giáo trình');
    await page.locator('#tk-q').press('Escape');
    await expect(page.locator('#tk-ov')).toBeHidden();
    for (const route of routes) {
      await page.goto('/#'+route);
      await expect(page.locator('#v-'+route)).toBeVisible();
      expect(await page.evaluate(()=>({width:innerWidth,actual:document.documentElement.scrollWidth}))).toMatchObject({width});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      expect(overflow,route+' tràn ngang').toBeLessThanOrEqual(1);
      expect(await page.locator('main:not([hidden])').count()).toBe(1);
    }
    await page.goto('/');
    await expect(page.locator('#v-home')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('đổi trường và lớp cập nhật đồng hồ, trở lại sau khi ẩn',async({page})=>{
  await page.goto('/#dang-ky');
  await page.locator('#dk-truong').selectOption({label:'ĐH Mỹ thuật Công nghiệp'});
  await expect(page.locator('#dk-cd-t')).toContainText('Mỹ thuật Công nghiệp');
  await page.locator('#dk-lop').selectOption('Người lớn học vẽ');
  await expect(page.locator('#dk-cd')).toBeHidden();
  await page.locator('#dk-lop').selectOption('Lớp 11');
  await expect(page.locator('#dk-cd')).toBeVisible();
  await expect(page.locator('#dk-cd-t')).toContainText('2028');
  const first=await page.locator('#cd-s').textContent();
  await expect(page.locator('#cd-s')).not.toHaveText(first,{timeout:4000});
});

test('menu điện thoại mở, cuộn được và đóng sau khi chọn trang',async({page})=>{
  await page.setViewportSize({width:320,height:640});await page.goto('/');
  await page.locator('#nav-search').click();await page.locator('#tk-q').press('Escape');
  await page.locator('#nav-burger').click();
  await expect(page.locator('#menu-ov')).toHaveClass(/open/);
  await expect(page.locator('#menu-ov')).toBeVisible();
  await page.locator('#menu-ov a[href="#ebook"]').click();
  await expect(page.locator('#menu-ov')).not.toHaveClass(/open/);
  await expect(page.locator('#v-ebook')).toBeVisible();
});

test('ảnh khóa học tải lỗi giữ khung và không tải lặp khi cập nhật trạng thái',async({page})=>{
  let imageRequests=0;
  await page.route('**/broken-cover.jpg',route=>{imageRequests++;return route.abort();});
  await page.route('**/image-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/assets/css/style.css"><div class="wrap"><div id="root" class="resource-workspace"></div></div>'}));
  await page.goto('/image-fixture');
  await page.evaluate(async()=>{
    const {createResourceWorkspace}=await import('/assets/js/resource-workspace.js');
    window.state={rows:[{id:'lesson',phan:'nang-cao',khoa:'Màu',ten:'Tên bài dài '.repeat(15),anh:'https://example.com/broken-cover.jpg'}],marks:{},staff:true,canManage:true};
    window.workspace=createResourceWorkspace(document.querySelector('#root'),{phan:'nang-cao',markdown:x=>x,notify:()=>{}});window.workspace.update(window.state);
  });
  await expect(page.locator('.gt-anh')).toHaveClass(/rw-image-unavailable/);
  await expect(page.locator('.gt-anh img')).toBeHidden();
  const before=imageRequests;
  await page.evaluate(()=>window.workspace.update({...window.state,staff:false,marks:{lesson:true}}));
  await expect(page.locator('.gt-anh')).toHaveClass(/rw-image-unavailable/);
  await page.waitForLoadState('networkidle');
  expect(imageRequests).toBe(before);
  await page.setViewportSize({width:320,height:640});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-open="lesson"]').click();
  await expect(page.locator('.rw-detail')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

for(const ebook of [false,true]) test(`${ebook?'eBook':'Khóa học'} quản lý quyền bằng dữ liệu giả lập, tên dài và lưu không trùng`,async({page})=>{
  await page.route('**/manager-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/assets/css/style.css"><div class="wrap"><div id="root" class="resource-workspace"></div></div>'}));
  await page.goto('/manager-fixture');
  await page.evaluate(async ebook=>{
    const {createResourceWorkspace}=await import('/assets/js/resource-workspace.js');
    const phan=ebook?'ebook':'nang-cao';window.saved=[];window.state={mail:'manager@example.com',staff:true,canManage:true,rows:[{id:'meta',phan,loai:'khoa',khoa:'Giải phẫu nâng cao',access:'selected',viewers:[]},{id:'lesson',phan,khoa:'Giải phẫu nâng cao',ten:'Bài tham khảo'}],viewers:Array.from({length:40},(_,i)=>({id:`student-${i}@example.com`,ten:`Nguyễn Văn Học Viên ${i}`}))};
    window.workspace=createResourceWorkspace(document.querySelector('#root'),{phan,ebook,markdown:x=>x,notify:()=>{},save:async(id,data)=>{window.saved.push({id,data});}});window.workspace.update(window.state);
  },ebook);
  // eBook mở danh mục trước khi hiển thị các công cụ quản lý.
  const category=page.locator('[data-category]');if(await category.isVisible())await category.click();
  for(const width of [320,768,1366])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:640});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    await page.locator('[data-access]').click();
    await page.locator('[data-viewer-search]').fill('Học Viên 39');
    await expect(page.locator('[data-viewer-row]:visible')).toHaveCount(1);
    await page.locator('[data-viewer-row]:visible input').check();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('[data-access-cancel]').click();
  }
  await page.locator('[data-access]').click();await page.locator('[data-viewer-search]').fill('Học Viên 39');await page.locator('[data-viewer-row]:visible input').check();
  await page.getByRole('button',{name:'Lưu quyền xem',exact:true}).click();
  expect(await page.evaluate(()=>window.saved.length)).toBe(1);
  expect(await page.evaluate(()=>window.saved[0].data.viewers)).toEqual(['student-39@example.com']);
  await page.evaluate(()=>window.workspace.update({...window.state,staff:true,canManage:false}));
  await expect(page.locator('[data-access]')).toHaveCount(0);
  await expect(page.locator('[data-add]')).toHaveCount(0);
});

test('lọc tài khoản trên điện thoại thực sự ẩn dòng không khớp',async({page})=>{
  await page.setViewportSize({width:320,height:640});
  await page.route('**/hidden-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/assets/css/style.css"><div id="requests"><div class="req-item" hidden>Không khớp</div></div><div id="roster"><table class="dw"><tbody><tr hidden><td>Không khớp</td></tr></tbody></table></div><div id="teachers"><table class="dw"><tbody><tr hidden><td>Không khớp</td></tr></tbody></table></div>'}));
  await page.goto('/hidden-fixture');
  await expect(page.locator('.req-item')).toBeHidden();
  await expect(page.locator('#roster tr')).toBeHidden();
  await expect(page.locator('#teachers tr')).toBeHidden();
});
