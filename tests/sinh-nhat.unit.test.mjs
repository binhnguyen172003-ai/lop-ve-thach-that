import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ngayVietNam, ngaySinhHopLe, denSinhNhat } from '../assets/js/sinh-nhat.js';
import { duLieuChucSinhNhat, chaySinhNhat } from '../scripts/sinh-nhat.mjs';
const student = (id, birthday = '2009-10-12') => ({ name: `projects/lop-ve-thach-that/databases/(default)/documents/hocvien/${id}`, updateTime: '2026-10-11T00:00:00Z', fields: { ten: { stringValue: 'An' }, ngaySinh: { stringValue: birthday } } });
test('ngày Việt Nam qua nửa đêm và ngày sinh không hợp lệ', () => {
  assert.equal(ngayVietNam(new Date('2026-10-11T17:01:00Z')), '2026-10-12');
  for (const bad of ['2009', '', '2009-02-29', '2010-04-31', '2027-01-01']) assert.equal(ngaySinhHopLe(bad, '2026-10-12'), false);
  assert.equal(ngaySinhHopLe('2008-02-29', '2026-10-12'), true);
});
test('29/02 chỉ chúc 28/02 năm thường, 29/02 năm nhuận', () => {
  assert.equal(denSinhNhat('2008-02-29', '2027-02-28'), true);
  assert.equal(denSinhNhat('2008-02-29', '2028-02-28'), false);
  assert.equal(denSinhNhat('2008-02-29', '2028-02-29'), true);
});
test('không suy diễn ngày tháng từ hồ sơ chỉ có năm; bỏ học viên nghỉ', () => {
  const old = student('old'); delete old.fields.ngaySinh; old.fields.namSinh = { integerValue: '2009' };
  assert.equal(duLieuChucSinhNhat(old, '2026-10-12', 1), null);
  const left = student('left'); left.fields.nghiHoc = { booleanValue: true };
  assert.equal(duLieuChucSinhNhat(left, '2026-10-12', 1), null);
  assert.equal(duLieuChucSinhNhat(student('an@example.com'), '2026-10-12', 1).fields.gui.stringValue, 'an@example.com');
});
test('phân trang và chống trùng qua các lần chạy, kiểm tra hồ sơ trước khi ghi', async () => {
  const seen = new Set(); const batches = [];
  const fetcher = async (url, opts) => {
    const u = new URL(url);
    if (opts.method !== 'POST') return { ok: true, json: async () => u.searchParams.has('pageToken') ? { documents: [student('b@example.com')] } : { documents: [student('a@example.com')], nextPageToken: 'next' } };
    const { writes } = JSON.parse(opts.body); batches.push(writes);
    assert.ok(writes[0].verify.endsWith('/hocvien/a@example.com') || writes[0].verify.endsWith('/hocvien/b@example.com'));
    assert.equal(writes[0].currentDocument.updateTime, '2026-10-11T00:00:00Z');
    assert.equal(writes[1].currentDocument.exists, false); assert.equal(writes[2].currentDocument.exists, false);
    const id = writes[1].update.name;
    if (seen.has(id)) return { ok: false, status: 409, json: async () => ({ error: { status: 'ALREADY_EXISTS' } }) };
    seen.add(id); return { ok: true };
  };
  const args = { token: 'fake', fetcher, now: new Date('2026-10-11T17:01:00Z') };
  assert.deepEqual(await chaySinhNhat(args), { created: 2, skipped: 0 });
  assert.deepEqual(await chaySinhNhat(args), { created: 0, skipped: 2 });
  assert.equal(batches.length, 4);
});
test('lỗi quyền máy chủ không được che thành đã gửi', async () => {
  const fetcher = async (url, opts) => opts.method === 'POST' ? { ok: false, status: 403, json: async () => ({ error: { status: 'PERMISSION_DENIED' } }) } : { ok: true, json: async () => ({ documents: [student('a@example.com')] }) };
  await assert.rejects(chaySinhNhat({ token: 'fake', fetcher, now: new Date('2026-10-12T01:00:00Z') }), /403/);
});
