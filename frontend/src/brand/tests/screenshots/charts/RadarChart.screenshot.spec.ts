import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RadarChart", () => {
  // The Player profile card at the board's size, the window standing in for the page.
  test.describe("player profile", () => {
    test.use({ viewport: { width: 640, height: 440 } });

    test("light", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RadarChart");
      await kit.captureFrame("radar-chart.png");
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RadarChart");
      await kit.captureFrame("radar-chart-dark.png");
    });
  });

  test("states", async ({ page }) => {
    await capturePreview(page, "RadarChartStates", "radar-chart-states.png");
  });

  test("states, dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RadarChartStates", "radar-chart-states-dark.png");
  });
});
