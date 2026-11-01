import { readPreference, writePreference } from "@/data/devicePreferences";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import { COLORBLIND_PREF_KEY, type ColorBlindMode } from "@/lib/accessibility";
import type { CourseSearchRepository } from "@/pages/rounds/roundsRepository";
import type { User } from "@/types/golf";
import type { DevicePreferences, Settings } from "./model";

const UPDATES_PREF_KEY = "settings_get_updates";
const COLOR_BLIND_MODES: readonly ColorBlindMode[] = ["none", "protanopia", "deuteranopia", "tritanopia"];

export interface SettingsRepository extends Pick<UserRepository, "updateUser">, CourseSearchRepository {
  getSettings(userId: string): Promise<Settings>;
  readDevicePreferences(): DevicePreferences;
  saveDevicePreferences(preferences: DevicePreferences): void;
}

/** The user as Settings shows it, with the home course's name read separately. */
export function settingsFrom(user: User, homeCourseName: string | null): Settings {
  return {
    friendCode: user.friend_code || null,
    handicap: user.handicap,
    homeCourse: user.home_course_id ? { id: user.home_course_id, name: homeCourseName } : null,
  };
}

/** Reads stored device choices, falling back to the defaults for anything unset or unknown. */
export function devicePreferencesFrom(
  getUpdates: string | null,
  colorBlindMode: string | null,
): DevicePreferences {
  return {
    getUpdates: getUpdates !== "false",
    colorBlindMode: COLOR_BLIND_MODES.find((mode) => mode === colorBlindMode) ?? "none",
  };
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
  searchCourses: (query, userId) => api.searchCourses(query, userId),
  readDevicePreferences: () =>
    devicePreferencesFrom(readPreference(UPDATES_PREF_KEY), readPreference(COLORBLIND_PREF_KEY)),
  saveDevicePreferences: ({ getUpdates, colorBlindMode }) => {
    writePreference(UPDATES_PREF_KEY, String(getUpdates));
    writePreference(COLORBLIND_PREF_KEY, colorBlindMode);
  },
};
