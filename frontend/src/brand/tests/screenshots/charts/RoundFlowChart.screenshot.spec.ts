import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RoundFlowChart", () => {
  test.describe("wide", () => {
    test.use({ viewport: { width: 820, height: 420 } });

    test("light", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundFlowChart");
      await kit.captureFrame("round-flow-chart.png");
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundFlowChart");
      await kit.captureFrame("round-flow-chart-dark.png");
    });
  });

  test("scrolled, light", async ({ page }) => {
    await capturePreview(page, "RoundFlowChartScrolled", "round-flow-chart-scrolled.png");
  });

  test("scrolled, dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundFlowChartScrolled", "round-flow-chart-scrolled-dark.png");
  });
});
