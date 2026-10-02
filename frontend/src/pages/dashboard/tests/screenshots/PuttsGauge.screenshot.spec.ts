import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PuttsGauge", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PuttsGauge", "putts-gauge.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PuttsGauge", "putts-gauge-dark.png");
  });
});
