import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The tiles sit two by two on the board's 640 x 330 canvas, so the capture sets that viewport.
test.use({ viewport: { width: 640, height: 330 } });

test.describe("Stat", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Stat");
    await kit.captureFrame("stat.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Stat");
    await kit.captureFrame("stat-dark.png");
  });
});
