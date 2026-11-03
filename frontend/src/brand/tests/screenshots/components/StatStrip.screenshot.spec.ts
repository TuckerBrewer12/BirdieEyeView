import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// Board B is 760 x 200, wider than the stage, so the preview fills the window at that size.
test.use({ viewport: { width: 760, height: 200 } });

test.describe("StatStrip", () => {
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
