import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// Board B is 640 x 470, wider than the stage, so the preview fills the window at that size.
test.use({ viewport: { width: 640, height: 470 } });

test.describe("HandicapIndexPanel", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HandicapIndexPanel");
    await kit.captureFrame("handicap-index-panel.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HandicapIndexPanel");
    await kit.captureFrame("handicap-index-panel-dark.png");
  });
});
