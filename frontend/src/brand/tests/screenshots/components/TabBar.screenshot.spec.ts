import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("TabBar", () => {
  test.use({ viewport: { width: 760, height: 190 } });

  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("TabBar");
    await kit.captureFrame("tab-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("TabBar");
    await kit.captureFrame("tab-bar-dark.png");
  });
});
