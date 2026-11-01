import { api } from "@/lib/api";
import type { User } from "@/types/golf";

export interface UserUpdate {
  home_course_id?: string | null;
  handicap?: number | null;
  scoring_goal?: number | null;
}

export interface UserRepository {
  getUser(userId: string): Promise<User>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
  updateUser(userId: string, body: UserUpdate): Promise<User>;
}

export const userRepository: UserRepository = {
  getUser: (userId) => api.getUser(userId),
  getUserHandicap: (userId) => api.getUserHandicap(userId),
  updateUser: (userId, body) => api.updateUser(userId, body),
};
