// Chỉ triển khai cho 2K9. Các khóa sau được mở theo cấu hình riêng.
export const DRIVE_BAI_TAP = 'https://drive.google.com/drive/folders/1kyshNlOvUO_viVTJY2GBV9T3l3ZDwVL9';
export function la2K9(hv) {
  const ten = String(hv?.ten || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (ten === 'bao chau' || ['giaovien', 'trogiang'].includes(hv?.vaiTro)) return false;
  return Number(hv?.namSinh || String(hv?.ngaySinh || '').slice(0, 4)) === 2009;
}
export function driveURL(value, folderOnly = false) {
  try {
    const u = new URL(String(value || '').trim());
    if (u.protocol !== 'https:' || u.hostname !== 'drive.google.com' || u.username || u.password || u.port) return '';
    const folder = u.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)\/?$/);
    if (folder) return `https://drive.google.com/drive/folders/${folder[1]}`;
    if (folderOnly) return '';
    const file = u.pathname.match(/^\/file\/d\/([\w-]+)(?:\/view)?\/?$/);
    if (file) return `https://drive.google.com/file/d/${file[1]}/view`;
    if (['/open', '/uc'].includes(u.pathname) && /^[\w-]+$/.test(u.searchParams.get('id') || '')) return `https://drive.google.com/file/d/${u.searchParams.get('id')}/view`;
  } catch {}
  return '';
}
