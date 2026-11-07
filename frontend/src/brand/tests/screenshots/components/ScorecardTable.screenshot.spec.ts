import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("ScorecardTable", () => {
  // The board's width: the table is wider than the stage.
  test.use({ viewport: { width: 960, height: 1500 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardTable");
    await kit.captureFrame("scorecard-table.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardTable");
    await kit.captureFrame("scorecard-table-dark.png");
  });
});
