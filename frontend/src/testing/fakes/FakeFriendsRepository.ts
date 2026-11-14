import {
  friendshipFromDto,
  type Friendship,
  type FriendshipAnswer,
} from "../../data/friendsModel";
import type { UserDto } from "../../types/api";
import type { SocialRepository } from "../../pages/social/useSocialPageViewModel";
import { InMemoryFriendships, type InMemoryFriendshipsSeed } from "./InMemoryFriendships";

export class FakeFriendsRepository implements SocialRepository {
  readonly store: InMemoryFriendships;
  getFriendshipsCalls = 0;
  readonly myCode: string | null;

  constructor(seed: InMemoryFriendshipsSeed & { myCode?: string | null } = {}) {
    this.store = new InMemoryFriendships(seed);
    this.myCode = seed.myCode === undefined ? "TGOLF7Q2" : seed.myCode;
  }

  async getUser(userId: string): Promise<UserDto> {
    return {
      id: userId,
      name: "Test Golfer",
      email: "test@example.com",
      handicap: null,
      home_course_id: null,
      scoring_goal: null,
      friend_code: this.myCode,
      created_at: null,
    };
  }

  async getFriendships(userId: string): Promise<Friendship[]> {
    this.getFriendshipsCalls += 1;
    return this.store.list().map((dto) => friendshipFromDto(dto, userId));
  }

  async getPendingFriendships(userId: string): Promise<Friendship[]> {
    return this.store
      .list()
      .filter((dto) => dto.status === "pending")
      .map((dto) => friendshipFromDto(dto, userId));
  }

  async sendRequest(userId: string, friendCode: string): Promise<Friendship> {
    return friendshipFromDto(this.store.send(friendCode), userId);
  }

  async respond(userId: string, friendshipId: string, answer: FriendshipAnswer): Promise<Friendship> {
    return friendshipFromDto(this.store.respond(friendshipId, answer), userId);
  }
}
