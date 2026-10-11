// Chỉ chạy bằng Firestore emulator, tuyệt đối không ghi dữ liệu máy chủ thật.
import assert from 'node:assert/strict';
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(host && /^(127\.0\.0\.1|localhost):\d+$/.test(host), 'Cần emulator cục bộ');
const project = 'demo-dreamers-birthday';
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const email = 'student@example.com';
const token = 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: 'student', user_id: 'student', email, email_verified: true, iat: 1, exp: 9999999999, firebase: { sign_in_provider: 'password' } })).toString('base64url') + '.';
const fields = object => Object.fromEntries(Object.entries(object).map(([k,v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }]));
async function write(path, data, auth = token) {
  return fetch(`${base}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }) });
}
const hv = { ten: 'An', ngaySinh: '2009-10-12', namSinh: 2009, khoi: 'Cả H và V', sdt: '', truongThi: 'HAU' };
assert.equal((await write(`hocvien/${email}`, hv, 'owner')).status, 200);
assert.equal((await write(`hocvien/${email}`, { ...hv, ngaySinh: '2008-02-29', namSinh: 2008 })).status, 200);
for (const invalid of [{ ngaySinh: '2009-02-29', namSinh: 2009 }, { ngaySinh: '2010-04-31', namSinh: 2010 }, { ngaySinh: '2099-01-01', namSinh: 2099 }, { ngaySinh: '2008-02-29', namSinh: 2009 }]) {
  assert.equal((await write(`hocvien/${email}`, { ...hv, ...invalid })).status, 403);
}
const req = { ...hv, vaiTro: 'hocvien', gmail: email };
assert.equal((await write(`yeucau/${email}`, req)).status, 200);
assert.equal((await write('thongbao/private', { gui: email, nd: 'Chúc mừng sinh nhật' }, 'owner')).status, 200);
assert.equal((await write('thongbao/other', { gui: 'other@example.com', nd: 'Riêng' }, 'owner')).status, 200);
const read = path => fetch(`${base}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
assert.equal((await read('thongbao/private')).status, 200);
assert.equal((await read('thongbao/other')).status, 403);
assert.equal((await read('sinhnhat_da_gui/test')).status, 403);
console.log('PASS: lưu ngày sinh, lịch hợp lệ, năm khớp, thông báo riêng và sổ gửi được bảo vệ.');
