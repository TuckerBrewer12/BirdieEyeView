import { test } from "./FriendsInboxPage.robot";
import { golfers, populatedFriendships } from "../../../../testing/fixtures/friendships";

const seed = { friendships: populatedFriendships, golfers };

test("received requests", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.canAnswer("Riley Brooks");
  await inbox.capture("inbox-received.png");
});

test("received requests in dark mode", async ({ inbox }) => {
  await inbox.dark();
  await inbox.open(seed);
  await inbox.canAnswer("Riley Brooks");
  await inbox.capture("inbox-received-dark.png");
});

test("sent requests", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.tapTab("Sent");
  await inbox.seesStatus("Casey Marsh", "Pending");
  await inbox.capture("inbox-sent.png");
});

test("request accepted", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.accept("Riley Brooks");
  await inbox.seesNotice("Request accepted.");
  await inbox.capture("inbox-accepted.png");
});

test("accept failed", async ({ inbox }) => {
  await inbox.open({ ...seed, respondError: "That request was withdrawn." });
  await inbox.accept("Riley Brooks");
  await inbox.seesError("That request was withdrawn.");
  await inbox.capture("inbox-accept-error.png");
});

test("empty inbox", async ({ inbox }) => {
  await inbox.open();
  await inbox.seesEmptyState("received");
  await inbox.capture("inbox-empty.png");
});

test("load error does not show empty copy", async ({ inbox }) => {
  await inbox.openFailed("Could not load your inbox.");
  await inbox.doesNotSeeEmptyState();
  await inbox.capture("inbox-load-error.png");
});
