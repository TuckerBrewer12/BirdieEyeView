import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PlayerProfileCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PlayerProfileCard", "player-profile-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PlayerProfileCard", "player-profile-card-dark.png");
  });
});
