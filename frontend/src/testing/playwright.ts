import { test as base, expect } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

const collectCoverage = process.env.VITE_COVERAGE === "true";

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
