import { test } from "@playwright/test";
import { capturePreviewLightAndDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("RoundFlowChart", () => {
  test.describe("wide", () => {
    test.use({ viewport: { width: 820, height: 420 } });

    test("light and dark", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("RoundFlowChart");
      await kit.captureFrame("round-flow-chart.png");
      await kit.switchToDark();
      await kit.captureFrame("round-flow-chart-dark.png");
    });
  });

  test("scrolled, light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "RoundFlowChartScrolled", "round-flow-chart-scrolled");
  });
});
