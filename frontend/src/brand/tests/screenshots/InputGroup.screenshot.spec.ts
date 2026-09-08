import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("InputGroup", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "InputGroup", "input-group.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "InputGroup", "input-group-dark.png");
  });
});
