import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
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
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile",
      testMatch: "**/*.screenshot.spec.ts",
      // Isolated previews — the kit's and each page's — are captured once, at
      // desktop. Only whole-page specs are worth a second viewport.
      testIgnore: ["**/brand/**", "**/tests/screenshots/**"],
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
      },
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
