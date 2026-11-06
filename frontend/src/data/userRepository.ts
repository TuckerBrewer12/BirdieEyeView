import { api } from "@/lib/api";
import type { UserChangesDto, UserDto } from "@/types/api";

export interface UserRepository {
  getUser(userId: string): Promise<UserDto>;
  updateUser(userId: string, changes: UserChangesDto): Promise<UserDto>;
}

export const userRepository: UserRepository = {
  getUser: (userId) => api.getUser(userId),
  updateUser: (userId, changes) => api.updateUser(userId, changes),
};
