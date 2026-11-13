import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("CheckChip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CheckChip", "check-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CheckChip", "check-chip-dark.png");
  });
});
