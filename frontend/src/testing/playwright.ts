import { test as base, expect } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

const collectCoverage = process.env.VITE_COVERAGE === "true";

/**
 * Espresso robots extend this `test`. When `VITE_COVERAGE=true`, Vite has
 * instrumented the app and each test hands `window.__coverage__` to
 * monocart-reporter, which merges one Istanbul report after the run.
 */
export const test = base.extend({
  page: async ({ page }, expose) => {
    await expose(page);
    if (!collectCoverage) return;
    const coverage = await page
      .evaluate(() => {
        const browserWindow = window as Window & { __coverage__?: Record<string, unknown> };
        return browserWindow.__coverage__;
      })
      .catch(() => undefined);
    if (coverage) await addCoverageReport(coverage, test.info());
  },
});

export { expect };
