import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("AppShell", () => {
  test("wide, with the side rail, light and dark", async ({ page }) => {
    const kit = new BrandKitRobot(page);
    await kit.openFrame("AppShell");
    await kit.captureFrame("app-shell.png");
    await kit.switchToDark();
    await kit.captureFrame("app-shell-dark.png");
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test("with the tab bar, light and dark", async ({ page }) => {
      const kit = new BrandKitRobot(page);
      await kit.openFrame("AppShell");
      await kit.captureFrame("app-shell-phone.png");
      await kit.switchToDark();
      await kit.captureFrame("app-shell-phone-dark.png");
    });
  });
});
