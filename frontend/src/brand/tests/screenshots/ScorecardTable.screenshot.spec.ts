import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("ScorecardTable", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScorecardTable", "scorecard-table.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScorecardTable", "scorecard-table-dark.png");
  });
});
