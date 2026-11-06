import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("SideNav", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SideNav", "side-nav.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SideNav", "side-nav-dark.png");
  });

  test("sign-out shows on the golfer's row", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("SideNav");
    await kit.hover("Jordan Castellanos-Whitfield");
    await kit.sees("[aria-label='Sign out']");
    await kit.capture("side-nav-account-hover.png");
  });
});
