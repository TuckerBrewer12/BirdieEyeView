import { test } from "./SocialPage.robot";
import { golfers, populatedFriendships } from "../../../testing/fixtures/friendships";

const seed = { friendships: populatedFriendships, golfers };

test("friends list", async ({ social }) => {
  await social.open(seed);
  await social.seesFriend("Avery Lin");
  await social.capture("social-populated.png");
});

test("friends list in dark mode", async ({ social }) => {
  await social.dark();
  await social.open(seed);
  await social.seesFriend("Avery Lin");
  await social.capture("social-populated-dark.png");
});

test("no friends yet", async ({ social }) => {
  await social.open();
  await social.seesEmptyState();
  await social.capture("social-empty.png");
});

test("request sent", async ({ social }) => {
  await social.open(seed);
  await social.typeCode("GCSAM00003");
  await social.tapSend();
  await social.seesSent();
  await social.capture("social-sent.png");
});

test("send error", async ({ social }) => {
  await social.open(seed);
  await social.typeCode("GCNOBODY99");
  await social.tapSend();
  await social.seesError("Friend code not found");
  await social.capture("social-send-error.png");
});

test("load error does not show empty copy", async ({ social }) => {
  await social.openFailed("Could not load your friends.");
  await social.doesNotSeeEmptyState();
  await social.capture("social-load-error.png");
});
