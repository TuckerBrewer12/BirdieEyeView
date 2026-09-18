import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Reveal", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Reveal", "reveal.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Reveal", "reveal-dark.png");
  });
});
