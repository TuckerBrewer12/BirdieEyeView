// Usage: node scripts/perf/tls_proxy.mjs LISTEN_PORT STATIC_PORT API_PORT CERT_DIR
// Chrome only asks for brotli over HTTPS, so the benchmark talks to server.js through this.
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const [listenPort, staticPort, apiPort] = process.argv.slice(2, 5).map(Number);
const certDir = process.argv[5];
const agent = new http.Agent({ keepAlive: true });

const tls = {
  key: fs.readFileSync(path.join(certDir, "key.pem")),
  cert: fs.readFileSync(path.join(certDir, "cert.pem")),
};

https
  .createServer(tls, (req, res) => {
    const port = req.url.startsWith("/api") ? apiPort : staticPort;
    const upstream = http.request(
      { host: "127.0.0.1", port, path: req.url, method: req.method, headers: req.headers, agent },
      (reply) => {
        res.writeHead(reply.statusCode, reply.headers);
        reply.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(listenPort, "127.0.0.1");
