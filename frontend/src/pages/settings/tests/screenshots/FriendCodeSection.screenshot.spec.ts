import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("FriendCodeSection", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "FriendCodeSection", "friend-code-section.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "FriendCodeSection", "friend-code-section-dark.png");
  });
});
