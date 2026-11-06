import { test } from "./AppShell.robot";

// these cover what only the shell shows — the phone's More menu open. The tab
// bar and its menu are phone-only.
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
