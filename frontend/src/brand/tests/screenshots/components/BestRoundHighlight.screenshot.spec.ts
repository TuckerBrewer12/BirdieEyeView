import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("BestRoundHighlight", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "BestRoundHighlight", "best-round-highlight.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "BestRoundHighlight", "best-round-highlight-dark.png");
  });
});
