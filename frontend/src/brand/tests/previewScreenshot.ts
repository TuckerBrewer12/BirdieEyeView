import { test, type Page } from "@playwright/test";
import { BrandKitRobot } from "./BrandKit.robot";

export async function capturePreview(page: Page, name: string, file: string) {
  const kit = new BrandKitRobot(page);
  await kit.open(name);
  await kit.capture(file);
}

export async function enableDark(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
  });
}

export function previewScreenshots(name: string, file: string) {
  test.describe(name, () => {
    test("light", async ({ page }) => {
      await capturePreview(page, name, `${file}.png`);
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      await capturePreview(page, name, `${file}-dark.png`);
    });
  });
}
