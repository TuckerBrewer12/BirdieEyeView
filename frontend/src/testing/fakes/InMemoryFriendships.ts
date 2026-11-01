import type { FriendshipDto } from "../../types/api";
import type { FriendshipAnswer } from "../../data/friendsModel";

/** Someone a friend request can be sent to. */
export interface FakeGolfer {
  id: string;
  name: string | null;
  email: string | null;
  friendCode: string;
}

export interface InMemoryFriendshipsSeed {
  /** The signed-in golfer's id. */
  userId?: string;
  /** Rows as the server lists them, newest change first. */
  friendships?: FriendshipDto[];
  /** Golfers a friend code can find. */
  golfers?: FakeGolfer[];
  loadError?: string | null;
  sendError?: string | null;
  respondError?: string | null;
}

/** A failed call, with the status the real API answers it with. */
export class FakeHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The fixed clock every write stamps, so screenshots are stable. */
const NOW = "2026-10-31T12:00:00";

/**
 * The server's friendship rules, kept in memory. FakeFriendsRepository and
 * FakeBackend both play against this, so a page test and a view-model test
 * see the same answers.
 */
export class InMemoryFriendships {
  readonly userId: string;
  private rows: FriendshipDto[];
  golfers: FakeGolfer[];
  loadError: string | null;
  sendError: string | null;
  respondError: string | null;
  readonly sentCodes: string[] = [];
  private created = 0;

  constructor(seed: InMemoryFriendshipsSeed = {}) {
    this.userId = seed.userId ?? "user-1";
    this.rows = [...(seed.friendships ?? [])];
    this.golfers = [...(seed.golfers ?? [])];
    this.loadError = seed.loadError ?? null;
    this.sendError = seed.sendError ?? null;
    this.respondError = seed.respondError ?? null;
  }

  list(): FriendshipDto[] {
    if (this.loadError) throw new FakeHttpError(400, this.loadError);
    return [...this.rows];
  }

  /** Sends, or re-opens, a request to the golfer with `friendCode`. */
  send(friendCode: string): FriendshipDto {
    const code = friendCode.trim().toUpperCase();
    this.sentCodes.push(code);
    if (this.sendError) throw new FakeHttpError(400, this.sendError);
    const golfer = this.golfers.find((g) => g.friendCode === code);
    if (!golfer) throw new FakeHttpError(404, "Friend code not found");
    if (golfer.id === this.userId) throw new FakeHttpError(400, "Cannot friend yourself");

    const existing = this.rows.find(
      (r) => r.requester_id === golfer.id || r.addressee_id === golfer.id,
    );
    if (existing?.status === "accepted") throw new FakeHttpError(409, "Users are already friends");
    if (existing?.status === "blocked") {
      throw new FakeHttpError(409, "Friend request blocked for this pair");
    }

    const row: FriendshipDto = {
      id: existing?.id ?? `friendship-new-${++this.created}`,
      requester_id: this.userId,
      requester_name: "Test Golfer",
      requester_email: "test@example.com",
      addressee_id: golfer.id,
      addressee_name: golfer.name,
      addressee_email: golfer.email,
      status: "pending",
      created_at: existing?.created_at ?? NOW,
      updated_at: NOW,
    };
    this.rows = [row, ...this.rows.filter((r) => r.id !== row.id)];
    return row;
  }

  /** Only the addressee can accept or decline, and only while it is pending; either side can block. */
  respond(friendshipId: string, answer: FriendshipAnswer): FriendshipDto {
    if (this.respondError) throw new FakeHttpError(400, this.respondError);
    const row = this.rows.find((r) => r.id === friendshipId);
    const permitted =
      row != null
      && (answer === "blocked"
        ? row.requester_id === this.userId || row.addressee_id === this.userId
        : row.status === "pending" && row.addressee_id === this.userId);
    if (!row || !permitted) {
      throw new FakeHttpError(404, "Friendship not found or action not permitted");
    }
    const updated: FriendshipDto = { ...row, status: answer, updated_at: NOW };
    this.rows = [updated, ...this.rows.filter((r) => r.id !== friendshipId)];
    return updated;
  }
}
