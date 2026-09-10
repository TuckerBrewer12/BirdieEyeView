import { expect, test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";
import { onBrandKit } from "../BrandKit.robot";

test.describe("SortControl", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SortControl", "sort-control.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SortControl", "sort-control-dark.png");
  });

  test("menu", async ({ page }) => {
    await onBrandKit(page, async (kit) => {
      await kit.open("SortControl");
      await page.getByRole("combobox", { name: "Sort by" }).first().click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByRole("listbox")).toHaveScreenshot("sort-control-menu.png");
    });
  });

  test("menu dark", async ({ page }) => {
    await enableDark(page);
    await onBrandKit(page, async (kit) => {
      await kit.open("SortControl");
      await page.getByRole("combobox", { name: "Sort by" }).first().click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByRole("listbox")).toHaveScreenshot("sort-control-menu-dark.png");
    });
  });
});
