import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("ScorecardGrid", () => {
  // The board's width: the grid is wider than the stage.
  test.use({ viewport: { width: 960, height: 900 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardGrid");
    await kit.captureFrame("scorecard-grid.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardGrid");
    await kit.captureFrame("scorecard-grid-dark.png");
  });
});
