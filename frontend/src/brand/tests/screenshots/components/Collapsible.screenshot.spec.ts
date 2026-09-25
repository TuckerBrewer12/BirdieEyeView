import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Collapsible", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Collapsible", "collapsible.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Collapsible", "collapsible-dark.png");
  });
});
