import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ActivityCalendar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ActivityCalendar", "activity-calendar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ActivityCalendar", "activity-calendar-dark.png");
  });
});
