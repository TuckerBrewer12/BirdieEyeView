import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("SideNav", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SideNav", "side-nav.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SideNav", "side-nav-dark.png");
  });
});
