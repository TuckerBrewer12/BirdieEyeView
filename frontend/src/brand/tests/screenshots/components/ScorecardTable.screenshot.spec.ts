import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("ScorecardTable", () => {
  test.use({ viewport: { width: 960, height: 1500 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScorecardTable");
    await kit.captureFrame("scorecard-table.png");
    await kit.switchToDark();
    await kit.captureFrame("scorecard-table-dark.png");
  });
});
