import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GoalCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GoalCard", "goal-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GoalCard", "goal-card-dark.png");
  });
});
