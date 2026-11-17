import { expect, test } from "@playwright/test";
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

  test("keeps a tee read off the card, ratings and all, inside its column", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("RoundScorecard");
    const label = page.locator('[data-slot="tee-label"][title="White M: 69.1/123 W: 74.8 / 133"]');
    await expect(label).toHaveText("WhiteM 69.1 / 123W 74.8 / 133");

    const cell = await page.getByRole("rowheader").filter({ has: label }).boundingBox();
    const parts = await label.locator("span").evaluateAll((spans) =>
      spans.map((span) => ({ right: span.getBoundingClientRect().right, cut: span.scrollWidth > span.clientWidth })),
    );
    expect(cell).not.toBeNull();
    for (const part of parts) {
      // Not drawn over hole 1, and not cut off to fit: the name and both ratings read whole.
      expect(part.right).toBeLessThanOrEqual(cell!.x + cell!.width);
      expect(part.cut).toBe(false);
    }
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 1260 }, hasTouch: true });

    test("stacks the nines", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundScorecard");
      await kit.captureFrame("round-scorecard-phone.png");
    });

    test("fits the tee's name in the narrower column, leaving its ratings off", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundScorecard");
      const label = page.locator('[data-slot="tee-label"][title="White M: 69.1/123 W: 74.8 / 133"]').first();
      await expect(label.getByText("M 69.1 / 123")).toBeHidden();
      const name = label.getByText("White", { exact: true });
      expect(await name.evaluate((span) => span.scrollWidth > span.clientWidth)).toBe(false);
    });
  });
});
