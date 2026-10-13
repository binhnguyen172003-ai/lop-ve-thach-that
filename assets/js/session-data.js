// Dữ liệu đã xem dùng cho đúng tài khoản/vai trò, kể cả mở tab mới; máy chủ vẫn quyết định quyền.
export function createSessionData({ storage = (() => { try { return globalThis.localStorage; } catch { return null; } })(), now = () => Date.now(), maxAge = 86400000 } = {}) {
  const prefix = 'lvkv-fast:';
  const key = (account, role, section) => prefix + JSON.stringify([account, role, section]);
  return {
    read(account, role, section) {
      if (!account) return null;
      try {
        const value = JSON.parse(storage.getItem(key(account, role, section)) || 'null');
        return value && now() - value.luc < maxAge ? value.data : null;
      } catch { return null; }
    },
    write(account, role, section, data) {
      if (!account) return;
      try { const value = JSON.stringify({ luc: now(), data }); if (value.length <= 2000000) storage.setItem(key(account, role, section), value); else storage.removeItem(key(account, role, section)); } catch {}
    },
    clear(account) {
      try { const keys = Array.from({length: storage.length}, (_, i) => storage.key(i)); keys.filter(k => k?.startsWith(prefix)).forEach(k => { if (!account || JSON.parse(k.slice(prefix.length))[0] === account) storage.removeItem(k); }); } catch {}
    }
  };
}
