import { existsSync, readFileSync } from "node:fs";

import { firstLoadAssets } from "./scripts/first-load-assets.mjs";

if (!existsSync("dist/index.html")) {
  throw new Error("No dist/index.html: run `npm run build` before `npm run size`.");
}
const firstLoad = firstLoadAssets(readFileSync("dist/index.html", "utf8"));
if (firstLoad.js.length === 0 || firstLoad.css.length === 0) {
  throw new Error("dist/index.html names no module script or stylesheet; has the build changed shape?");
}

export default [
  { name: "First load JS", path: firstLoad.js, gzip: true, limit: "335 kB" },
  { name: "First load CSS", path: firstLoad.css, gzip: true, limit: "20 kB" },
  { name: "All JS", path: "dist/assets/*.js", gzip: true, limit: "340 kB" },
];
