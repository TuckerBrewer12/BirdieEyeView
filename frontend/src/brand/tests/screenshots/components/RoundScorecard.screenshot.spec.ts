import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("RoundScorecard", () => {
  test.use({ viewport: { width: 960, height: 1260 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("RoundScorecard");
    await kit.captureFrame("round-scorecard.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("RoundScorecard");
    await kit.captureFrame("round-scorecard-dark.png");
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 1260 }, hasTouch: true });

    test("stacks the nines", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundScorecard");
      await kit.captureFrame("round-scorecard-phone.png");
    });
  });
});
