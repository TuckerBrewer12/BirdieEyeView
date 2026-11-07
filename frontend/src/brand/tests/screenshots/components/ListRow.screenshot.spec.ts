import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ListRow", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ListRow", "list-row.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ListRow", "list-row-dark.png");
  });
});
