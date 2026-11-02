import { api } from "@/lib/api";
import type { HandicapIndexDto, UserChangesDto, UserDto } from "@/types/api";

export interface UserRepository {
  getUser(userId: string): Promise<UserDto>;
  getUserHandicap(userId: string): Promise<HandicapIndexDto>;
  /** Saves the changes and returns the user as saved. */
  updateUser(userId: string, changes: UserChangesDto): Promise<UserDto>;
}

export const userRepository: UserRepository = {
  getUser: (userId) => api.getUser(userId),
  getUserHandicap: (userId) => api.getUserHandicap(userId),
  updateUser: (userId, changes) => api.updateUser(userId, changes),
};
