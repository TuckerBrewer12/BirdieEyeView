import { defineConfig, devices, type ReporterDescription } from "@playwright/test";

const collectCoverage = process.env.VITE_COVERAGE === "true";

const sameRasterOnEveryRunner = { args: ["--disable-skia-runtime-opts", "--font-render-hinting=none"] };

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
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
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
      retries: process.env.CI ? 1 : 0,
      grepInvert: /@phone/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        launchOptions: sameRasterOnEveryRunner,
      },
    },
    {
      name: "mobile",
      testMatch: "**/*.screenshot.spec.ts",
      retries: process.env.CI ? 1 : 0,
      testIgnore: ["**/brand/**", "**/tests/screenshots/**"],
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        launchOptions: sameRasterOnEveryRunner,
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
