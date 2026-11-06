import { describe, expect, it } from "vitest";
import { populatedFriendships } from "@/testing/fixtures/friendships";
import {
  acceptedFriends,
  awaitsAnswer,
  friendshipFromDto,
  requestsIn,
  withFriendship,
} from "../friendsModel";

const friendships = populatedFriendships.map((dto) => friendshipFromDto(dto, "user-1"));

describe("friendshipFromDto", () => {
  it("keeps the addressee as the other golfer on a request the golfer sent", () => {
    const casey = friendships.find((f) => f.id === "friendship-casey");
    expect(casey).toMatchObject({
      direction: "sent",
      status: "pending",
      other: { id: "user-casey", name: "Casey Marsh", email: "casey@example.com" },
      updatedAt: "2026-10-26T09:00:00",
    });
  });

  it("keeps the requester as the other golfer on a request the golfer received", () => {
    const riley = friendships.find((f) => f.id === "friendship-riley");
    expect(riley?.direction).toBe("received");
    expect(riley?.other.name).toBe("Riley Brooks");
  });

  it("turns a missing timestamp or contact into null", () => {
    const [dto] = populatedFriendships;
    const mapped = friendshipFromDto(
      { ...dto, updated_at: "", requester_name: undefined, requester_email: undefined },
      "user-1",
    );
    expect(mapped.updatedAt).toBeNull();
    expect(mapped.other).toEqual({ id: dto.requester_id, name: null, email: null });
  });
});

describe("friendship lists", () => {
  it("counts only accepted friendships as friends, whoever asked", () => {
    expect(acceptedFriends(friendships).map((f) => f.other.name)).toEqual([
      "Avery Lin",
      "Jordan Castellanos",
    ]);
  });

  it("splits requests by who sent them", () => {
    expect(requestsIn(friendships, "received").map((f) => f.id)).toEqual([
      "friendship-riley",
      "friendship-jordan",
      "friendship-sam",
    ]);
    expect(requestsIn(friendships, "sent").map((f) => f.id)).toEqual([
      "friendship-casey",
      "friendship-avery",
    ]);
  });

  it("lets the golfer answer only a pending request they received", () => {
    const answerable = friendships.filter(awaitsAnswer).map((f) => f.id);
    expect(answerable).toEqual(["friendship-riley"]);
  });

  it("moves a changed friendship to the top and adds a new one there", () => {
    const sam = friendships.find((f) => f.id === "friendship-sam");
    if (!sam) throw new Error("fixture is missing Sam");
    const reopened = withFriendship(friendships, { ...sam, status: "pending" });
    expect(reopened.map((f) => f.id)).toEqual([
      "friendship-sam",
      "friendship-riley",
      "friendship-casey",
      "friendship-avery",
      "friendship-jordan",
    ]);
    expect(reopened[0].status).toBe("pending");

    const added = withFriendship([], sam);
    expect(added).toEqual([sam]);
  });
});
