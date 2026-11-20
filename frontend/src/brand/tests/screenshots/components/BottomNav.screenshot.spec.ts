import { test } from "@playwright/test";
import { capturePreviewLightAndDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("BottomNav", () => {
  test("light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "BottomNav", "bottom-nav");
  });

  test("more menu, light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("BottomNav");
    await kit.tap("More");
    await kit.sees("[data-slot=bottom-nav-menu]");
    await kit.capture("bottom-nav-menu.png");
    await kit.switchToDark();
    await kit.capture("bottom-nav-menu-dark.png");
  });
});
