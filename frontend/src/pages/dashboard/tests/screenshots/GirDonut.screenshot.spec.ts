import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GirDonut", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GirDonut", "gir-donut.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GirDonut", "gir-donut-dark.png");
  });
});
