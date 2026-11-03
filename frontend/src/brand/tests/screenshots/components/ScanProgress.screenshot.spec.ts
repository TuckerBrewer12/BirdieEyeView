import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board's width and height: the three states side by side.
test.use({ viewport: { width: 1000, height: 360 } });

test.describe("ScanProgress", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScanProgress");
    await kit.captureFrame("scan-progress.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ScanProgress");
    await kit.captureFrame("scan-progress-dark.png");
  });
});
