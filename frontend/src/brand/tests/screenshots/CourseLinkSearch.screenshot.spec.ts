import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("CourseLinkSearch", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CourseLinkSearch", "course-link-search.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CourseLinkSearch", "course-link-search-dark.png");
  });
});
