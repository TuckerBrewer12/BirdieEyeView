import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("SampleRoundCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SampleRoundCard", "sample-round-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SampleRoundCard", "sample-round-card-dark.png");
  });
});
