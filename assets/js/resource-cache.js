// Nội dung khóa học/eBook lưu riêng theo tài khoản, không chặn việc tải dữ liệu mới.
export function createResourceCache({ indexedDB = globalThis.indexedDB, now = () => Date.now(), maxAge = 86400000 } = {}) {
  const memory = new Map();
  const database = new Promise(resolve => {
    if (!indexedDB) return resolve(null);
    let settled = false;
    const finish = value => { if (settled) { value?.close(); return; } settled = true; resolve(value); };
    try {
      const request = indexedDB.open("lvkv-resource-content", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("accounts");
      request.onsuccess = () => finish(request.result);
      request.onerror = request.onblocked = () => finish(null);
    } catch { finish(null); }
  });
  const valid = value => value && now() - value.luc < maxAge && Array.isArray(value.rows);
  const transact = async (mode, action) => {
    const db = await database;
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const transaction = db.transaction("accounts", mode);
        const request = action(transaction.objectStore("accounts"));
        transaction.oncomplete = () => resolve(request.result ?? null);
        transaction.onerror = transaction.onabort = () => resolve(null);
      } catch { resolve(null); }
    });
  };
  return {
    async read(account) {
      if (!account) return null;
      const value = memory.get(account) || await transact("readonly", store => store.get(account));
      return valid(value) ? value.rows : null;
    },
    async write(account, rows) {
      if (!account || !Array.isArray(rows)) return;
      const value = { luc: now(), rows: rows.filter(row => ["nang-cao", "ebook"].includes(row.phan)) };
      memory.set(account, value);
      await transact("readwrite", store => store.put(value, account));
    },
    async clear(account) {
      if (!account) return;
      memory.delete(account);
      await transact("readwrite", store => store.delete(account));
    }
  };
}
