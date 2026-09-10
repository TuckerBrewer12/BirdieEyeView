import { type Page } from "@playwright/test";
import { BrandKitRobot } from "./BrandKit.robot";

export async function capturePreview(page: Page, name: string, file: string) {
  const kit = new BrandKitRobot(page);
  await kit.open(name);
  await kit.capture(file);
}

export async function enableDark(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("settings_theme", "dark");
    localStorage.setItem("public_theme", "dark");
  });
}
