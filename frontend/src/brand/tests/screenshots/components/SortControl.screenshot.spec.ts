import { expect, test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("SortControl", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SortControl", "sort-control.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SortControl", "sort-control-dark.png");
  });

  test("menu", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("SortControl");
    await page.getByRole("button", { name: "Sort by", exact: true }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("[data-slot=sort-menu]")).toHaveScreenshot(
      "sort-control-menu.png",
    );
  });

  test("menu dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("SortControl");
    await page.getByRole("button", { name: "Sort by", exact: true }).first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("[data-slot=sort-menu]")).toHaveScreenshot("sort-control-menu-dark.png");
  });
});
