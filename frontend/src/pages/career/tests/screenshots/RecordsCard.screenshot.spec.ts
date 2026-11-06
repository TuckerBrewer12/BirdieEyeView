import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("RecordsCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RecordsCard", "records-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RecordsCard", "records-card-dark.png");
  });
});
