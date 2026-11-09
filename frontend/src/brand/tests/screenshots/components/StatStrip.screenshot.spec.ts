import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// Drawn at the dashboard's width, the size the strip is made for.
test.describe("StatStrip", () => {
  test.use({ viewport: { width: 1040, height: 360 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("StatStrip");
    await kit.captureFrame("stat-strip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("StatStrip");
    await kit.captureFrame("stat-strip-dark.png");
  });
});
