import type { FriendshipDto, FriendshipStatusRequestDto } from "@/types/api";

export type FriendshipStatus = FriendshipDto["status"];
/** How the golfer can answer a request they received. */
export type FriendshipAnswer = FriendshipStatusRequestDto["status"];
/** Whether the golfer received the request or sent it. */
export type FriendshipDirection = "received" | "sent";

/** The golfer on the other side of a friendship. */
export interface Person {
  id: string;
  name: string | null;
  email: string | null;
}

/** A friendship as the signed-in golfer sees it. */
export interface Friendship {
  id: string;
  direction: FriendshipDirection;
  status: FriendshipStatus;
  other: Person;
  /** ISO timestamp of the last change, or null when the server sent none. */
  updatedAt: string | null;
}

/**
 * The server sends a friendship from both golfers' point of view at once
 * (requester and addressee). This keeps the side that is not `userId`.
 */
export function friendshipFromDto(dto: FriendshipDto, userId: string): Friendship {
  const sent = dto.requester_id === userId;
  return {
    id: dto.id,
    direction: sent ? "sent" : "received",
    status: dto.status,
    other: sent
      ? { id: dto.addressee_id, name: dto.addressee_name ?? null, email: dto.addressee_email ?? null }
      : { id: dto.requester_id, name: dto.requester_name ?? null, email: dto.requester_email ?? null },
    updatedAt: dto.updated_at || null,
  };
}

export function acceptedFriends(friendships: readonly Friendship[]): Friendship[] {
  return friendships.filter((f) => f.status === "accepted");
}

export function requestsIn(
  friendships: readonly Friendship[],
  direction: FriendshipDirection,
): Friendship[] {
  return friendships.filter((f) => f.direction === direction);
}

/** Only a request someone sent the golfer, still pending, can be answered. */
export function awaitsAnswer(friendship: Friendship): boolean {
  return friendship.direction === "received" && friendship.status === "pending";
}

/**
 * Puts a friendship the server just returned at the top, replacing its old
 * copy. The server lists friendships newest change first, and this one just
 * changed.
 */
export function withFriendship(
  friendships: readonly Friendship[],
  friendship: Friendship,
): Friendship[] {
  return [friendship, ...friendships.filter((f) => f.id !== friendship.id)];
}
