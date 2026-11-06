import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("RangeViewCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RangeViewCard", "range-view-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RangeViewCard", "range-view-card-dark.png");
  });
});
