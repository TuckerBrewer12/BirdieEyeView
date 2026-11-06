import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ParTypeCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ParTypeCard", "par-type-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ParTypeCard", "par-type-card-dark.png");
  });
});
