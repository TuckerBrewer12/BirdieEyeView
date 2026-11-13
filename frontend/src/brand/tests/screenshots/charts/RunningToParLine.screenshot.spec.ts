import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RunningToParLine", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RunningToParLine", "running-to-par-line.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RunningToParLine", "running-to-par-line-dark.png");
  });
});
