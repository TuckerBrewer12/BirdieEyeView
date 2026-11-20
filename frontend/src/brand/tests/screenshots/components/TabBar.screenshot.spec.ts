import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("TabBar", () => {
  test.use({ viewport: { width: 760, height: 190 } });

  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("TabBar");
    await kit.captureFrame("tab-bar.png");
    await kit.switchToDark();
    await kit.captureFrame("tab-bar-dark.png");
  });
});
