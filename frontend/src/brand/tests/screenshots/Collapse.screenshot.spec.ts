import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Collapse", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Collapse", "collapse.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Collapse", "collapse-dark.png");
  });
});
