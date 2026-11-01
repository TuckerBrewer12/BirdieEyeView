import { test } from "./SocialPage.robot";
import { golfers, populatedFriendships } from "../../../testing/fixtures/friendships";

const seed = { friendships: populatedFriendships, golfers };

test("sending a friend code adds the request to the inbox's sent tab", async ({ social }) => {
  await social.open(seed);
  await social.typeCode("gcsam00003");
  await social.seesCode("GCSAM00003");
  await social.tapSend();
  await social.seesSent();
  await social.seesCode("");

  const inbox = await social.tapInbox();
  await inbox.tapTab("Sent");
  await inbox.seesStatus("Sam Okafor", "Pending");
});

test("an unknown friend code shows the server's reason and keeps the code", async ({ social }) => {
  await social.open(seed);
  await social.typeCode("GCNOBODY99");
  await social.tapSend();
  await social.seesError("Friend code not found");
  await social.seesCode("GCNOBODY99");
});

test("a blank friend code asks for one and leaves the field empty", async ({ social }) => {
  await social.open(seed);
  await social.tapSend();
  await social.seesError("Enter a friend code first.");
  await social.seesCode("");
});
