import { test } from "./AppShell.robot";

test.describe("More menu", { tag: "@phone" }, () => {
  test("open, light and dark", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.openMore();
    await shell.capture("app-shell-more-menu.png");
    await shell.switchToDark();
    await shell.capture("app-shell-more-menu-dark.png");
  });
});
