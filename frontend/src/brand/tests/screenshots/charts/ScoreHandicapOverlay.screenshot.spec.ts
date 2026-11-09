import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// Drawn at the dashboard's width, the size the scores card is made for.
test.describe("ScoreHandicapOverlay", () => {
  test.use({ viewport: { width: 1040, height: 640 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScoreHandicapOverlay");
    await kit.captureFrame("score-handicap-overlay.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScoreHandicapOverlay");
    await kit.captureFrame("score-handicap-overlay-dark.png");
  });
});
