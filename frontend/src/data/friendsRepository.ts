import { api } from "@/lib/api";
import { friendshipFromDto, type Friendship, type FriendshipAnswer } from "./friendsModel";

export interface FriendsRepository {
  /** Every friendship the golfer is part of: friends, and requests either way. */
  getFriendships(userId: string): Promise<Friendship[]>;
  /** Only the pending requests, either way. The server skips each friend's figures for these. */
  getPendingFriendships(userId: string): Promise<Friendship[]>;
  /** Sends (or re-opens) a request to the golfer with this friend code. */
  sendRequest(userId: string, friendCode: string): Promise<Friendship>;
  respond(userId: string, friendshipId: string, answer: FriendshipAnswer): Promise<Friendship>;
}

export const friendsRepository: FriendsRepository = {
  getFriendships: async (userId) =>
    (await api.getFriendships()).map((dto) => friendshipFromDto(dto, userId)),
  getPendingFriendships: async (userId) =>
    (await api.getFriendships("pending")).map((dto) => friendshipFromDto(dto, userId)),
  sendRequest: async (userId, friendCode) =>
    friendshipFromDto(await api.sendFriendRequest(friendCode), userId),
  respond: async (userId, friendshipId, answer) =>
    friendshipFromDto(await api.updateFriendshipStatus(friendshipId, answer), userId),
};
