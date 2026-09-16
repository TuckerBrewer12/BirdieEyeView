import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("CoursePreview", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CoursePreview", "course-preview.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CoursePreview", "course-preview-dark.png");
  });

  test("focused", async ({ page }) => {
    await capturePreview(page, "CoursePreviewFocus", "course-preview-focused.png");
  });
});
