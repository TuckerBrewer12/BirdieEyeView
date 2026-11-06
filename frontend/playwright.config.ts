import { defineConfig, devices, type ReporterDescription } from "@playwright/test";

const collectCoverage = process.env.VITE_COVERAGE === "true";

const reporter: ReporterDescription[] = [process.env.CI ? ["github"] : ["list"]];
if (collectCoverage) {
  reporter.push([
    "monocart-reporter",
    {
      name: "Espresso coverage",
      outputFile: "coverage/espresso/index.html",
      coverage: {
        outputDir: "coverage/espresso",
        reports: [["json", { file: "coverage-final.json" }], ["html", { subdir: "html" }], "console-summary"],
      },
    },
  ]);
}

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter,
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixels: 100,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:5174",
    timezoneId: "UTC",
    locale: "en-US",
    colorScheme: "light",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      testMatch: "**/*.screenshot.spec.ts",
      // Tests tagged @phone capture what only the phone layout has: its tab bar, menus and tabs.
      grepInvert: /@phone/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile",
      testMatch: "**/*.screenshot.spec.ts",
      testIgnore: ["**/brand/**", "**/tests/screenshots/**"],
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
      },
    },
    {
      name: "demo-tour",
      testMatch: "**/*.capture.spec.ts",
      snapshotPathTemplate: "{testDir}/../public/demo-tour/{arg}{ext}",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "espresso",
      testMatch: "**/*.espresso.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
