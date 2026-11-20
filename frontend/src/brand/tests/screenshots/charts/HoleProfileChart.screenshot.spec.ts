import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("HoleProfileChart", () => {
  test.use({ viewport: { width: 820, height: 760 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HoleProfileChart");
    await kit.captureFrame("hole-profile-chart.png");
    await kit.switchToDark();
    await kit.captureFrame("hole-profile-chart-dark.png");
  });
});
