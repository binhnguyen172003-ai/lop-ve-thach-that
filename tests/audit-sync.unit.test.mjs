import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const src = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const fragment = src.slice(src.indexOf('let listenerGeneration ='), src.indexOf('/* ---------- Nhớ phiên đăng nhập'));
function setup() {
  const callbacks = [], events = new Map(); let stopped = 0;
  const ctx = vm.createContext({ user: {}, unsubs: [], vanHanhM: null, tacVuM: null, performance, mark() {}, serverIssue() {},
    onSnapshot: (...args) => { callbacks.push(args.find(x => typeof x === 'function')); return () => stopped++; },
    addEventListener: (k, f) => events.set(k, f), removeEventListener: k => events.delete(k),
    $: () => ({ hidden: ctx.hidden }), hidden: true });
  vm.runInContext(fragment + '\nglobalThis.api = { listen, listenOnPage, stopListeners };', ctx);
  return {ctx, callbacks, events, stopped: () => stopped, ...ctx.api};
}
const snap = (changed, cache = false) => ({ docs: [{}], metadata: { fromCache: cache }, docChanges: () => changed ? [{}] : [] });
test('giữ lần xác nhận máy chủ, bỏ metadata lặp và callback cũ cùng tài khoản', () => {
  const s=setup(); let renders=0;
  s.listen({},()=>renders++);
  s.callbacks[0](snap(true,true)); s.callbacks[0](snap(false)); s.callbacks[0](snap(false));
  assert.equal(renders,2);
  s.callbacks[0](snap(true)); assert.equal(renders,3);
  s.stopListeners(); s.callbacks[0](snap(true)); assert.equal(renders,3);
});
test('ảnh bài nộp chỉ đăng ký khi mở bài tập, dừng khi rời và khi hết phiên', () => {
  const s=setup(); let renders=0;
  s.listenOnPage('bai-tap',{},()=>renders++);
  assert.equal(s.callbacks.length,0);
  s.ctx.hidden=false; s.events.get('hashchange')();
  assert.equal(s.callbacks.length,1);s.callbacks[0]({});assert.equal(renders,1);
  s.ctx.hidden=true;s.events.get('hashchange')();s.callbacks[0]({});assert.equal(renders,1);assert.equal(s.stopped(),1);
  s.ctx.hidden=false;s.events.get('hashchange')();assert.equal(s.callbacks.length,2);
  s.stopListeners();s.callbacks[1]({});assert.equal(renders,1);assert.equal(s.events.size,0);
});
