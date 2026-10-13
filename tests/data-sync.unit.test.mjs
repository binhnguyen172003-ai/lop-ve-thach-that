import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSessionData } from '../assets/js/session-data.js';
const source = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const auditSource = source.slice(source.indexOf('const NK_BANG ='), source.indexOf('const $ ='));
const ref = { id: 'an', parent: { id: 'hocvien' } };
function audit({ cache, server, write = async () => 'saved' }) {
  const logs = [];
  const context = vm.createContext({ isTeacher: true, mail: 'teacher@test', user: { displayName: 'Teacher' }, db: {},
    getDocFromCache: cache, getDoc: server, setDoc: write, deleteDoc: write, addDoc: async (_, data) => { logs.push(data); return ref; },
    collection: (_, col) => col, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: write }) });
  vm.runInContext(auditSource + '\nbocNhatKy(); globalThis.api = { setDoc, deleteDoc, writeBatch };', context);
  return { ...context.api, logs };
}
const snap = (data, pending = false) => ({ exists: () => data !== null, data: () => data, metadata: { hasPendingWrites: pending } });
test('lưu tài liệu đang xem không chờ lượt đọc mạng cho nhật ký', async () => {
  let serverReads = 0;
  const a = audit({ cache: async () => snap({ ten: 'Old' }), server: async () => { serverReads++; throw Error('offline'); } });
  assert.equal(await a.setDoc(ref, { ten: 'New' }, { merge: true }), 'saved');
  assert.equal(serverReads, 0);
  assert.equal(a.logs.length, 1);
  assert.equal(a.logs[0].truoc, '{"ten":"Old"}');
  assert.equal(a.logs[0].sau, '{"ten":"New"}');
});
test('chưa có cache hoặc đang ghi dở vẫn lấy bản trước trước khi ghi', async () => {
  for (const cache of [async () => { throw Error('cache miss'); }, async () => snap({ ten: 'Pending' }, true)]) {
    const order = [];
    const a = audit({ cache, server: async () => { order.push('read'); return snap({ ten: 'Server' }); }, write: async () => { order.push('write'); } });
    await a.setDoc(ref, { ten: 'New' });
    assert.deepEqual(order, ['read', 'write']);
    assert.equal(a.logs[0].truoc, '{"ten":"Server"}');
  }
});
test('ghi bị từ chối không báo thành công và không ghi nhật ký thành công', async () => {
  const a = audit({ cache: async () => snap({ ten: 'Old' }), server: async () => snap(null), write: async () => { throw Object.assign(Error('denied'), { code: 'permission-denied' }); } });
  await assert.rejects(a.setDoc(ref, { ten: 'New' }), { code: 'permission-denied' });
  assert.equal(a.logs.length, 0);
});
test('batch và xoá giữ bản trước, không thêm lượt đọc mạng khi đã có dữ liệu', async () => {
  const a = audit({ cache: async () => snap({ ten: 'Old' }), server: async () => { throw Error('must not read network'); } });
  const batch = a.writeBatch({}); batch.set(ref, { ten: 'New' }, { merge: true });
  await batch.commit(); await a.deleteDoc(ref);
  assert.deepEqual(a.logs.map(x => x.loai), ['sua', 'xoa']);
  assert.ok(a.logs.every(x => x.truoc === '{"ten":"Old"}'));
});
test('mở tab mới nhớ danh sách, xoá khi đăng xuất, không lẫn vai trò', () => {
  const m = new Map();
  globalThis.localStorage = { getItem: k => m.get(k), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i] };
  try {
    createSessionData().write('boss@test', 'admin', 'staff', { roster: [{ id: 'an' }] });
    const otherTab = createSessionData();
    assert.equal(otherTab.read('boss@test', 'admin', 'staff').roster[0].id, 'an');
    assert.equal(otherTab.read('boss@test', 'student', 'staff'), null);
    otherTab.clear();
    assert.equal(createSessionData().read('boss@test', 'admin', 'staff'), null);
  } finally { delete globalThis.localStorage; }
});
test('ảnh trả về muộn vẫn khôi phục mục chưa đồng bộ, không ghi đè mục mới', async () => {
  let request, timer;
  const saved = new Map();
  const context = vm.createContext({ store: { get: () => null }, Date, Set, Array, JSON, window: { indexedDB: true },
    BAIVE_DONG: [], BANTIN_DONG: [], GIAO_VIEN: [],
    indexedDB: { open: () => { const open = {}; queueMicrotask(() => { open.result = { transaction: (_, mode) => ({ objectStore: () => ({ get: () => request = {}, put: value => saved.set('idb', value) }) }) }; open.onsuccess(); }); return open; } },
    localStorage: { setItem: (_, v) => saved.set('local', JSON.parse(v)) },
    renderGallery() {}, renderBanTin() {}, renderGiaoVien() {}, dispatchEvent() {}, Event: class {},
    clearTimeout() {}, setTimeout: fn => { timer = fn; return 1; } });
  const publicSource = source.slice(source.indexOf('const PUBLIC_CACHE_KEY'), source.indexOf('/* ---------- Tự lưu nháp'));
  vm.runInContext(publicSource, context);
  await new Promise(r => setImmediate(r));
  vm.runInContext('BANTIN_DONG = [{ id: "new-news" }]; savePublicContent("bantin");', context);
  const saving = timer();
  request.result = { luc: Date.now(), baive: [{ id: 'cached-art' }], bantin: [{ id: 'old-news' }], doingu: [{ ten: 'Teacher' }] };
  request.onsuccess();
  await saving;
  assert.equal(saved.get('local').baive[0].id, 'cached-art');
  assert.equal(saved.get('local').bantin[0].id, 'new-news');
  assert.equal(saved.get('local').doingu[0].ten, 'Teacher');
});
test('vận hành gộp lưu cache, bỏ lần vẽ chỉ đổi metadata và chặn callback phiên cũ', async () => {
  const operations = await readFile(new URL('../assets/js/van-hanh.js', import.meta.url), 'utf8');
  const fragment = operations.slice(operations.indexOf('  const nghe ='), operations.indexOf('  nghe(query'));
  let callback, timer, writes = 0, redraws = 0, updates = 0;
  const ctx = { mail: 'boss', fastData: { write() { writes++; } }, themHuy() {} };
  const context = vm.createContext({ C: ctx, ctx, cacheRole: 'admin', D: {}, huy: [], cacheTimer: 0,
    onSnapshot: (_, __, fn) => { callback = fn; return () => {}; },
    clearTimeout() {}, setTimeout: fn => { timer = fn; return 1; }, ve: () => { redraws++; } });
  vm.runInContext(fragment + '\nglobalThis.subscribe = nghe;', context);
  context.subscribe({}, () => { updates++; });
  const snapshot = changed => ({ metadata: { fromCache: false }, docs: [], docChanges: () => changed ? [{}] : [] });
  callback(snapshot(true)); callback(snapshot(false));
  assert.equal(updates, 1); assert.equal(redraws, 1); assert.equal(writes, 0);
  timer(); assert.equal(writes, 1);
  context.C = { mail: 'different-user' };
  callback(snapshot(true));
  assert.equal(updates, 1);
});
