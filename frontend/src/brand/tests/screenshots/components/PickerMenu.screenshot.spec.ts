import { expect, test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("PickerMenu", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PickerMenu", "picker-menu.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PickerMenu", "picker-menu-dark.png");
  });

  test("menu", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("PickerMenu");
    await page.getByRole("button", { name: "Sort by", exact: true }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("[data-slot=picker-options]")).toHaveScreenshot(
      "picker-menu-menu.png",
    );
  });

  test("menu dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("PickerMenu");
    await page.getByRole("button", { name: "Sort by", exact: true }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("[data-slot=picker-options]")).toHaveScreenshot("picker-menu-menu-dark.png");
  });
});
