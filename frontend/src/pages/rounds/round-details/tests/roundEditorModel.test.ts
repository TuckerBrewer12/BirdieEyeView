import { describe, it, expect } from "vitest";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  scannedRound,
} from "@/testing/fixtures/roundDetails";
import type { Round } from "@/types/golf";
import {
  closedEditor,
  roundEditor,
  saveRequestFrom,
  type OpenRoundEditor,
  type RoundEditAction,
} from "../roundEditorModel";

/** Starts editing `round`, then applies `actions` in order. */
function edit(round: Round, ...actions: RoundEditAction[]): OpenRoundEditor {
  const state = [{ type: "start", round } as RoundEditAction, ...actions].reduce(roundEditor, closedEditor);
  if (!state.editing) throw new Error("expected an open editor");
  return state;
}

const hole1 = halfMoonBayRound.hole_scores.find((s) => s.hole_number === 1)!;

describe("roundEditor", () => {
  it("starts from the round's own scores, tee and course", () => {
    const editor = edit(halfMoonBayRound);
    expect(editor.scores[1]).toEqual({ strokes: hole1.strokes, putts: hole1.putts });
    expect(editor.teeBox).toBe(halfMoonBayRound.tee_box ?? "");
    expect(editor.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("starts an unlinked round on its played name", () => {
    expect(edit(scannedRound).course).toEqual({ status: "custom", name: "Scanned Scorecard" });
  });

  it("changes one hole's strokes and keeps its putts", () => {
    const editor = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: 3 });
    expect(editor.scores[1]).toEqual({ strokes: 3, putts: hole1.putts });
    expect(editor.scores[2]).toEqual(edit(halfMoonBayRound).scores[2]);
  });

  it("ignores edits while closed", () => {
    expect(roundEditor(closedEditor, { type: "setTeeBox", teeBox: "Blue" })).toBe(closedEditor);
  });

  it("stopping drops every edit", () => {
    const editor = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: 3 });
    expect(roundEditor(editor, { type: "stop" })).toEqual({ editing: false });
  });

  it("linking a course keeps a tee it also has", () => {
    const editor = edit(halfMoonBayRound, { type: "setTeeBox", teeBox: "White" }, { type: "linkCourse", course: halfMoonBayCourse });
    expect(editor.teeBox).toBe("White");
  });

  it("linking a course with one tee takes that tee", () => {
    const editor = edit(scannedRound, { type: "setTeeBox", teeBox: "" }, { type: "linkCourse", course: pebbleBeachCourse });
    expect(editor.teeBox).toBe("Blue");
  });

  it("linking a course with no tees leaves the tee alone", () => {
    const teeless = { ...pebbleBeachCourse, tees: [] };
    const editor = edit(scannedRound, { type: "setTeeBox", teeBox: "Red" }, { type: "linkCourse", course: teeless });
    expect(editor.teeBox).toBe("Red");
  });

  it("restoring the course undoes a pick", () => {
    const editor = edit(
      halfMoonBayRound,
      { type: "linkCourse", course: pebbleBeachCourse },
      { type: "restoreCourse", round: halfMoonBayRound },
    );
    expect(editor.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });
});

describe("saveRequestFrom", () => {
  it("an untouched round saves its own scores and links nothing", () => {
    const request = saveRequestFrom(halfMoonBayRound, edit(halfMoonBayRound));
    expect(request.linkCourseId).toBeNull();
    expect(request.body.hole_scores?.find((s) => s.hole_number === 1)?.strokes).toBe(hole1.strokes);
    expect(request.body).not.toHaveProperty("course_name_played");
  });

  it("picking a new course links it and clears the played name", () => {
    const request = saveRequestFrom(scannedRound, edit(scannedRound, { type: "linkCourse", course: pebbleBeachCourse }));
    expect(request.linkCourseId).toBe(pebbleBeachCourse.id);
    expect(request.body.course_name_played).toBeNull();
  });

  it("a custom name is written and links nothing", () => {
    const request = saveRequestFrom(scannedRound, edit(scannedRound, { type: "useCustomName", name: "Torrey Pines" }));
    expect(request.linkCourseId).toBeNull();
    expect(request.body.course_name_played).toBe("Torrey Pines");
  });

  it("a GIR edit overrides the stored value only on that hole", () => {
    const request = saveRequestFrom(halfMoonBayRound, edit(halfMoonBayRound, { type: "setGir", hole: 1, value: null }));
    const saved = request.body.hole_scores!;
    expect(saved.find((s) => s.hole_number === 1)?.green_in_regulation).toBeNull();
    expect(saved.find((s) => s.hole_number === 2)?.green_in_regulation).toBe(
      halfMoonBayRound.hole_scores.find((s) => s.hole_number === 2)?.green_in_regulation,
    );
  });
});
