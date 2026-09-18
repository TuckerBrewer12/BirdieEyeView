import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ProfileHeroBanner", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ProfileHeroBanner", "profile-hero-banner.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ProfileHeroBanner", "profile-hero-banner-dark.png");
  });
});
