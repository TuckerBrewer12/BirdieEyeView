import { expect, test } from "@playwright/test";
import { capturePreviewLightAndDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("SideNav", () => {
  test("light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "SideNav", "side-nav");
  });

  test("sign-out shows on the golfer's row", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("SideNav");
    await kit.hover("Test Golfer");
    await expect(page.getByLabel("Sign out")).toHaveCSS("opacity", "1");
    await kit.capture("side-nav-account-hover.png");
  });
});
