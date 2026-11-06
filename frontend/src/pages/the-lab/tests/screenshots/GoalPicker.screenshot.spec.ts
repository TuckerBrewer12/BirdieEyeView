import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GoalPicker", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GoalPicker", "goal-picker.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GoalPicker", "goal-picker-dark.png");
  });
});
