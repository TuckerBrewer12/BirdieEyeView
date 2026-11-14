import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board is 900 x 840: the two layouts side by side, two rows of them.
test.use({ viewport: { width: 900, height: 840 } });

test.describe("ConfirmDialog", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ConfirmDialog");
    await kit.captureFrame("confirm-dialog.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ConfirmDialog");
    await kit.captureFrame("confirm-dialog-dark.png");
  });
});
