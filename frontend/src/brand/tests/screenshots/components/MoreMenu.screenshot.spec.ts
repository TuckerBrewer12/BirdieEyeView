import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("MoreMenu", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "MoreMenu", "more-menu.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "MoreMenu", "more-menu-dark.png");
  });
});
