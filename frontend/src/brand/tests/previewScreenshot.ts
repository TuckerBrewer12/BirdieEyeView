import { type Page } from "@playwright/test";
import { onBrandKit } from "./BrandKit.robot";

export async function capturePreview(page: Page, name: string, file: string) {
  await onBrandKit(page, async (kit) => {
    await kit.open(name);
    await kit.capture(file);
  });
}

export async function enableDark(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("settings_theme", "dark");
    localStorage.setItem("public_theme", "dark");
  });
}
