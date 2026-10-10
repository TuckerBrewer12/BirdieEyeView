import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RoundFlowChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundFlowChart", "round-flow-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundFlowChart", "round-flow-chart-dark.png");
  });
});
