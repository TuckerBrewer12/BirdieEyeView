import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { fontsLoaded } from "./fontsLoaded";

const FIXED_BARS_IN_FLOW = fileURLToPath(new URL("./fullPageCapture.css", import.meta.url));

export function captureOptions(fullPage = true) {
  return fullPage ? { fullPage, stylePath: FIXED_BARS_IN_FLOW } : { fullPage };
}

export async function readyForCapture(page: Page, fullPage = true): Promise<void> {
  await fontsLoaded(page);
  if (fullPage) await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
}
