import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GoalStandingCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GoalStandingCard", "goal-standing-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GoalStandingCard", "goal-standing-card-dark.png");
  });
});
