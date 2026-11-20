import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("HoleGreensPuttsChart", () => {
  test.use({ viewport: { width: 820, height: 760 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HoleGreensPuttsChart");
    await kit.captureFrame("hole-greens-putts-chart.png");
    await kit.switchToDark();
    await kit.captureFrame("hole-greens-putts-chart-dark.png");
  });
});
