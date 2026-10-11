// Dùng chung cho biểu mẫu và lịch chúc sinh nhật; không phụ thuộc múi giờ thiết bị.
export function ngayVietNam(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function ngaySinhHopLe(value, today = ngayVietNam()) {
  if (typeof value !== 'string' || !/^(19|20)\d{2}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function hienNgaySinh(value) {
  return ngaySinhHopLe(value) ? value.split('-').reverse().join('/') : '';
}
export function denSinhNhat(value, today = ngayVietNam()) {
  if (!ngaySinhHopLe(value, today)) return false;
  const year = Number(today.slice(0, 4));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDay = value.slice(5) === '02-29' && !leap ? '02-28' : value.slice(5);
  return monthDay === today.slice(5);
}
