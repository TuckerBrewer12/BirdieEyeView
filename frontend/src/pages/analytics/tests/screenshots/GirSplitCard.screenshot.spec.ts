import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("GirSplitCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "GirSplitCard", "gir-split-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "GirSplitCard", "gir-split-card-dark.png");
  });
});
