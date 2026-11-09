import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("LastRoundCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "LastRoundCard", "last-round-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "LastRoundCard", "last-round-card-dark.png");
  });
});
