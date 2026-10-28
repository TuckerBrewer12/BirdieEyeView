import { describe, it, expect } from "vitest";
import { Round, type RoundDetail } from "@/domain";
import {
  halfMoonBayCourse,
  halfMoonBayRound as halfMoonBayDto,
  pebbleBeachCourse,
  scannedRound as scannedDto,
} from "@/testing/fixtures/roundDetails";
import {
  closedEditor,
  roundEditor,
  type OpenRoundEditor,
  type RoundEditAction,
} from "../roundEditorModel";

const halfMoonBayRound = Round.detailFromDto(halfMoonBayDto);
const scannedRound = Round.detailFromDto(scannedDto);

/** Starts editing `round`, then applies `actions` in order. */
function edit(round: RoundDetail, ...actions: RoundEditAction[]): OpenRoundEditor {
  const state = [{ type: "start", round } as RoundEditAction, ...actions].reduce(roundEditor, closedEditor);
  if (!state.editing) throw new Error("expected an open editor");
  return state;
}

const hole1 = halfMoonBayRound.holes.find((hole) => hole.hole === 1)!;

describe("roundEditor", () => {
  it("starts from the round's own scores, tee and course", () => {
    const editor = edit(halfMoonBayRound);
    expect(editor.holes[1]).toEqual({ strokes: hole1.strokes, putts: hole1.putts });
    expect(editor.teeBox).toBe(halfMoonBayRound.teeBox ?? "");
    expect(editor.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("starts an unlinked round on its played name", () => {
    expect(edit(scannedRound).course).toEqual({ status: "custom", name: "Scanned Scorecard" });
  });

  it("changes one hole's strokes and keeps its putts", () => {
    const editor = edit(halfMoonBayRound, { type: "setScore", hole: 1, field: "strokes", value: 3 });
    expect(editor.holes[1]).toEqual({ strokes: 3, putts: hole1.putts });
    expect(editor.holes[2]).toEqual(edit(halfMoonBayRound).holes[2]);
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
