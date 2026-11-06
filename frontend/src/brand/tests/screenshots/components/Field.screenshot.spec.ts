import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board is two columns wide, so the story fills a window of the board's size (768 wide, the first width the 15px field text applies at).
test.use({ viewport: { width: 768, height: 470 } });

test.describe("Field", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Field");
    await kit.focus("Name on scorecard");
    await kit.captureFrame("field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Field");
    await kit.focus("Name on scorecard");
    await kit.captureFrame("field-dark.png");
  });
});
