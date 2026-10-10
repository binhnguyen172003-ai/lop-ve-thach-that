// Hội thoại chỉ lưu trên trình duyệt, tách theo tài khoản. Không lưu HTML.
export function sachHoiThoai(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0,20).filter(x => x && typeof x.id === 'string' && Array.isArray(x.tin)).map(x => ({
    id: x.id.slice(0,80), ten: String(x.ten || 'Cuộc trò chuyện').slice(0,80), luc: Number(x.luc) || 0,
    tin: x.tin.filter(t => t && ['user','model'].includes(t.role) && typeof t.text === 'string')
      .slice(-80).map(t => ({role:t.role,text:t.text.slice(0,16000)}))
  }));
}
export const markdownHoiThoai = tin => '# Trò chuyện với Bé Chì\n\n' + tin.map(t => `## ${t.role === 'user' ? 'Bạn' : 'Bé Chì'}\n\n${t.text}`).join('\n\n');
