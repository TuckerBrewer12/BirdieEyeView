import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

// The board shows both themes side by side, so one capture at the board's size covers them.
test.use({ viewport: { width: 760, height: 460 } });

test.describe("Button", () => {
  test("light and dark panels", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("Button");
    await kit.captureFrame("button.png");
  });
});
