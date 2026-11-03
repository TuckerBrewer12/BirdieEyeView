import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board's width, so the two fields sit side by side.
test.use({ viewport: { width: 760, height: 120 } });

test.describe("SearchField", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("SearchField");
    await kit.captureFrame("search-field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("SearchField");
    await kit.captureFrame("search-field-dark.png");
  });
});
