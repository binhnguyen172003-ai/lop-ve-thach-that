import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json" };
createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (path !== root && !path.startsWith(root + sep)) throw new Error("Outside root");
    const file = (await stat(path)).isDirectory() ? resolve(path, "index.html") : path;
    res.writeHead(200, { "Content-Type": (types[extname(file)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}).listen(Number(process.env.PORT || 4173), "127.0.0.1");
