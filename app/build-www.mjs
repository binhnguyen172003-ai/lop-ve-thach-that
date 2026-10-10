// Gom file web (từ thư mục gốc kho) vào app/www để Capacitor đóng gói vào app.
// Chạy: npm run build:www  (trong thư mục app/)
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = dirname(fileURLToPath(import.meta.url));
const goc = resolve(app, "..");
const www = resolve(app, "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const muc of ["index.html", "404.html", "manifest.webmanifest", "sw.js", "assets", "data", "config"]) {
  if (existsSync(resolve(goc, muc))) cpSync(resolve(goc, muc), resolve(www, muc), { recursive: true });
}
console.log("Đã gom web vào", www);
