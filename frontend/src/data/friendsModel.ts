import type { FriendshipDto, FriendshipStatusRequestDto } from "@/types/api";

export type FriendshipStatus = FriendshipDto["status"];
export type FriendshipAnswer = FriendshipStatusRequestDto["status"];
export type FriendshipDirection = "received" | "sent";

export interface Person {
  id: string;
  name: string | null;
  email: string | null;
}

export interface Friendship {
  id: string;
  direction: FriendshipDirection;
  status: FriendshipStatus;
  other: Person;
  updatedAt: string | null;
}

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

export function awaitsAnswer(friendship: Friendship): boolean {
  return friendship.direction === "received" && friendship.status === "pending";
}

export function withFriendship(
  friendships: readonly Friendship[],
  friendship: Friendship,
): Friendship[] {
  return [friendship, ...friendships.filter((f) => f.id !== friendship.id)];
}
