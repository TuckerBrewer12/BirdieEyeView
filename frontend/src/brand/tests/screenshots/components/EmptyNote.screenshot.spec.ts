import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("EmptyNote", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "EmptyNote", "empty-note.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "EmptyNote", "empty-note-dark.png");
  });
});
