import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ToParFigure", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ToParFigure", "to-par-figure.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ToParFigure", "to-par-figure-dark.png");
  });
});
