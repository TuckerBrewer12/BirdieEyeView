import { expect, test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

const chart = "[data-slot='score-handicap-trend'] svg path";

test.describe("SVGScoreHandicapTrend", () => {
  // The board's card at its own size: 640 by 470.
  test.describe("the dashboard card", () => {
    test.use({ viewport: { width: 640, height: 470 } });

    test("light", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("SVGScoreHandicapTrend");
      await expect(page.locator(chart).first()).toBeVisible();
      await kit.captureFrame("score-handicap-trend.png");
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      const kit = new BrandKitRobot(page);
      await kit.openFrame("SVGScoreHandicapTrend");
      await expect(page.locator(chart).first()).toBeVisible();
      await kit.captureFrame("score-handicap-trend-dark.png");
    });
  });

  test.describe("one panel and empty", () => {
    test("light", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.open("SVGScoreHandicapTrendVariants");
      await expect(page.locator(chart).first()).toBeVisible();
      await kit.capture("score-handicap-trend-variants.png");
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      const kit = new BrandKitRobot(page);
      await kit.open("SVGScoreHandicapTrendVariants");
      await expect(page.locator(chart).first()).toBeVisible();
      await kit.capture("score-handicap-trend-variants-dark.png");
    });
  });
});
