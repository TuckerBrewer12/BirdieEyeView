import { test } from "./AppShell.robot";

test.describe("More menu", { tag: "@phone" }, () => {
  test("open", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.openMore();
    await shell.capture("app-shell-more-menu.png");
  });

  test("open in dark mode", async ({ shell }) => {
    await shell.dark();
    await shell.open("/rounds");
    await shell.openMore();
    await shell.capture("app-shell-more-menu-dark.png");
  });
});
