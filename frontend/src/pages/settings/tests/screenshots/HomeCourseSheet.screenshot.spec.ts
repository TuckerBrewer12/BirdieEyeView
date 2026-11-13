import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("HomeCourseSheet", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HomeCourseSheet", "home-course-sheet.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HomeCourseSheet", "home-course-sheet-dark.png");
  });
});
