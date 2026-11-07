import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("ChartTabs", () => {
  test("desktop grid", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("ChartTabs");
    await kit.capture("chart-tabs.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("ChartTabs");
    await kit.capture("chart-tabs-dark.png");
  });

  test.describe("phone", () => {
    // Below md: the tab bar over the open tab's charts.
    test.use({ viewport: { width: 390, height: 400 } });

    test("tabs", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.open("ChartTabs");
      await kit.capture("chart-tabs-phone.png");
    });
  });
});
