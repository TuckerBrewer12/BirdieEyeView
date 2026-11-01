import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import { labAnalyticsFrom, type LabAnalytics } from "./model";

/** The Lab compares a golfer's last 20 rounds, so every analytics read covers that window. */
export const LAB_WINDOW = 20;

export interface LabRepository
  extends GoalReportRepository,
    Pick<UserRepository, "getUser" | "updateUser">,
    Pick<FriendsRepository, "getFriendships"> {
  /** A golfer's last 20 rounds of analytics, the golfer's own or a friend's. */
  getAnalytics(userId: string): Promise<LabAnalytics>;
}

export const labRepository: LabRepository = {
  getAnalytics: async (userId) =>
    labAnalyticsFrom(
      await api.getAnalytics(userId, { limit: LAB_WINDOW, timeframe: "all", courseId: "all" }),
    ),
  getUser: (userId) => userRepository.getUser(userId),
  updateUser: (userId, changes) => userRepository.updateUser(userId, changes),
  getGoalReport: (userId, limit) => goalReportRepository.getGoalReport(userId, limit),
  getFriendships: (userId) => friendsRepository.getFriendships(userId),
};
