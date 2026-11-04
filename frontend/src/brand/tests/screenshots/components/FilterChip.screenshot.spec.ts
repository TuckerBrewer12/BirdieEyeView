import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

// The board's width.
test.use({ viewport: { width: 760, height: 200 } });

test.describe("FilterChip", () => {
  test("light", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("FilterChip");
    await kit.captureFrame("filter-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("FilterChip");
    await kit.captureFrame("filter-chip-dark.png");
  });
});
