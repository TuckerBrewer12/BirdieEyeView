import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board is two columns wide, so the story fills a window of the board's size.
test.use({ viewport: { width: 760, height: 470 } });

test.describe("Field", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Field");
    await kit.captureFrame("field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Field");
    await kit.captureFrame("field-dark.png");
  });
});
