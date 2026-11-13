import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ToParPill", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ToParPill", "to-par-pill.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ToParPill", "to-par-pill-dark.png");
  });
});
