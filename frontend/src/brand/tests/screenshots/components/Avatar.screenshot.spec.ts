import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Avatar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Avatar", "avatar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Avatar", "avatar-dark.png");
  });
});
