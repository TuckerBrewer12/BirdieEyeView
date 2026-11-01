import type { FriendshipDto } from "../../types/api";
import type { FakeGolfer } from "../fakes/InMemoryFriendships";

/** The signed-in golfer, as FakeBackend's TEST_USER. */
const ME = { id: "user-1", name: "Test Golfer", email: "test@example.com" };

export const avery: FakeGolfer = {
  id: "user-avery",
  name: "Avery Lin",
  email: "avery@example.com",
  friendCode: "GCAVERY001",
};
export const jordan: FakeGolfer = {
  id: "user-jordan",
  name: "Jordan Castellanos",
  email: "jordan@example.com",
  friendCode: "GCJORDAN02",
};
export const sam: FakeGolfer = {
  id: "user-sam",
  name: "Sam Okafor",
  email: null,
  friendCode: "GCSAM00003",
};
export const riley: FakeGolfer = {
  id: "user-riley",
  name: "Riley Brooks",
  email: "riley@example.com",
  friendCode: "GCRILEY004",
};
export const casey: FakeGolfer = {
  id: "user-casey",
  name: "Casey Marsh",
  email: "casey@example.com",
  friendCode: "GCCASEY005",
};

export const golfers: FakeGolfer[] = [avery, jordan, sam, riley, casey];

function friendship(
  id: string,
  requester: { id: string; name: string | null; email: string | null },
  addressee: { id: string; name: string | null; email: string | null },
  status: FriendshipDto["status"],
  updatedAt: string,
): FriendshipDto {
  return {
    id,
    requester_id: requester.id,
    requester_name: requester.name,
    requester_email: requester.email,
    addressee_id: addressee.id,
    addressee_name: addressee.name,
    addressee_email: addressee.email,
    status,
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

/** Newest change first, as the server lists them. */
export const populatedFriendships: FriendshipDto[] = [
  friendship("friendship-riley", riley, ME, "pending", "2026-10-28T15:30:00"),
  friendship("friendship-casey", ME, casey, "pending", "2026-10-26T09:00:00"),
  friendship("friendship-avery", ME, avery, "accepted", "2026-10-20T18:45:00"),
  friendship("friendship-jordan", jordan, ME, "accepted", "2026-10-12T12:00:00"),
  friendship("friendship-sam", sam, ME, "declined", "2026-09-30T08:15:00"),
];
