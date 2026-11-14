import { fileURLToPath } from "node:url";

const FIXED_BARS_IN_FLOW = fileURLToPath(new URL("./fullPageCapture.css", import.meta.url));

export function captureOptions(fullPage = true) {
  return fullPage ? { fullPage, stylePath: FIXED_BARS_IN_FLOW } : { fullPage };
}
