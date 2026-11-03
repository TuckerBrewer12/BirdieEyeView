import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("CourseRow", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CourseRow", "course-row.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CourseRow", "course-row-dark.png");
  });
});
