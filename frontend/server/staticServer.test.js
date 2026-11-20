import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStaticServer, loadDist } from "./staticServer.js";

const ENTRY = "/assets/index-abc123.js";
const ENTRY_SOURCE = `export const holes = [${Array.from({ length: 200 }, (_, i) => i).join(", ")}];\n`;

async function writeDist(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dist-"));
  for (const [name, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await fs.writeFile(path.join(dir, name), body);
  }
  return dir;
}

function request(port, rawPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: rawPath, headers }, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

describe("loadDist", () => {
  it("asks for a build when dist is missing", async () => {
    const missing = path.join(os.tmpdir(), "no-such-dist");
    await expect(loadDist(missing)).rejects.toThrow("Run `npm run build` first.");
  });

  it("asks for a build when dist has no index.html", async () => {
    const dir = await writeDist({ [ENTRY]: ENTRY_SOURCE });
    await expect(loadDist(dir)).rejects.toThrow("Run `npm run build` first.");
  });
});

describe("createStaticServer", () => {
  let server;
  let port;

  beforeAll(async () => {
    const dir = await writeDist({
      "/index.html": "<!doctype html><div id=root></div>",
      [ENTRY]: ENTRY_SOURCE,
      "/dot.svg": "<svg/>",
    });
    server = createStaticServer(await loadDist(dir));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it.each([ENTRY, `/${ENTRY}`, `/.${ENTRY}`, ENTRY.replace("/assets/", "/assets//")])(
    "serves the asset for %s",
    async (rawPath) => {
      const res = await request(port, rawPath);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("javascript");
      expect(res.body.toString()).toBe(ENTRY_SOURCE);
    },
  );

  it("answers an unknown asset with 404, not index.html", async () => {
    const res = await request(port, "//assets/index-old.js");

    expect(res.status).toBe(404);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("varies on Accept-Encoding only when a compressed copy exists", async () => {
    const entry = await request(port, ENTRY, { "accept-encoding": "br" });
    const svg = await request(port, "/dot.svg", { "accept-encoding": "br" });

    expect(entry.headers["content-encoding"]).toBe("br");
    expect(entry.headers.vary).toBe("Accept-Encoding");
    expect(svg.headers["content-encoding"]).toBeUndefined();
    expect(svg.headers.vary).toBeUndefined();
  });
});
