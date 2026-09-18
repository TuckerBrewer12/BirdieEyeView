import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("RecentRoundsTable", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RecentRoundsTable", "recent-rounds-table.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RecentRoundsTable", "recent-rounds-table-dark.png");
  });
});
