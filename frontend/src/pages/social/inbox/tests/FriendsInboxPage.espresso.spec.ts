import { test } from "./FriendsInboxPage.robot";
import { golfers, populatedFriendships } from "../../../../testing/fixtures/friendships";

const seed = { friendships: populatedFriendships, golfers };

test("accepting a request makes them a friend on the social page", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.accept("Riley Brooks");
  await inbox.seesNotice("Request accepted.");
  await inbox.seesStatus("Riley Brooks", "Friends");
  await inbox.seesNoAnswerButtons("Riley Brooks");

  const social = await inbox.goBack();
  await social.seesFriend("Riley Brooks");
});

test("declining a request closes it without making a friend", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.decline("Riley Brooks");
  await inbox.seesNotice("Request declined.");
  await inbox.seesStatus("Riley Brooks", "Declined");
  await inbox.seesNoAnswerButtons("Riley Brooks");
});

test("a failed accept shows the server's reason and leaves the request answerable", async ({ inbox }) => {
  await inbox.open({ ...seed, respondError: "That request was withdrawn." });
  await inbox.accept("Riley Brooks");
  await inbox.seesError("That request was withdrawn.");
  await inbox.seesAnswerButtons("Riley Brooks");
});

test("the sent tab lists requests the golfer sent, with no answer buttons", async ({ inbox }) => {
  await inbox.open(seed);
  await inbox.seesAnswerButtons("Riley Brooks");
  await inbox.tapTab("Sent");
  await inbox.seesStatus("Casey Marsh", "Pending");
  await inbox.seesNoAnswerButtons("Casey Marsh");
});
