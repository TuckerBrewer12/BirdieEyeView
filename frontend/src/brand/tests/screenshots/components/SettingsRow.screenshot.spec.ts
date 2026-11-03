import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board is 760 by 470, wider than the 390 stage, so it is captured in the window frame.
test.use({ viewport: { width: 760, height: 470 } });

test.describe("SettingsRow", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("SettingsRow");
    await kit.captureFrame("settings-row.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("SettingsRow");
    await kit.captureFrame("settings-row-dark.png");
  });
});
