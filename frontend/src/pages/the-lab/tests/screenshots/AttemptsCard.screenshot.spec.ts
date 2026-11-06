import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AttemptsCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AttemptsCard", "attempts-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AttemptsCard", "attempts-card-dark.png");
  });
});
