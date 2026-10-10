import { test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { soSanhTenHocVien } from "../assets/js/ten-hoc-vien.js";

test("sắp xếp theo tên gọi, rồi tên đệm và họ", () => {
  const rows = [
    { id: "3", ten: "Bùi Hà Linh" },
    { id: "1", ten: "Nguyễn Văn An" },
    { id: "2", ten: "Trần Thị Bình" },
    { id: "4", ten: "Lê An" },
    { id: "5", ten: "  Phạm   Văn  An  " }
  ];
  deepStrictEqual(rows.sort(soSanhTenHocVien).map(x => x.id), ["4", "1", "5", "2", "3"]);
});

test("tên trùng hoàn toàn dùng mã học viên để giữ thứ tự ổn định", () => {
  deepStrictEqual([{ id: "b", ten: "An" }, { id: "a", ten: "An" }].sort(soSanhTenHocVien).map(x => x.id), ["a", "b"]);
});
