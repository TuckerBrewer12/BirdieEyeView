import { describe, expect, it } from "vitest";
import { pebbleBeachSummary } from "@/testing/fixtures/courses";
import { SCANNED_COURSE_NAME, scannedCard } from "@/testing/fixtures/scan";
import { holeList, ringedBelow, scanFailure } from "../present";
import {
  reviewCourseFrom, reviewFromScan, reviewFromSetup, saveRequestFrom, todayIso,
  withHoleEdit,
} from "../scanModel";

const draft = reviewFromScan(scannedCard, "2026-10-15");

describe("saveRequestFrom", () => {
  it("keeps the card's name, and its scores, when no course is linked", () => {
    const sent = saveRequestFrom("user-1", draft);
    expect(sent.course_id).toBeUndefined();
    expect(sent.course_name).toBe(SCANNED_COURSE_NAME);
    expect(sent.hole_scores.map((score) => score.strokes)).toEqual(
      scannedCard.round.hole_scores.map((score) => score.strokes),
    );
  });

  it("sends the golfer's edits over what the scan read", () => {
    const edited = withHoleEdit(withHoleEdit(draft, 2, { strokes: 7 }), 2, { putts: 3, gir: false });
    const hole = saveRequestFrom("user-1", edited).hole_scores[1];
    expect(hole).toMatchObject({ hole_number: 2, strokes: 7, putts: 3, green_in_regulation: false });
  });

  it("links a provider's course by its provider id, under its name", () => {
    const picked = reviewCourseFrom({ ...pebbleBeachSummary, id: "external:9", source: "external", externalId: "ext-9" });
    if ("error" in picked) throw new Error(picked.error);
    const sent = saveRequestFrom("user-1", { ...draft, course: picked.course });
    expect(sent.course_id).toBeUndefined();
    expect(sent.external_course_id).toBe("ext-9");
    expect(sent.course_name).toBe(pebbleBeachSummary.name);
  });

  it("starts a blank card on a typed course name as named, not linked", () => {
    const blank = reviewFromSetup({ course: { id: null, name: "Muni Nine" }, teeBox: "", date: "2026-10-01" }, null);
    expect(blank.course).toEqual({ status: "named", name: "Muni Nine" });
    expect(saveRequestFrom("user-1", blank).course_name).toBe("Muni Nine");
  });
});

describe("todayIso", () => {
  it("is the golfer's day, not UTC's, in the evening", () => {
    // 20:00 on the 14th in Los Angeles (the unit tests' timezone) is already the 15th in UTC.
    expect(todayIso(new Date(2026, 5, 14, 20))).toBe("2026-06-14");
  });
});

describe("holeList", () => {
  it("reads one, two or more holes as a phrase", () => {
    expect(holeList([3])).toBe("hole 3");
    expect(holeList([3, 7])).toBe("holes 3 and 7");
    expect(holeList([3, 7, 12])).toBe("holes 3, 7 and 12");
  });
});

describe("ringedBelow", () => {
  it("words where the scores to check are as a sentence", () => {
    expect(ringedBelow([4])).toBe("Hole 4 is ringed below.");
    expect(ringedBelow([4, 11])).toBe("Holes 4 and 11 are ringed below.");
  });
});

describe("scanFailure", () => {
  it("doesn't say the title twice when the message opens with it", () => {
    expect(scanFailure("Couldn't read this card. Try a flatter, brighter photo.")).toEqual({
      title: "Couldn't read this card.",
      detail: "Try a flatter, brighter photo.",
    });
  });

  it("keeps the server's own reason whole under the title", () => {
    expect(scanFailure("No player row named Tucker.").detail).toBe("No player row named Tucker.");
  });
});
