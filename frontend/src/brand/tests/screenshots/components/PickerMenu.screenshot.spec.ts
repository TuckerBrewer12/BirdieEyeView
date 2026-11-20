import { expect, test } from "@playwright/test";
import { capturePreviewLightAndDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";
import { fontsLoaded } from "../../../../testing/fontsLoaded";

test.describe("PickerMenu", () => {
  test("light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "PickerMenu", "picker-menu");
  });

  test("menu, light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("PickerMenu");
    await page.getByRole("button", { name: "Sort by", exact: true }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await fontsLoaded(page);
    const options = page.locator("[data-slot=picker-options]");
    await expect(options).toHaveScreenshot("picker-menu-menu.png");
    await kit.switchToDark();
    await expect(options).toHaveScreenshot("picker-menu-menu-dark.png");
  });
});
