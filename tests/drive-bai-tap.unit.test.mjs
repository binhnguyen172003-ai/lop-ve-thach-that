import test from 'node:test';
import assert from 'node:assert/strict';
import { driveURL, la2K9 } from '../assets/js/drive-bai-tap.js';
test('chỉ mở cho hồ sơ có năm sinh 2009, không suy từ tên lớp', () => {
  assert.equal(la2K9({ namSinh: 2009 }), true);
  assert.equal(la2K9({ ngaySinh: '2009-04-03' }), true);
  assert.equal(la2K9({ namSinh: 2009, ten: 'Bảo Châu' }), false);
  assert.equal(la2K9({ namSinh: 2009, vaiTro: 'trogiang' }), false);
  for (const hv of [{}, { namSinh: 2010 }, { namSinh: 2011 }, { lop: '2K9' }]) assert.equal(la2K9(hv), false);
});
test('chuẩn hóa link Drive và loại bỏ trang giả mạo / mã thực thi', () => {
  assert.equal(driveURL('https://drive.google.com/drive/u/0/folders/abc_123?usp=sharing', true), 'https://drive.google.com/drive/folders/abc_123');
  assert.equal(driveURL('https://drive.google.com/file/d/abc-123/view?usp=sharing'), 'https://drive.google.com/file/d/abc-123/view');
  assert.equal(driveURL('https://drive.google.com/open?id=abc-123'), 'https://drive.google.com/file/d/abc-123/view');
  for (const url of ['javascript:alert(1)', 'https://drive.google.com.evil.test/file/d/a/view', 'http://drive.google.com/file/d/a/view', 'https://user@drive.google.com/file/d/a/view', 'https://drive.google.com/drive/folders/a/other', 'https://example.com']) assert.equal(driveURL(url), '');
  assert.equal(driveURL('https://drive.google.com/file/d/a/view', true), '');
});
