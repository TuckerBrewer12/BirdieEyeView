import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

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

const compressible = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt"]);

const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "no-cache";

const baseSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function send(
  res,
  status,
  body,
  contentType = "text/plain; charset=utf-8",
  extraHeaders = {},
) {
  res.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": contentType,
    ...extraHeaders,
  });
  res.end(body);
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

async function loadFile(filePath) {
  const body = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const hash = crypto.createHash("sha1").update(body).digest("base64url").slice(0, 16);
  const file = {
    contentType: mimeTypes[ext] || "application/octet-stream",
    variants: { identity: { body, etag: `"${hash}"` } },
  };
  if (compressible.has(ext)) {
    const [br, gz] = await Promise.all([
      brotli(body, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      }),
      gzip(body, { level: zlib.constants.Z_BEST_COMPRESSION }),
    ]);
    if (br.length < body.length) file.variants.br = { body: br, etag: `"${hash}-br"` };
    if (gz.length < body.length) file.variants.gzip = { body: gz, etag: `"${hash}-gz"` };
  }
  return file;
}

function missingBuild(distDir) {
  return new Error(`No build in ${distDir}. Run \`npm run build\` first.`);
}

async function listDist(distDir) {
  try {
    return await listFiles(distDir);
  } catch (error) {
    if (error.code === "ENOENT") throw missingBuild(distDir);
    throw error;
  }
}

export async function loadDist(distDir) {
  const files = new Map();
  const paths = await listDist(distDir);
  await Promise.all(
    paths.map(async (filePath) => {
      const urlPath = "/" + path.relative(distDir, filePath).split(path.sep).join("/");
      files.set(urlPath, await loadFile(filePath));
    }),
  );
  if (!files.has("/index.html")) throw missingBuild(distDir);
  return files;
}

function acceptedEncodings(header) {
  const accepted = new Set();
  for (const part of (header || "").split(",")) {
    const [name, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    if (name && !(q && Number.parseFloat(q.slice(2)) === 0)) accepted.add(name);
  }
  return accepted;
}

function pickVariant(file, acceptEncoding) {
  const accepted = acceptedEncodings(acceptEncoding);
  if (file.variants.br && accepted.has("br")) return ["br", file.variants.br];
  if (file.variants.gzip && accepted.has("gzip")) return ["gzip", file.variants.gzip];
  return ["identity", file.variants.identity];
}

function etagMatches(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .some((tag) => tag === "*" || tag === etag);
}

function serveFile(req, res, file, cacheControl) {
  const [encoding, variant] = pickVariant(file, req.headers["accept-encoding"]);
  const headers = {
    "Cache-Control": cacheControl,
    ETag: variant.etag,
  };
  if (Object.keys(file.variants).length > 1) headers.Vary = "Accept-Encoding";
  if (encoding !== "identity") headers["Content-Encoding"] = encoding;

  if (etagMatches(req.headers["if-none-match"], variant.etag)) {
    res.writeHead(304, { ...baseSecurityHeaders, ...headers });
    res.end();
    return;
  }
  headers["Content-Length"] = variant.body.length;
  send(res, 200, variant.body, file.contentType, headers);
}

export function createStaticServer(files) {
  const indexHtml = files.get("/index.html");
  return http.createServer((req, res) => {
    const rawUrl = req.url || "/";
    let pathname = "/";
    try {
      pathname = path.posix.normalize(decodeURIComponent(rawUrl.split("?")[0] || "/"));
    } catch {
      send(res, 400, "Bad Request");
      return;
    }

    if (pathname === "/health") {
      send(res, 200, "ok", "text/plain; charset=utf-8", { "Cache-Control": "no-store" });
      return;
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      send(
        res,
        502,
        JSON.stringify({
          detail: "Frontend service cannot serve API routes. Set VITE_API_BASE_URL to your backend URL (including https://).",
        }),
        "application/json; charset=utf-8",
        { "Cache-Control": "no-store" },
      );
      return;
    }

    let requestPath = pathname;
    if (requestPath.endsWith("/")) requestPath += "index.html";

    const file = files.get(requestPath);
    if (file) {
      const cacheControl = requestPath.startsWith("/assets/") ? IMMUTABLE : REVALIDATE;
      serveFile(req, res, file, cacheControl);
      return;
    }

    if (requestPath.startsWith("/assets/")) {
      send(res, 404, "Not Found", "text/plain; charset=utf-8", { "Cache-Control": "no-store" });
      return;
    }

    serveFile(req, res, indexHtml, REVALIDATE);
  });
}
