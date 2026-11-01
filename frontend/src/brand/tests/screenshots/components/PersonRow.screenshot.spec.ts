import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("PersonRow", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PersonRow", "person-row.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PersonRow", "person-row-dark.png");
  });
});
