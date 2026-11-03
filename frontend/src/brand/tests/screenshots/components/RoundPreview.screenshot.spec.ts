import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RoundPreview", () => {
  // The two canvas boards, A (refined row) and B (scorecard strip), at the boards' size.
  test.describe("boards", () => {
    test.use({ viewport: { width: 560, height: 420 } });

    for (const [story, file] of [
      ["RoundPreview", "round-preview"],
      ["RoundPreviewStrip", "round-preview-strip"],
    ] as const) {
      test(`${story} light`, async ({ page }) => {
        const kit = new BrandKitRobot(page);
        await kit.openFrame(story);
        await kit.captureFrame(`${file}.png`);
      });

      test(`${story} dark`, async ({ page }) => {
        await enableDark(page);
        const kit = new BrandKitRobot(page);
        await kit.openFrame(story);
        await kit.captureFrame(`${file}-dark.png`);
      });
    }
  });

  test("other variants", async ({ page }) => {
    await capturePreview(page, "RoundPreviewVariants", "round-preview-variants.png");
  });

  test("other variants, dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundPreviewVariants", "round-preview-variants-dark.png");
  });
});
