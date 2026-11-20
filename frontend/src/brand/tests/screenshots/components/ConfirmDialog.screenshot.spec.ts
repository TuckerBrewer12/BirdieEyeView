import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.use({ viewport: { width: 900, height: 840 } });

test.describe("ConfirmDialog", () => {
  test("light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("ConfirmDialog");
    await kit.captureFrame("confirm-dialog.png");
    await kit.switchToDark();
    await kit.captureFrame("confirm-dialog-dark.png");
  });
});
