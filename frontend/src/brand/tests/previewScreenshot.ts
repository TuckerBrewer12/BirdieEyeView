import { test, type Page } from "@playwright/test";
import { BrandKitRobot } from "./BrandKit.robot";

export async function capturePreview(page: Page, name: string, file: string) {
  const kit = new BrandKitRobot(page);
  await kit.open(name);
  await kit.capture(file);
}

/** Captures `<file>.png`, then turns the same page dark for `<file>-dark.png`: one load, both themes. */
export async function capturePreviewLightAndDark(page: Page, name: string, file: string) {
  const kit = new BrandKitRobot(page);
  await kit.open(name);
  await kit.capture(`${file}.png`);
  await kit.switchToDark();
  await kit.capture(`${file}-dark.png`);
}

export function previewScreenshots(name: string, file: string) {
  test.describe(name, () => {
    test("light and dark", async ({ page }) => {
      await capturePreviewLightAndDark(page, name, file);
    });
  });
}
