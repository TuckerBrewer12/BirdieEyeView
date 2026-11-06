import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("TotalsCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "TotalsCard", "totals-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "TotalsCard", "totals-card-dark.png");
  });
});
