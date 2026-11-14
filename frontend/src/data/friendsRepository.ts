import { api } from "@/lib/api";
import { friendshipFromDto, type Friendship, type FriendshipAnswer } from "./friendsModel";

export interface FriendsRepository {
  getFriendships(userId: string): Promise<Friendship[]>;
  getPendingFriendships(userId: string): Promise<Friendship[]>;
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
