import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sachHoiThoai,markdownHoiThoai} from '../assets/js/chat-history.js';
import {thaoTac,coQuyen,chuyen} from '../assets/js/thu-vien-luat.js';
test('Lịch sử giới hạn dung lượng và loại bỏ vai trò lạ',()=>{
  assert.deepEqual(sachHoiThoai({}),[]);
  const x=sachHoiThoai([{id:'a',ten:'<script>x</script>',tin:[{role:'system',text:'x'},{role:'user',text:'a'.repeat(20000)}]}]);
  assert.equal(x[0].tin.length,1);assert.equal(x[0].tin[0].text.length,16000);
  assert.match(markdownHoiThoai(x[0].tin),/## Bạn/);
});
test('Quyền duyệt và xuất bản riêng, quản lý không tự duyệt',()=>{
  const d={id:'a',nguoiTao:'author',nguoiSoan:['author'],coSo:'Bình Phú',danhMuc:'Danh mục mới',duyet:'cho',hienThi:'chua',phienDuyet:0};
  const ai={mail:'reviewer',gv:true,loai:'video',p:{vaiTro:'gv',coSo:['Bình Phú'],cap:{'video|Danh mục mới|Bình Phú':{a:['VIEW','APPROVE']}}}};
  assert.ok(thaoTac(ai,d).some(x=>x.k==='duyet'));assert.equal(coQuyen(ai,'xuatban',d),false);
  assert.equal(thaoTac({...ai,admin:true,mail:'author'},d).some(x=>x.k==='duyet'),false);
  const approved={...d,duyet:'daduyet',phienDuyet:2,hienThi:'xuatban',xbPhien:1};
  const publisher={...ai,p:{...ai.p,cap:{'video|*|Bình Phú':{a:['PUBLISH']}}}};
  assert.equal(chuyen(publisher,approved,'xuatban').xbPhien,2);
});
