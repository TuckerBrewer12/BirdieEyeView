import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("ScorecardGrid", () => {
  test.use({ viewport: { width: 960, height: 900 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardGrid");
    await kit.captureFrame("scorecard-grid.png");
    await kit.switchToDark();
    await kit.captureFrame("scorecard-grid-dark.png");
  });
});
