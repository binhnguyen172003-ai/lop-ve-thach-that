import { test } from "node:test";
import { strictEqual } from "node:assert";
import { GO_KHOI_CA, thuocDanhSachCa } from "../assets/js/danh-sach-ca.js";

const hocVien = { id: "hv-1", ten: "Nguyễn Văn An", coso: "Bình Phú" };
const key = "2026-10-10_sang";

test("học viên mặc định ở cơ sở gốc và không bị trùng ở cơ sở khác", () => {
  strictEqual(thuocDanhSachCa(hocVien, {}, "Bình Phú", key), true);
  strictEqual(thuocDanhSachCa(hocVien, {}, "Kim Quan", key), false);
  strictEqual(thuocDanhSachCa(hocVien, { ["cs:" + key]: "Kim Quan" }, "Bình Phú", key), false);
  strictEqual(thuocDanhSachCa(hocVien, { ["cs:" + key]: "Kim Quan" }, "Kim Quan", key), true);
});

test("thêm vào ca khác và gỡ khỏi ca không đổi dữ liệu hồ sơ hay điểm danh", () => {
  const diemDanh = { [key]: "co", ["cs:" + key]: "Bình Phú" };
  const them = { ...diemDanh, ["ds:" + key]: "Kim Quan" };
  const go = { ...them, ["ds:" + key]: GO_KHOI_CA };
  strictEqual(thuocDanhSachCa(hocVien, them, "Kim Quan", key), true);
  strictEqual(thuocDanhSachCa(hocVien, them, "Bình Phú", key), false);
  strictEqual(thuocDanhSachCa(hocVien, go, "", key), false);
  strictEqual(go[key], "co");
  strictEqual(go["cs:" + key], "Bình Phú");
  strictEqual(hocVien.ten, "Nguyễn Văn An");
});
