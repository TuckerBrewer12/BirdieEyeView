import { describe, expect, it } from "vitest";
import { pebbleBeach } from "@/testing/fixtures/courses";
import { scannedCard } from "@/testing/fixtures/scan";
import { presetCourseFrom, reviewFromScan, scanAtCourse } from "../scanModel";
import { newScanSession, withArrivingCourse } from "../scanSession";

const pebble = { id: pebbleBeach.id, name: "Pebble Beach" };

describe("scanAtCourse", () => {
  it("hands over the course's id and name", () => {
    expect(scanAtCourse({ id: "course-1", name: "Pebble Beach" })).toEqual({
      presetCourse: { id: "course-1", name: "Pebble Beach" },
    });
  });

  it("names a course with no name by its id, as picking one does", () => {
    expect(scanAtCourse({ id: "course-1", name: null })).toEqual({
      presetCourse: { id: "course-1", name: "course-1" },
    });
  });
});

describe("presetCourseFrom", () => {
  it("reads back what scanAtCourse hands over", () => {
    expect(presetCourseFrom(scanAtCourse({ id: "course-1", name: "Pebble Beach" }))).toEqual({
      id: "course-1",
      name: "Pebble Beach",
    });
  });

  it("ignores state that carries no course, or something else", () => {
    expect(presetCourseFrom(null)).toBeNull();
    expect(presetCourseFrom(undefined)).toBeNull();
    expect(presetCourseFrom("course-1")).toBeNull();
    expect(presetCourseFrom({ from: "/courses/course-1" })).toBeNull();
    expect(presetCourseFrom({ presetCourse: null })).toBeNull();
    expect(presetCourseFrom({ presetCourse: { id: 42, name: "Pebble Beach" } })).toBeNull();
    expect(presetCourseFrom({ presetCourse: { id: "", name: "Pebble Beach" } })).toBeNull();
    expect(presetCourseFrom({ presetCourse: { id: "course-1" } })).toBeNull();
  });
});

describe("withArrivingCourse", () => {
  it("picks the course ahead on a fresh card", () => {
    const session = withArrivingCourse(newScanSession("2026-10-15"), pebble);
    expect(session.mode).toBe("scan");
    expect(session.presetCourse).toEqual(pebble);
  });

  it("replaces a course picked ahead when no photo is picked yet, and clears an old error", () => {
    const before = {
      ...newScanSession("2026-10-15"),
      presetCourse: { id: "course-2", name: "Half Moon Bay" },
      userContext: "my name is Sam",
      error: "We couldn't scan this scorecard.",
    };
    const session = withArrivingCourse(before, pebble);
    expect(session.presetCourse).toEqual(pebble);
    expect(session.userContext).toBe("my name is Sam");
    expect(session.error).toBeNull();
  });

  it("switches from typing scores in to scanning when no course was chosen there", () => {
    const session = withArrivingCourse({ ...newScanSession("2026-10-15"), mode: "manual" }, pebble);
    expect(session.mode).toBe("scan");
    expect(session.presetCourse).toEqual(pebble);
  });

  it("leaves a card that is already under way as it was", () => {
    const fresh = newScanSession("2026-10-15");
    const photo = { id: "card", file: new File(["card"], "card.jpg", { type: "image/jpeg" }) };
    const underWay = [
      { ...fresh, photo },
      { ...fresh, review: reviewFromScan(scannedCard, "2026-10-15") },
      { ...fresh, savedRoundId: "round-9" },
      { ...fresh, mode: "manual" as const, setup: { ...fresh.setup, course: { id: null, name: "Muni" } } },
    ];
    for (const session of underWay) {
      expect(withArrivingCourse(session, pebble)).toBe(session);
    }
  });
});
