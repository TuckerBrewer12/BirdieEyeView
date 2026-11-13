import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Switch", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Switch", "switch.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Switch", "switch-dark.png");
  });
});
