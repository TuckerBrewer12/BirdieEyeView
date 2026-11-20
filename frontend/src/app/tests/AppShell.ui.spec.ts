import { golfers, populatedFriendships } from "../../testing/fixtures/friendships";
import { test } from "./AppShell.robot";

test("the side rail moves between pages and marks the current one", async ({ shell }) => {
  await shell.open("/rounds");
  await shell.seesCurrent("Rounds");
  await shell.tapNav("Courses");
  await shell.isAt("/courses");
  await shell.seesCurrent("Courses");
  await shell.tapNav("Rounds");
  await shell.isAt("/rounds");
  await shell.seesCurrent("Rounds");
});

test("signing out from the side rail returns to the landing page", async ({ shell }) => {
  await shell.open("/rounds");
  await shell.signOut();
  await shell.seesSignedOut();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("a tab moves to its page", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.seesCurrent("Rounds");
    await shell.tapNav("Scan");
    await shell.isAt("/scan");
    await shell.seesCurrent("Scan");
  });

  test("a More item moves to its page, folds the menu and lights More", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.openMore();
    await shell.tapMenuItem("Courses");
    await shell.isAt("/courses");
    await shell.seesMenuClosed();
    await shell.seesMoreLit();
  });

  test("the More menu folds from the dimmed page and from Escape", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.openMore();
    await shell.tapOutsideMenu();
    await shell.seesMenuClosed();
    await shell.openMore();
    await shell.closeMenuWithEscape();
    await shell.seesMenuClosed();
    await shell.isAt("/rounds");
  });

  test("More shows the golfer, and Social counts the requests waiting for an answer", async ({ shell }) => {
    await shell.open("/rounds", { friends: { friendships: populatedFriendships, golfers } });
    await shell.openMore();
    await shell.seesMenuGolfer("Test Golfer");
    await shell.seesMenuCount("Social", 1);
    await shell.tapMenuItem("Social, 1 new");
    await shell.isAt("/social");
    await shell.seesMoreLit();
  });

  test("signing out through More and Settings returns to the landing page", async ({ shell }) => {
    await shell.open("/rounds");
    await shell.signOut();
    await shell.seesSignedOut();
  });
});
