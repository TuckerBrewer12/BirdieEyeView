import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticServer, loadDist } from "./server/staticServer.js";

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = "0.0.0.0";

const files = await loadDist(distDir);
createStaticServer(files).listen(port, host, () => {
  console.log(`frontend server listening on http://${host}:${port} (${files.size} files from dist)`);
});
