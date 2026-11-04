import { expect, test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

const variants = ["default", "outline", "secondary", "ghost", "link", "linkMuted", "destructive"] as const;

// The board shows both themes side by side, so one capture covers them.
test.use({ viewport: { width: 880, height: 720 } });

test.describe("Button", () => {
  test("light and dark panels", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Button");
    await kit.captureFrame("button.png");
  });

  // Hover is a pointer state: point at each variant's button and capture its row.
  for (const theme of ["light", "dark"] as const) {
    test(`hover, ${theme}`, async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("Button");
      for (const variant of variants) {
        const row = page.getByTestId(`button-row-${theme}-${variant}`);
        await row.getByRole("button").first().hover();
        await expect(row).toHaveScreenshot(`button-hover-${theme}-${variant}.png`);
      }
    });
  }
});
