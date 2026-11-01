import {
  friendshipFromDto,
  type Friendship,
  type FriendshipAnswer,
} from "../../pages/social/friendsModel";
import type { FriendsRepository } from "../../pages/social/friendsRepository";
import { InMemoryFriendships, type InMemoryFriendshipsSeed } from "./InMemoryFriendships";

/** Maps the in-memory server's rows the way the real repository maps the API's. */
export class FakeFriendsRepository implements FriendsRepository {
  readonly store: InMemoryFriendships;
  getFriendshipsCalls = 0;

  constructor(seed: InMemoryFriendshipsSeed = {}) {
    this.store = new InMemoryFriendships(seed);
  }

  async getFriendships(userId: string): Promise<Friendship[]> {
    this.getFriendshipsCalls += 1;
    return this.store.list().map((dto) => friendshipFromDto(dto, userId));
  }

  async sendRequest(userId: string, friendCode: string): Promise<Friendship> {
    return friendshipFromDto(this.store.send(friendCode), userId);
  }

  async respond(userId: string, friendshipId: string, answer: FriendshipAnswer): Promise<Friendship> {
    return friendshipFromDto(this.store.respond(friendshipId, answer), userId);
  }
}
