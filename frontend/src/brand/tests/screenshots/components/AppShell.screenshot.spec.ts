import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { enableDark } from "../../previewScreenshot";

test.describe("AppShell", () => {
  test("wide, with the side rail", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("AppShell");
    await kit.captureFrame("app-shell.png");
  });

  test("wide, dark", async ({ page }) => {
    await enableDark(page);
    const kit = new BrandKitRobot(page);
    await kit.openFrame("AppShell");
    await kit.captureFrame("app-shell-dark.png");
  });

  // The kit runs at desktop only, so the phone captures set their own viewport.
  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test("with the tab bar", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("AppShell");
      await kit.captureFrame("app-shell-phone.png");
    });

    test("dark", async ({ page }) => {
      await enableDark(page);
      const kit = new BrandKitRobot(page);
      await kit.openFrame("AppShell");
      await kit.captureFrame("app-shell-phone-dark.png");
    });
  });
});
