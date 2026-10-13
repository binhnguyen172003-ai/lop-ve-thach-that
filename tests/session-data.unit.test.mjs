import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionData } from '../assets/js/session-data.js';
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test('tải lại khôi phục đúng tài khoản, vai trò và phần dữ liệu',()=>{
 const s=storage(), a=createSessionData({storage:s,now:()=>100});
 a.write('admin@test','admin','staff',{roster:[{id:'a',ten:'An'}]});
 const b=createSessionData({storage:s,now:()=>101});
 assert.equal(b.read('admin@test','admin','staff').roster[0].ten,'An');
 assert.equal(b.read('student@test','student','staff'),null);
 assert.equal(b.read('admin@test','teacher','staff'),null);
 assert.equal(b.read('admin@test','admin','operations'),null);
});
test('đổi người dùng / đăng xuất xoá bộ nhớ của người trước',()=>{
 const s=storage(), c=createSessionData({storage:s});
 c.write('a','admin','staff',{n:1});c.write('b','teacher','tasks',[]);c.clear('a');
 assert.equal(c.read('a','admin','staff'),null);assert.deepEqual(c.read('b','teacher','tasks'),[]);
 c.clear();assert.equal(s.length,0);
});
test('hết hạn, JSON hỏng hoặc không cho ghi bộ nhớ vẫn không chặn trang',()=>{
 const s=storage(), c=createSessionData({storage:s,now:()=>100,maxAge:5});c.write('a','admin','staff',{});
 assert.equal(createSessionData({storage:s,now:()=>106,maxAge:5}).read('a','admin','staff'),null);
 s.setItem('lvkv-fast:["b","admin","staff"]','broken');assert.equal(c.read('b','admin','staff'),null);
 const bad=createSessionData({storage:{getItem(){throw Error()},setItem(){throw Error()}}});assert.equal(bad.read('a','admin','staff'),null);assert.doesNotThrow(()=>bad.write('a','admin','staff',{}));
});
