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

  const inbox = await social.tapRequests();
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

test("each friend shows their index and last round, and Compare opens Profile against them", async ({ social }) => {
  await social.open(seed);
  await social.seesOpenRequests(1);
  await social.seesMyCode("TGOLF7Q2");
  await social.seesFriendDetail("Avery Lin", "Handicap 8.2 · played Oct 28");
  await social.seesFriendDetail("Jordan Castellanos", "Handicap 14.6 · played Oct 12");
  await social.tapCompare("Avery Lin");
});

test("answering the open request clears the Requests count", async ({ social }) => {
  await social.open(seed);
  const inbox = await social.tapRequests();
  await inbox.accept("Riley Brooks");
  const back = await inbox.goBack();
  await back.seesOpenRequests(0);
  await back.seesFriend("Riley Brooks");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the code sits under the field, and a friend's row opens Profile against them", async ({ social }) => {
    await social.open(seed);
    await social.seesMyCode("TGOLF7Q2");
    await social.tapCompare("Jordan Castellanos");
  });
});
