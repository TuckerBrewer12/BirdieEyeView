import { describe, expect, it } from "vitest";
import { devicePreferencesFrom, settingsFrom } from "../settingsRepository";
import { formChanged, type SettingsForm } from "../model";
import type { User } from "@/types/golf";

const user: User = {
  id: "user-1",
  friend_code: "BIRD-1234",
  name: "Test Golfer",
  email: "test@example.com",
  home_course_id: "course-1",
  handicap: -1.5,
  created_at: null,
  scoring_goal: null,
};

describe("settingsFrom", () => {
  it("maps the user and the home course's name", () => {
    expect(settingsFrom(user, "Pebble Beach")).toEqual({
      friendCode: "BIRD-1234",
      handicap: -1.5,
      homeCourse: { id: "course-1", name: "Pebble Beach" },
    });
  });

  it("has no home course or friend code when the user has none", () => {
    expect(settingsFrom({ ...user, home_course_id: null, friend_code: "" }, null)).toMatchObject({
      friendCode: null,
      homeCourse: null,
    });
  });
});

describe("devicePreferencesFrom", () => {
  it("defaults to getting updates with no colour filter", () => {
    expect(devicePreferencesFrom(null, null)).toEqual({ getUpdates: true, colorBlindMode: "none" });
  });

  it("reads stored choices and ignores an unknown mode", () => {
    expect(devicePreferencesFrom("false", "tritanopia")).toEqual({ getUpdates: false, colorBlindMode: "tritanopia" });
    expect(devicePreferencesFrom("true", "sepia").colorBlindMode).toBe("none");
  });
});

describe("formChanged", () => {
  const saved: SettingsForm = {
    handicapInput: "12",
    homeCourse: { id: "course-1", name: "Pebble Beach" },
    getUpdates: true,
    colorBlindMode: "none",
  };

  it("compares the home course by id, not name", () => {
    expect(formChanged({ ...saved, homeCourse: { id: "course-1", name: null } }, saved)).toBe(false);
    expect(formChanged({ ...saved, homeCourse: null }, saved)).toBe(true);
  });

  it("notices each field", () => {
    expect(formChanged({ ...saved, handicapInput: "11" }, saved)).toBe(true);
    expect(formChanged({ ...saved, getUpdates: false }, saved)).toBe(true);
    expect(formChanged({ ...saved, colorBlindMode: "protanopia" }, saved)).toBe(true);
  });
});
