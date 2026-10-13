import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
function worker(fetch) {
  const handlers = {}, stored = new Map([['./', new Response('old page')], ['./offline.html', new Response('offline')]]);
  vm.runInNewContext(source, {
    URL, setTimeout, fetch,
    self: { location: { href: 'https://example.com/sw.js?v=new', origin: 'https://example.com' }, addEventListener: (name, fn) => handlers[name] = fn },
    caches: { match: async key => stored.get(key)?.clone(), open: async () => ({ put: async (key, value) => stored.set(key, value) }) }
  });
  return async () => {
    let response; const pending = [];
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/' }, respondWith: p => response = p, waitUntil: p => pending.push(p) });
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
