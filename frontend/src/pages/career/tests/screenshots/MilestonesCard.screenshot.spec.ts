import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("MilestonesCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "MilestonesCard", "milestones-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "MilestonesCard", "milestones-card-dark.png");
  });
});
