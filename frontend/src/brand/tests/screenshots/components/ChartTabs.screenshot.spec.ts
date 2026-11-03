import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("ChartTabs", () => {
  // The tab bar is shown at the width of its board: wide enough for every tab, with a narrow
  // box under it for the phone's scrolling row.
  test.use({ viewport: { width: 760, height: 190 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ChartTabs");
    await kit.captureFrame("chart-tabs.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ChartTabs");
    await kit.captureFrame("chart-tabs-dark.png");
  });
});
