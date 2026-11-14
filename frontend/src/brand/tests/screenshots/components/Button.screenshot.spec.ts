import { expect, test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { fontsLoaded } from "../../../../testing/fontsLoaded";

const variants = ["default", "outline", "secondary", "ghost", "link", "linkMuted", "destructive"] as const;

test.use({ viewport: { width: 880, height: 720 } });

test.describe("Button", () => {
  test("light and dark panels", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Button");
    await kit.captureFrame("button.png");
  });

  for (const theme of ["light", "dark"] as const) {
    test(`hover, ${theme}`, async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("Button");
      for (const variant of variants) {
        const row = page.getByTestId(`button-row-${theme}-${variant}`);
        await row.getByRole("button").first().hover();
        await fontsLoaded(page);
        await expect(row).toHaveScreenshot(`button-hover-${theme}-${variant}.png`);
      }
    });
  }
});
