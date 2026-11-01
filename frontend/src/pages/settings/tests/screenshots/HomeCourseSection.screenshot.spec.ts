import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("HomeCourseSection", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HomeCourseSection", "home-course-section.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HomeCourseSection", "home-course-section-dark.png");
  });
});
