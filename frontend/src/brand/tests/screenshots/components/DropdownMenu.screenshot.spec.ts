import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("DropdownMenu", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "DropdownMenu", "dropdown-menu.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "DropdownMenu", "dropdown-menu-dark.png");
  });
});
