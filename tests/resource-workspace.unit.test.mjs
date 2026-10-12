import test from "node:test";
import assert from "node:assert/strict";
import { resourceRows, safeResourceLink, youtubeId, resourceImage, ADVANCED_SEEDS } from "../assets/js/resource-workspace.js";

test("bài sửa ghi đè bản gốc; bài ẩn vẫn có thể được quản lý hiện lại", () => {
  const seeds = [{ id: "a", phan: "nang-cao", ten: "Cũ", thutu: 1 }, { id: "b", phan: "nang-cao", ten: "Bài hai", thutu: 2 }];
  const rows = [{ id: "a", phan: "nang-cao", ten: "Tên đã sửa", thutu: 3 }, { id: "b", phan: "nang-cao", an: true }, { id: "c", phan: "ebook", thutu: 0 }];
  assert.deepEqual(resourceRows(rows, seeds, "nang-cao").map(r => [r.id, r.ten, !!r.an]), [["b", "Bài hai", true], ["a", "Tên đã sửa", false]]);
  assert.deepEqual(resourceRows(rows, [], "ebook").map(r => r.id), ["c"]);
});

test("chỉ mở link HTTPS không chứa thông tin đăng nhập", () => {
  for (const link of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:pass@example.com", "không phải link"]) assert.equal(safeResourceLink(link), "");
  assert.equal(safeResourceLink("https://example.com/book.pdf"), "https://example.com/book.pdf");
});

test("ảnh lấy đúng video YouTube và từ chối tên miền giả", () => {
  for (const link of ["https://youtu.be/vZdFuUTUeJw?t=10", "https://www.youtube.com/watch?v=vZdFuUTUeJw", "https://www.youtube.com/shorts/vZdFuUTUeJw"]) assert.equal(youtubeId(link), "vZdFuUTUeJw");
  assert.equal(youtubeId("https://youtube.com.evil.example/watch?v=vZdFuUTUeJw"), "");
  assert.equal(resourceImage({ link: "https://youtu.be/vZdFuUTUeJw" }), "https://i.ytimg.com/vi/vZdFuUTUeJw/hqdefault.jpg");
  assert.equal(resourceImage({ anh: "javascript:alert(1)" }), "");
});

test("giữ đủ 17 video với mã bài ổn định", () => {
  assert.equal(ADVANCED_SEEDS.length, 17);
  assert.equal(new Set(ADVANCED_SEEDS.map(r => r.id)).size, 17);
  assert.equal(ADVANCED_SEEDS[0].ten, "Kỹ thuật nét, sắc độ, khối và quy luật sáng tối");
});

import { resourceLessons } from "../assets/js/resource-workspace.js";
test("khóa mới không bị tính là bài học và không lẫn bài giữa các khóa", () => {
 const rows = [{id:"k",loai:"khoa",khoa:"Màu"},{id:"a",loai:"video",khoa:"Màu"},{id:"b",loai:"video",khoa:"Chân dung"},{id:"c",loai:"video",khoa:"Màu",an:true}];
 assert.deepEqual(resourceLessons(rows,"Màu").map(x=>x.id),["a"]);
 assert.deepEqual(resourceLessons([rows[0]],"Màu"),[]);
});
