import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreGoalChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreGoalChart", "score-goal-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreGoalChart", "score-goal-chart-dark.png");
  });
});
