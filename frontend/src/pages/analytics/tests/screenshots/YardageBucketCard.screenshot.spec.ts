import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("YardageBucketCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "YardageBucketCard", "yardage-bucket-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "YardageBucketCard", "yardage-bucket-card-dark.png");
  });
});
