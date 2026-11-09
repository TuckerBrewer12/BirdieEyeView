import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("DashboardCards", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "DashboardCards", "dashboard-cards.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "DashboardCards", "dashboard-cards-dark.png");
  });
});
