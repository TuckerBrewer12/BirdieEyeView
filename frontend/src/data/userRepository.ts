import { api } from "@/lib/api";
import type { User } from "@/types/golf";

export interface UserRepository {
  getUser(userId: string): Promise<User>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
}

export const userRepository: UserRepository = {
  getUser: (userId) => api.getUser(userId),
  getUserHandicap: (userId) => api.getUserHandicap(userId),
};
