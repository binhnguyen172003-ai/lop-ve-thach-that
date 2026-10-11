import { createHash, createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ngayVietNam, denSinhNhat } from '../assets/js/sinh-nhat.js';

const PROJECT = 'lop-ve-thach-that';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const API = `https://firestore.googleapis.com/v1/${ROOT}`;
const string = value => ({ stringValue: String(value) });
export function duLieuChucSinhNhat(student, today, now) {
  const f = student.fields || {};
  const sinh = f.ngaySinh?.stringValue;
  if (!denSinhNhat(sinh, today) || f.vaiTro?.stringValue === 'giaovien'
      || f.nghiHoc?.booleanValue === true || f.trangThai?.stringValue === 'nghi') return null;
  const mail = decodeURIComponent(student.name.split('/').pop());
  const ten = f.ten?.stringValue || 'em';
  const id = createHash('sha256').update(`${mail}:${today.slice(0, 4)}`).digest('hex');
  return { id, fields: {
    tieuDe: string(`🎂 Chúc mừng sinh nhật ${ten}!`.slice(0, 120)),
    nd: string(`Dreamers chúc em tuổi mới nhiều niềm vui, vẽ ngày càng tiến bộ và đạt được mục tiêu của mình nhé!`),
    gui: string(mail), tacGia: string('dreamers-tu-dong'), ten: string('Dreamers'),
    luc: { integerValue: String(now) }, tuDong: { booleanValue: true }, loai: string('sinhnhat')
  } };
}
async function tokenFor(sa, fetcher) {
  if (sa.project_id !== PROJECT) throw new Error('Tài khoản dịch vụ không thuộc dự án của lớp.');
  const now = Math.floor(Date.now() / 1000);
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(sa.private_key).toString('base64url')}`;
  const res = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Không xác thực được tài khoản dịch vụ (${res.status}).`);
  return (await res.json()).access_token;
}
export async function chaySinhNhat({ token, fetcher = fetch, now = new Date() }) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const today = ngayVietNam(now);
  let page = '', created = 0, skipped = 0;
  do {
    const url = new URL(`${API}/hocvien`); url.searchParams.set('pageSize', '300');
    if (page) url.searchParams.set('pageToken', page);
    const res = await fetcher(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Không đọc được danh sách học viên (${res.status}).`);
    const data = await res.json(); page = data.nextPageToken || '';
    for (const student of data.documents || []) {
      const wish = duLieuChucSinhNhat(student, today, now.getTime());
      if (!wish) continue;
      // Sổ gửi giữ riêng: xoá thông báo cũng không khiến lịch gửi lại trong năm đó.
      // Verify hồ sơ vẫn tồn tại và chưa đổi từ lúc đọc; hai create ghi nguyên tử.
      const writes = [
        { verify: student.name, currentDocument: { updateTime: student.updateTime } },
        { update: { name: `${ROOT}/sinhnhat_da_gui/${wish.id}`, fields: { ngay: string(today) } }, currentDocument: { exists: false } },
        { update: { name: `${ROOT}/thongbao/sinhnhat-${wish.id}`, fields: wish.fields }, currentDocument: { exists: false } }
      ];
      const commit = await fetcher(`${API}:commit`, { method: 'POST', headers, body: JSON.stringify({ writes }), signal: AbortSignal.timeout(30000) });
      if (commit.ok) { created++; continue; }
      const err = await commit.json().catch(() => ({}));
      if (['ALREADY_EXISTS', 'FAILED_PRECONDITION', 'NOT_FOUND'].includes(err.error?.status)) { skipped++; continue; }
      throw new Error(`Không tạo được lời chúc sinh nhật (${commit.status}).`);
    }
  } while (page);
  // Không ghi tên, Gmail, ngày sinh hay token vào log.
  console.log(`Sinh nhật ${today}: tạo ${created}, đã gửi hoặc hồ sơ đã đổi ${skipped}.`);
  return { created, skipped };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sa = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    await chaySinhNhat({ token: await tokenFor(sa, fetch) });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
