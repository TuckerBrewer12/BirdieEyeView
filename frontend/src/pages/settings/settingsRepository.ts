import { courseRepository, type CourseRepository } from "@/data/courseRepository";
import { readPreference, writePreference } from "@/data/devicePreferences";
import { userRepository, type UserRepository } from "@/data/userRepository";
import type { DevicePreferences } from "./model";

const UPDATES_PREF_KEY = "settings_get_updates";

/** The shared user and course reads (`data/`), plus the choices kept on this device. */
export interface SettingsRepository extends UserRepository, CourseRepository {
  readDevicePreferences(): DevicePreferences;
  saveDevicePreferences(preferences: DevicePreferences): void;
}

/** Reads stored device choices, falling back to the defaults for anything unset or unknown. */
export function devicePreferencesFrom(getUpdates: string | null): DevicePreferences {
  return { getUpdates: getUpdates !== "false" };
}

export const settingsRepository: SettingsRepository = {
  ...userRepository,
  ...courseRepository,
  readDevicePreferences: () => devicePreferencesFrom(readPreference(UPDATES_PREF_KEY)),
  saveDevicePreferences: ({ getUpdates }) => {
    writePreference(UPDATES_PREF_KEY, String(getUpdates));
  },
};
