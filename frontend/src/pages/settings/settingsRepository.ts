import { readPreference, writePreference } from "@/data/devicePreferences";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { courseSummaryFrom } from "@/domain/course";
import { api } from "@/lib/api";
import type { CourseSearchRepository } from "@/pages/rounds/roundsRepository";
import type { UserDto } from "@/types/api";
import type { DevicePreferences, Settings } from "./model";

const UPDATES_PREF_KEY = "settings_get_updates";

export interface SettingsRepository extends Pick<UserRepository, "updateUser">, CourseSearchRepository {
  getSettings(userId: string): Promise<Settings>;
  readDevicePreferences(): DevicePreferences;
  saveDevicePreferences(preferences: DevicePreferences): void;
}

export function settingsFrom(user: UserDto, homeCourseName: string | null): Settings {
  return {
    friendCode: user.friend_code || null,
    handicap: user.handicap,
    homeCourse: user.home_course_id ? { id: user.home_course_id, name: homeCourseName } : null,
  };
}

export function devicePreferencesFrom(getUpdates: string | null): DevicePreferences {
  return { getUpdates: getUpdates !== "false" };
}

export const settingsRepository: SettingsRepository = {
  getSettings: async (userId) => {
    const user = await userRepository.getUser(userId);
    const homeCourse = user.home_course_id
      ? await api.getCourse(user.home_course_id).catch(() => null)
      : null;
    return settingsFrom(user, homeCourse?.name ?? null);
  },
  updateUser: (userId, changes) => userRepository.updateUser(userId, changes),
  searchCourses: async (query, userId) => (await api.searchCourses(query, userId)).map(courseSummaryFrom),
  readDevicePreferences: () => devicePreferencesFrom(readPreference(UPDATES_PREF_KEY)),
  saveDevicePreferences: ({ getUpdates }) => {
    writePreference(UPDATES_PREF_KEY, String(getUpdates));
  },
};
