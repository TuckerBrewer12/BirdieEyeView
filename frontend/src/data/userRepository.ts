import { api } from "@/lib/api";
import type { UserChangesDto } from "@/types/api";
import type { User } from "@/types/golf";

export interface UserRepository {
  getUser(userId: string): Promise<User>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
  /** Saves the changes and returns the user as saved. */
  updateUser(userId: string, changes: UserChangesDto): Promise<User>;
}

export const userRepository: UserRepository = {
  getUser: (userId) => api.getUser(userId),
  getUserHandicap: (userId) => api.getUserHandicap(userId),
  updateUser: (userId, changes) => api.updateUser(userId, changes),
};
