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
const sam: FakeGolfer = {
  id: "user-sam",
  name: "Sam Okafor",
  email: null,
  friendCode: "GCSAM00003",
};
const riley: FakeGolfer = {
  id: "user-riley",
  name: "Riley Brooks",
  email: "riley@example.com",
  friendCode: "GCRILEY004",
};
const casey: FakeGolfer = {
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

/** The same friendships as `populatedFriendships`, for a signed-in golfer other than the test user. */
export function friendshipsOf(golfer: { id: string; name: string | null; email: string | null }): FriendshipDto[] {
  const swap = (id: string) => (id === ME.id ? golfer.id : id);
  return populatedFriendships.map((row) => ({
    ...row,
    requester_id: swap(row.requester_id),
    requester_name: row.requester_id === ME.id ? golfer.name : row.requester_name,
    requester_email: row.requester_id === ME.id ? golfer.email : row.requester_email,
    addressee_id: swap(row.addressee_id),
    addressee_name: row.addressee_id === ME.id ? golfer.name : row.addressee_name,
    addressee_email: row.addressee_id === ME.id ? golfer.email : row.addressee_email,
  }));
}

/** Newest change first, as the server lists them. */
export const populatedFriendships: FriendshipDto[] = [
  friendship("friendship-riley", riley, ME, "pending", "2026-10-28T15:30:00"),
  friendship("friendship-casey", ME, casey, "pending", "2026-10-26T09:00:00"),
  {
    ...friendship("friendship-avery", ME, avery, "accepted", "2026-10-20T18:45:00"),
    friend_handicap_index: 8.2,
    friend_last_played: "2026-10-28",
  },
  {
    ...friendship("friendship-jordan", jordan, ME, "accepted", "2026-10-12T12:00:00"),
    friend_handicap_index: 14.6,
    friend_last_played: "2026-10-12",
  },
  friendship("friendship-sam", sam, ME, "declined", "2026-09-30T08:15:00"),
];
