import { describe, expect, it } from "vitest";
import { presetCourseFrom, scanAtCourse } from "../scanModel";
import type { PickedPhoto } from "@/data/useCardText";
import { newScanSession, withArrivingCourse } from "../scanSession";

const pebble = { id: "course-pb", name: "Pebble Beach" };
const photo: PickedPhoto = { id: "photo-1", file: new File(["card"], "card.jpg", { type: "image/jpeg" }) };

describe("scanAtCourse and presetCourseFrom", () => {
  it("hand a course to Scan and read it back", () => {
    expect(presetCourseFrom(scanAtCourse(pebble))).toEqual(pebble);
  });

  it("fall back to the id when the course has no name", () => {
    expect(presetCourseFrom({ scanAtCourse: { id: "course-x", name: "" } })).toEqual({ id: "course-x", name: "course-x" });
  });

  it("ignore any other router state", () => {
    expect(presetCourseFrom(null)).toBeNull();
    expect(presetCourseFrom({ from: "/rounds" })).toBeNull();
    expect(presetCourseFrom({ scanAtCourse: "course-pb" })).toBeNull();
    expect(presetCourseFrom({ scanAtCourse: { id: 7, name: "Seven" } })).toBeNull();
  });
});

describe("withArrivingCourse", () => {
  it("picks the course ahead on a fresh card", () => {
    expect(withArrivingCourse(newScanSession(), pebble).presetCourse).toEqual(pebble);
  });

  it("replaces a course picked ahead with no photo yet, and clears an old error", () => {
    const session = { ...newScanSession(), presetCourse: { id: "course-hmb", name: "Half Moon Bay" }, error: "Nope" };
    const arrived = withArrivingCourse(session, pebble);
    expect(arrived.presetCourse).toEqual(pebble);
    expect(arrived.error).toBeNull();
  });

  it("switches from hand entry when no course was chosen there", () => {
    const arrived = withArrivingCourse({ ...newScanSession(), mode: "manual" }, pebble);
    expect(arrived.mode).toBe("scan");
    expect(arrived.presetCourse).toEqual(pebble);
  });

  it("leaves a card already under way as it was", () => {
    const withPhoto = { ...newScanSession(), photo };
    const saved = { ...newScanSession(), savedRoundId: "round-1" };
    const typing = { ...newScanSession(), mode: "manual" as const, setup: { course: { id: "course-hmb", name: "Half Moon Bay" }, teeBox: "", date: "2026-10-15" } };
    for (const session of [withPhoto, saved, typing]) {
      expect(withArrivingCourse(session, pebble)).toBe(session);
    }
  });
});
