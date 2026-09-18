import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../../brand/tests/previewScreenshot";

test.describe("RoundDetailHeader", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundDetailHeader", "round-detail-header.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundDetailHeader", "round-detail-header-dark.png");
  });
});
