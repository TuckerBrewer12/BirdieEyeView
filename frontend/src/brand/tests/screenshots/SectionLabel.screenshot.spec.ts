import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("SectionLabel", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SectionLabel", "section-label.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SectionLabel", "section-label-dark.png");
  });
});
