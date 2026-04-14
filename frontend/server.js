import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = "0.0.0.0";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mimeTypes[ext] || "application/octet-stream");
  });
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const pathname = decodeURIComponent(rawUrl.split("?")[0] || "/");

  if (pathname === "/health") {
    send(res, 200, "ok");
    return;
  }

  let requestPath = pathname;
  if (requestPath.endsWith("/")) requestPath += "index.html";
  const candidate = path.normalize(path.join(distDir, requestPath.replace(/^\/+/, "")));

  if (!candidate.startsWith(distDir)) {
    send(res, 400, "Bad Request");
    return;
  }

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(res, candidate);
      return;
    }

    // SPA fallback
    serveFile(res, path.join(distDir, "index.html"));
  });
});

server.listen(port, host, () => {
  // Keeping this concise helps debugging in Railway logs.
  console.log(`frontend server listening on http://${host}:${port}`);
});
