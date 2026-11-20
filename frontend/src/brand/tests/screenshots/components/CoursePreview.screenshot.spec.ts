import { test } from "@playwright/test";
import { capturePreview, capturePreviewLightAndDark } from "../../previewScreenshot";

test.describe("CoursePreview", () => {
  test("light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "CoursePreview", "course-preview");
  });

  test("focused", async ({ page }) => {
    await capturePreview(page, "CoursePreviewFocus", "course-preview-focused.png");
  });
});
