import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GreetingHeader", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GreetingHeader", "greeting-header.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GreetingHeader", "greeting-header-dark.png");
  });
});
