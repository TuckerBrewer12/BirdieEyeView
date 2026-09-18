import { expect, test } from "@playwright/test";
import { BrandKitRobot } from "../BrandKit.robot";
import { enableDark } from "../previewScreenshot";

test.describe("SVGScoreHandicapTrend", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.open("SVGScoreHandicapTrend");
    await expect(page.locator("[data-slot='score-handicap-trend'] svg path").first()).toBeVisible();
    await kit.capture("score-handicap-trend.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.open("SVGScoreHandicapTrend");
    await expect(page.locator("[data-slot='score-handicap-trend'] svg path").first()).toBeVisible();
    await kit.capture("score-handicap-trend-dark.png");
  });
});
