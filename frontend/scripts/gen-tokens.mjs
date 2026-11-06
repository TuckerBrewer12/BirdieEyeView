// Writes src/brand/theme/tokens.gen.css from tokens.ts. With --check, writes
// nothing and fails if the file on disk is stale. Vite's module runner loads
// the TypeScript, so this needs nothing the build doesn't already have.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const source = fileURLToPath(new URL("../src/brand/theme/tokensCss.ts", import.meta.url));
const target = fileURLToPath(new URL("../src/brand/theme/tokens.gen.css", import.meta.url));

const { module } = await runnerImport(source, { configFile: false, logLevel: "error" });
const css = module.renderTokensCss();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    // Missing counts as stale.
  }
  if (current !== css) {
    console.error("src/brand/theme/tokens.gen.css is out of date with tokens.ts. Run `npm run gen:tokens`.");
    process.exit(1);
  }
  console.log("tokens.gen.css is current.");
} else {
  writeFileSync(target, css);
  console.log("Wrote src/brand/theme/tokens.gen.css.");
}
