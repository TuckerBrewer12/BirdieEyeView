import { expect, test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("ComparisonChartCard", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("ComparisonChartCard");
    await expect(page.locator(".recharts-bar-rectangle path").first()).toBeVisible();
    await kit.capture("comparison-chart-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("ComparisonChartCard");
    await expect(page.locator(".recharts-bar-rectangle path").first()).toBeVisible();
    await kit.capture("comparison-chart-card-dark.png");
  });
});
