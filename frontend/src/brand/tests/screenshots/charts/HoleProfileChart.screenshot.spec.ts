import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("HoleProfileChart", () => {
  // At the width of the course page's card.
  test.use({ viewport: { width: 820, height: 760 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HoleProfileChart");
    await kit.captureFrame("hole-profile-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("HoleProfileChart");
    await kit.captureFrame("hole-profile-chart-dark.png");
  });
});
