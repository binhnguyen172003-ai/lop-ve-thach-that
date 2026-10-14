import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
function worker(fetch, preloadResponse) {
  const handlers = {}, stored = new Map([['./', new Response('old page')], ['./offline.html', new Response('offline')]]);
  vm.runInNewContext(source, {
    URL, setTimeout, fetch,
    self: { location: { href: 'https://example.com/sw.js?v=new', origin: 'https://example.com' }, addEventListener: (name, fn) => handlers[name] = fn },
    caches: { match: async key => stored.get(key)?.clone(), open: async () => ({ put: async (key, value) => stored.set(key, value) }) }
  });
  return async () => {
    let response; const pending = [];
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/' }, preloadResponse, respondWith: p => response = p, waitUntil: p => pending.push(p) });
    const result = await response; await Promise.all(pending); return { text: await result.text(), saved: await stored.get('./').text() };
  };
}
test('mạng chậm hơn 0,8 giây vẫn trả trang mới, không nháy bản cũ', async () => {
  const run = worker(async () => { await new Promise(r => setTimeout(r, 1000)); return new Response('new page'); });
  assert.deepEqual(await run(), { text: 'new page', saved: 'new page' });
});
test('mất mạng vẫn mở trang đã lưu', async () => {
  const run = worker(async () => { throw new Error('offline'); });
  assert.equal((await run()).text, 'old page');
});
test('trang tải trước được dùng và lưu, không tải HTML lần thứ hai', async () => {
  let requests = 0;
  const run = worker(async () => { requests++; return new Response('duplicate'); }, Promise.resolve(new Response('new page')));
  assert.deepEqual(await run(), { text: 'new page', saved: 'new page' });
  assert.equal(requests, 0);
});
test('tải trước lỗi vẫn thử mạng và lấy trang mới', async () => {
  const run = worker(async () => new Response('new page'), Promise.reject(new Error('preload failed')));
  assert.deepEqual(await run(), { text: 'new page', saved: 'new page' });
});
test('tải trước trả lỗi HTTP vẫn thử mạng', async () => {
  const run = worker(async () => new Response('new page'), Promise.resolve(new Response('unavailable', { status: 503 })));
  assert.deepEqual(await run(), { text: 'new page', saved: 'new page' });
});
test('cả tải trước và mạng lỗi vẫn mở được trang đã lưu', async () => {
  const run = worker(async () => { throw new Error('offline'); }, Promise.reject(new Error('offline')));
  assert.equal((await run()).text, 'old page');
});
test('worker kích hoạt được khi preload hỗ trợ, không hỗ trợ hoặc bị lỗi', async () => {
  for (const mode of ['enabled', 'unsupported', 'failure']) {
    const handlers = {}; let enabled = 0, claimed = 0;
    vm.runInNewContext(source, {
      URL,
      self: {
        location: { href: 'https://example.com/sw.js?v=new', origin: 'https://example.com' },
        addEventListener: (name, fn) => handlers[name] = fn,
        registration: { navigationPreload: mode === 'unsupported' ? undefined : { enable: async () => { enabled++; if (mode === 'failure') throw new Error('unsupported'); } } },
        clients: { claim: async () => claimed++ }
      },
      caches: { keys: async () => ['lvkv-trang-old'], delete: async () => true }
    });
    let pending; handlers.activate({ waitUntil: p => pending = p }); await pending;
    assert.equal(enabled, mode === 'unsupported' ? 0 : 1);
    assert.equal(claimed, 1);
  }
});
