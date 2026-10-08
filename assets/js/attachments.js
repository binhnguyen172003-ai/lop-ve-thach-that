// Homework attachments: metadata stays in Firestore, file bytes stay in private Storage.
export const FILE_LIMITS = { count: 5, perFile: 10 * 1024 * 1024, total: 25 * 1024 * 1024 };
export const FILE_TYPES = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', md: 'text/markdown'
};
export const fileExt = name => String(name).split('.').pop().toLowerCase();
export const fileSize = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('vi-VN', {maximumFractionDigits: 1})} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
export function validateFiles(files) {
  if (files.length > FILE_LIMITS.count) return 'Mỗi bài tập được đính kèm tối đa 5 tệp.';
  for (const f of files) {
    if (!FILE_TYPES[fileExt(f.name)]) return `Tệp “${f.name}” chưa được hỗ trợ. Chọn PDF, ảnh, tài liệu Office, TXT hoặc MD.`;
    if (!f.size) return `Tệp “${f.name}” đang trống. Vui lòng chọn lại.`;
    if (f.size > FILE_LIMITS.perFile) return `Tệp “${f.name}” vượt 10 MB. Vui lòng giảm dung lượng hoặc chọn tệp khác.`;
  }
  if (files.reduce((sum, f) => sum + f.size, 0) > FILE_LIMITS.total) return 'Tổng dung lượng vượt 25 MB. Hãy bớt tệp trước khi giao bài.';
  return '';
}
let sdkPromise;
export async function attachmentStorage(app) {
  sdkPromise ||= import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js').catch(e => { sdkPromise = null; throw e; });
  const sdk = await sdkPromise;
  const storage = sdk.getStorage(app);
  sdk.setMaxUploadRetryTime(storage, 60000);
  sdk.setMaxOperationRetryTime(storage, 30000);
  return { ...sdk, storage };
}
export function uploadError(e) {
  if (e?.code === 'storage/canceled') return 'Đã hủy tải. Nội dung bài và các tệp đã chọn vẫn được giữ để thử lại.';
  if (['storage/unauthorized', 'storage/bucket-not-found', 'storage/no-default-bucket'].includes(e?.code))
    return 'Kho tệp chưa sẵn sàng hoặc tài khoản chưa có quyền tải lên. Nhờ quản lý kiểm tra cấu hình kho tệp; bài chưa được đăng.';
  if (e?.code === 'storage/quota-exceeded') return 'Kho tệp đã chạm giới hạn dung lượng. Bài chưa được đăng; liên hệ quản lý để kiểm tra.';
  return 'Chưa gửi được bài. Nội dung và tệp vẫn còn; kiểm tra kết nối rồi thử lại.';
}
export function validAttachmentPath(path, homeworkId) {
  return typeof path === 'string' && path.startsWith(`baitap/${homeworkId}/`) && !path.includes('..') && path.split('/').length === 3;
}
