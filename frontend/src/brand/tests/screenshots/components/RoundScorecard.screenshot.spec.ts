import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("RoundScorecard", () => {
  test.use({ viewport: { width: 960, height: 1260 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("RoundScorecard");
    await kit.captureFrame("round-scorecard.png");
    await kit.switchToDark();
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
