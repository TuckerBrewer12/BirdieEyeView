import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("BottomNav", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "BottomNav", "bottom-nav.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "BottomNav", "bottom-nav-dark.png");
  });

  test("more menu", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("BottomNav");
    await kit.tap("More");
    await kit.sees("[data-slot=bottom-nav-menu]");
    await kit.capture("bottom-nav-menu.png");
  });

  test("more menu dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("BottomNav");
    await kit.tap("More");
    await kit.sees("[data-slot=bottom-nav-menu]");
    await kit.capture("bottom-nav-menu-dark.png");
  });
});
