import { describe, it, expect } from "vitest";
import { Round, type RoundDetail, type RoundEdits } from "@/domain";
import { halfMoonBayRound, pebbleBeachCourse, scannedRound } from "@/testing/fixtures/roundDetails";
import { updateRequestFrom } from "../roundsRepository";

const linked = Round.detailFromDto(halfMoonBayRound);
const unlinked = Round.detailFromDto(scannedRound);

/** The edits an editor opens with: every hole as it is, the round's tee and course. */
function untouched(round: RoundDetail): RoundEdits {
  return {
    holes: {},
    teeBox: round.teeBox ?? "",
    course: round.linkedCourse
      ? { status: "linked", course: round.linkedCourse }
      : round.playedName
        ? { status: "custom", name: round.playedName }
        : { status: "picking" },
  };
}

const savedHole = (request: ReturnType<typeof updateRequestFrom>, hole: number) =>
  request.body.hole_scores?.find((s) => s.hole_number === hole);

describe("updateRequestFrom", () => {
  it("an untouched round saves its own scores and links nothing", () => {
    const request = updateRequestFrom(linked, untouched(linked));
    expect(request.linkCourseId).toBeNull();
    expect(savedHole(request, 1)?.strokes).toBe(linked.holes[0].strokes);
    expect(request.body.tee_box).toBe(linked.teeBox);
    expect(request.body).not.toHaveProperty("course_name_played");
  });

  it("picking a new course links it and clears the played name", () => {
    const request = updateRequestFrom(unlinked, {
      ...untouched(unlinked),
      course: { status: "linked", course: pebbleBeachCourse },
    });
    expect(request.linkCourseId).toBe(pebbleBeachCourse.id);
    expect(request.body.course_name_played).toBeNull();
  });

  it("a custom name is written and links nothing", () => {
    const request = updateRequestFrom(unlinked, {
      ...untouched(unlinked),
      course: { status: "custom", name: "Torrey Pines" },
    });
    expect(request.linkCourseId).toBeNull();
    expect(request.body.course_name_played).toBe("Torrey Pines");
  });

  it("a GIR edit overrides the stored value only on that hole", () => {
    const request = updateRequestFrom(linked, { ...untouched(linked), holes: { 1: { gir: null } } });
    expect(savedHole(request, 1)?.green_in_regulation).toBeNull();
    expect(savedHole(request, 2)?.green_in_regulation).toBe(linked.holes[1].gir);
  });

  it("a cleared score or putt saves as cleared, not as what it was", () => {
    const request = updateRequestFrom(linked, {
      ...untouched(linked),
      holes: { 1: { strokes: null, putts: null }, 2: { strokes: 3 } },
    });
    expect(savedHole(request, 1)).toMatchObject({ strokes: null, putts: null });
    expect(savedHole(request, 2)).toMatchObject({ strokes: 3, putts: linked.holes[1].putts });
  });
});
